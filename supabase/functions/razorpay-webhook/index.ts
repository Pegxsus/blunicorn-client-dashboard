import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-razorpay-signature',
};

interface WebhookPayload {
    event: string;
    payload: {
        payment: {
            entity: {
                id: string;
                order_id: string;
                status: string;
                amount: number;
                currency: string;
                email?: string;
                contact?: string;
                created_at: number;
            };
        };
    };
}

/**
 * Verify Razorpay webhook signature using Web Crypto API
 */
async function verifySignature(
    payload: string,
    signature: string,
    secret: string
): Promise<boolean> {
    try {
        const encoder = new TextEncoder();
        const key = await crypto.subtle.importKey(
            'raw',
            encoder.encode(secret),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
        );

        const signatureBuffer = await crypto.subtle.sign(
            'HMAC',
            key,
            encoder.encode(payload)
        );

        const hashArray = Array.from(new Uint8Array(signatureBuffer));
        const generatedSignature = hashArray
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');

        return generatedSignature === signature;
    } catch (error) {
        console.error('Signature verification error:', error);
        return false;
    }
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // 1. Get webhook signature from headers
        const signature = req.headers.get('x-razorpay-signature');

        if (!signature) {
            console.error('Missing webhook signature');
            return new Response(
                JSON.stringify({ error: 'Missing signature' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // 2. Get raw request body for signature verification
        const rawBody = await req.text();

        // 3. Verify webhook signature
        const webhookSecret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET');

        if (!webhookSecret) {
            console.error('Webhook secret not configured');
            return new Response(
                JSON.stringify({ error: 'Webhook not configured' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const isValid = await verifySignature(rawBody, signature, webhookSecret);

        if (!isValid) {
            console.error('Invalid webhook signature');
            return new Response(
                JSON.stringify({ error: 'Invalid signature' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // 4. Parse webhook payload
        const webhookData: WebhookPayload = JSON.parse(rawBody);

        console.log('Webhook event received:', webhookData.event);

        // 5. Handle payment.captured event
        if (webhookData.event === 'payment.captured') {
            const payment = webhookData.payload.payment.entity;
            const orderId = payment.order_id;
            const paymentId = payment.id;

            console.log('Processing payment:', { orderId, paymentId });

            // 6. Initialize Supabase client with service role key
            const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
            const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
            const supabase = createClient(supabaseUrl, supabaseKey);

            // 7. Find invoice by Razorpay order ID
            const { data: invoice, error: fetchError } = await supabase
                .from('invoices')
                .select('id, status, razorpay_payment_id')
                .eq('razorpay_order_id', orderId)
                .single();

            if (fetchError || !invoice) {
                console.error('Invoice not found for order:', orderId);
                // Still return 200 to prevent Razorpay retries
                return new Response(
                    JSON.stringify({ message: 'Invoice not found' }),
                    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }

            // 8. Check if already processed (idempotency)
            if (invoice.status === 'paid' && invoice.razorpay_payment_id) {
                console.log('Payment already processed for invoice:', invoice.id);
                return new Response(
                    JSON.stringify({ message: 'Payment already processed' }),
                    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }

            // 9. Update invoice to paid status
            const { error: updateError } = await supabase
                .from('invoices')
                .update({
                    status: 'paid',
                    razorpay_payment_id: paymentId,
                    paid_at: new Date().toISOString(),
                })
                .eq('id', invoice.id);

            if (updateError) {
                console.error('Failed to update invoice:', updateError);
                return new Response(
                    JSON.stringify({ error: 'Failed to update invoice' }),
                    { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }

            console.log('Invoice marked as paid:', invoice.id);

            // 10. Optional: Trigger post-payment actions
            // TODO: Add notification to client
            // TODO: Unlock deliverables
            // TODO: Update project status if needed

            return new Response(
                JSON.stringify({ message: 'Payment processed successfully' }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // 11. Handle other webhook events (if needed in future)
        console.log('Unhandled webhook event:', webhookData.event);

        return new Response(
            JSON.stringify({ message: 'Event received' }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('Error in razorpay-webhook:', error);
        return new Response(
            JSON.stringify({ error: (error as Error).message || 'Internal server error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});

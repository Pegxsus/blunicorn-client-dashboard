import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createRazorpayOrder, toSmallestUnit } from '../_shared/razorpay.ts';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateOrderRequest {
    invoice_id: string;
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // 1. Verify authentication
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: 'Missing authorization header' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // 2. Initialize Supabase client
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        // 3. Get authenticated user
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return new Response(
                JSON.stringify({ error: 'Invalid authentication token' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // 4. Parse request body
        const { invoice_id } = await req.json() as CreateOrderRequest;

        if (!invoice_id) {
            return new Response(
                JSON.stringify({ error: 'invoice_id is required' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // 5. Fetch invoice from database
        const { data: invoice, error: invoiceError } = await supabase
            .from('invoices')
            .select(`
        id,
        project_id,
        title,
        amount,
        currency,
        status,
        razorpay_order_id,
        projects!inner(client_id)
      `)
            .eq('id', invoice_id)
            .single();

        if (invoiceError || !invoice) {
            return new Response(
                JSON.stringify({ error: 'Invoice not found' }),
                { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // 6. Verify user has access to this invoice
        // User must be either the client or an admin
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        const isAdmin = profile?.role === 'admin';
        const isClient = invoice.projects.client_id === user.id;

        if (!isAdmin && !isClient) {
            return new Response(
                JSON.stringify({ error: 'Access denied to this invoice' }),
                { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // 7. Check if invoice is already paid
        if (invoice.status === 'paid') {
            return new Response(
                JSON.stringify({ error: 'Invoice is already paid' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // 8. If order already exists, return existing order
        if (invoice.razorpay_order_id) {
            return new Response(
                JSON.stringify({
                    order_id: invoice.razorpay_order_id,
                    amount: toSmallestUnit(invoice.amount, invoice.currency),
                    currency: invoice.currency,
                    message: 'Order already exists',
                }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // 9. Get Razorpay credentials from environment
        const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID');
        const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET');

        if (!razorpayKeyId || !razorpayKeySecret) {
            console.error('Missing Razorpay credentials');
            return new Response(
                JSON.stringify({ error: 'Payment gateway not configured' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // 10. Create Razorpay order
        const amountInSmallestUnit = toSmallestUnit(invoice.amount, invoice.currency);

        const order = await createRazorpayOrder(
            {
                amount: amountInSmallestUnit,
                currency: invoice.currency,
                receipt: `invoice_${invoice.id}`,
                notes: {
                    invoice_id: invoice.id,
                    project_id: invoice.project_id,
                    invoice_title: invoice.title,
                },
            },
            razorpayKeyId,
            razorpayKeySecret
        );

        // 11. Update invoice with Razorpay order ID
        const { error: updateError } = await supabase
            .from('invoices')
            .update({
                razorpay_order_id: order.id,
                status: 'pending', // Ensure status is pending
            })
            .eq('id', invoice_id);

        if (updateError) {
            console.error('Failed to update invoice:', updateError);
            return new Response(
                JSON.stringify({ error: 'Failed to update invoice' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // 12. Return order details to frontend
        return new Response(
            JSON.stringify({
                order_id: order.id,
                amount: order.amount,
                currency: order.currency,
                message: 'Order created successfully',
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('Error in create-razorpay-order:', error);
        return new Response(
            JSON.stringify({ error: error.message || 'Internal server error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as crypto from "https://deno.land/std@0.177.0/node/crypto.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VerifyRequest {
    order_id: string;
    payment_id: string;
    signature: string;
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { order_id, payment_id, signature } = await req.json() as VerifyRequest;

        if (!order_id || !payment_id || !signature) {
            return new Response(
                JSON.stringify({ error: 'Missing required parameters' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const razorpaySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
        if (!razorpaySecret) {
            return new Response(
                JSON.stringify({ error: 'Server configuration error' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Verify signature
        const generatedSignature = crypto
            .createHmac("sha256", razorpaySecret)
            .update(order_id + "|" + payment_id)
            .digest("hex");

        if (generatedSignature !== signature) {
            return new Response(
                JSON.stringify({ error: 'Invalid payment signature' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Initialize Supabase Admin Client
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Update Invoice Status
        const { data, error } = await supabase
            .from('invoices')
            .update({
                status: 'paid',
                razorpay_payment_id: payment_id,
                paid_at: new Date().toISOString()
            })
            .eq('razorpay_order_id', order_id)
            .select()
            .single();

        if (error) {
            console.error('Database update error:', error);
            return new Response(
                JSON.stringify({ error: 'Failed to update invoice status' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        return new Response(
            JSON.stringify({ success: true, invoice: data }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error: any) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});

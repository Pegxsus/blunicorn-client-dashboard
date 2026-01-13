import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateOrderRequest {
    invoice_id: string;
}

// Inline Razorpay utility functions
function toSmallestUnit(amount: number, currency: string): number {
    const zeroCurrencies = ['JPY', 'KRW'];
    if (zeroCurrencies.includes(currency.toUpperCase())) {
        return Math.round(amount);
    }
    return Math.round(amount * 100);
}

async function createRazorpayOrder(
    params: { amount: number; currency: string; receipt: string; notes?: Record<string, string> },
    keyId: string,
    keySecret: string
) {
    const auth = btoa(`${keyId}:${keySecret}`);

    const response = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`Razorpay API error: ${error.error?.description || 'Unknown error'}`);
    }

    return await response.json();
}

serve(async (req) => {
    console.log("Step 0: Request received", { method: req.method, url: req.url });

    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // 1. Verify authentication
        console.log("Step 1: Checking auth header");
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            console.error("Auth header missing");
            return new Response(
                JSON.stringify({ error: 'Missing authorization header' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // 2. Initialize Supabase client
        console.log("Step 2: Initializing Supabase client");
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        // 3. Get authenticated user
        console.log("Step 3: Getting user from token");
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            console.error("Auth error or user missing", authError);
            return new Response(
                JSON.stringify({ error: 'Invalid authentication token', details: authError }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // 4. Parse request body
        console.log("Step 4: Parsing JSON body");
        const body = await req.json().catch(e => {
            console.error("Body parse error", e);
            return {};
        }) as CreateOrderRequest;
        const { invoice_id } = body;

        if (!invoice_id) {
            console.error("invoice_id missing in body");
            return new Response(
                JSON.stringify({ error: 'invoice_id is required' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // 5. Fetch invoice from database
        console.log("Step 5: Fetching invoice", { invoice_id });
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
                projects(client_id)
            `)
            .eq('id', invoice_id)
            .maybeSingle();

        if (invoiceError || !invoice) {
            console.error("Invoice fetch error or not found", invoiceError);
            return new Response(
                JSON.stringify({ error: 'Invoice not found or database error', details: invoiceError }),
                { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // 6. Verify user has access to this invoice
        console.log("Step 6: Verifying access roles");
        const { data: userRole } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .eq('role', 'admin')
            .maybeSingle();

        const isAdmin = !!userRole;
        // Handle potential array or object for projects join
        const projectData = Array.isArray(invoice.projects) ? invoice.projects[0] : invoice.projects;
        const isClient = projectData?.client_id === user.id;

        console.log("Access results:", { isAdmin, isClient, userId: user.id });

        if (!isAdmin && !isClient) {
            console.error("Access denied for user", user.id);
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
            console.log("Order exists, returning order_id:", invoice.razorpay_order_id);
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
        console.log("Step 9: Fetching Razorpay secrets");
        const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID');
        const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET');

        if (!razorpayKeyId || !razorpayKeySecret) {
            console.error('Missing Razorpay credentials in Deno.env');
            return new Response(
                JSON.stringify({ error: 'Payment gateway secrets missing in Supabase' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // 10. Create Razorpay order
        console.log("Step 10: Calling Razorpay API");
        const amountInSmallestUnit = toSmallestUnit(invoice.amount, invoice.currency);
        const order = await createRazorpayOrder(
            {
                amount: amountInSmallestUnit,
                currency: invoice.currency,
                receipt: `inv_${invoice.id.slice(-8)}`,
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
        console.log("Step 11: Updating invoice record");
        const { error: updateError } = await supabase
            .from('invoices')
            .update({
                razorpay_order_id: order.id,
                status: 'pending',
            })
            .eq('id', invoice_id);

        if (updateError) {
            console.error('DB update error:', updateError);
            return new Response(
                JSON.stringify({ error: 'Failed to save order_id to DB', details: updateError }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        console.log("Step 12: Success returning order");
        return new Response(
            JSON.stringify({
                order_id: order.id,
                amount: order.amount,
                currency: order.currency,
                message: 'Order created successfully',
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error: any) {
        console.error('CRITICAL ERROR:', error);
        return new Response(
            JSON.stringify({
                error: 'Internal Server Error (Crash)',
                message: error.message,
                stack: error.stack,
                details: error.toString()
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});

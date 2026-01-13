# Razorpay Integration - Deployment Guide

## Prerequisites

Before deploying, you need to set up your Razorpay account and obtain API credentials.

## Step 1: Get Razorpay API Credentials

1. **Sign up/Login** to Razorpay Dashboard: https://dashboard.razorpay.com
2. **Navigate to Settings → API Keys**
3. **Generate Keys** (if not already generated)
   - You'll get:
     - **Key ID** (starts with `rzp_test_` or `rzp_live_`)
     - **Key Secret** (keep this secret!)

## Step 2: Configure Environment Variables

### Frontend (.env file)

Update your `.env` file with the Razorpay Key ID:

```env
VITE_RAZORPAY_KEY_ID=rzp_test_YOUR_KEY_ID_HERE
```

**Note**: Use `rzp_test_` for testing, `rzp_live_` for production.

### Backend (Supabase Edge Function Secrets)

Set the following secrets using Supabase CLI:

```bash
# Navigate to your project directory
cd c:\Users\Dell\blunicorn-client-dashboard

# Set Razorpay Key Secret
supabase secrets set RAZORPAY_KEY_SECRET=YOUR_SECRET_KEY_HERE

# Set Razorpay Webhook Secret (generate this in next step)
supabase secrets set RAZORPAY_WEBHOOK_SECRET=YOUR_WEBHOOK_SECRET_HERE
```

## Step 3: Deploy Database Migration

Apply the database migration to add Razorpay fields:

```bash
# Push migration to Supabase
supabase db push
```

This will:
- Add `razorpay_order_id`, `razorpay_payment_id`, `paid_at` columns
- Update status enum to include 'draft'
- Remove `payment_link` column
- Add indexes for performance

## Step 4: Deploy Edge Functions

Deploy the two Edge Functions:

```bash
# Deploy create-razorpay-order function
supabase functions deploy create-razorpay-order

# Deploy razorpay-webhook function
supabase functions deploy razorpay-webhook
```

Verify deployment:

```bash
supabase functions list
```

You should see both functions listed.

## Step 5: Configure Razorpay Webhook

1. **Go to Razorpay Dashboard → Settings → Webhooks**
2. **Click "Add New Webhook"**
3. **Configure webhook**:
   - **Webhook URL**: `https://<your-supabase-project-ref>.supabase.co/functions/v1/razorpay-webhook`
     - Replace `<your-supabase-project-ref>` with your actual Supabase project reference
     - Example: `https://alwznmjegccxzpfvyoln.supabase.co/functions/v1/razorpay-webhook`
   - **Active Events**: Select `payment.captured`
   - **Alert Email**: Your email address
4. **Save webhook**
5. **Copy the Webhook Secret** (shown after creation)
6. **Update Edge Function secret**:
   ```bash
   supabase secrets set RAZORPAY_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET
   ```

## Step 6: Test the Integration

### Test in Development Mode

1. **Use Razorpay Test Mode**:
   - Ensure you're using test API keys (`rzp_test_...`)
   
2. **Create a test invoice**:
   - Login as admin
   - Navigate to a project → Billing tab
   - Click "Create Invoice"
   - Fill in details (e.g., ₹100 INR)
   - Click "Create Invoice"

3. **Make a test payment**:
   - Click "Pay Now" button
   - Razorpay Checkout modal should open
   - Use test card: `4111 1111 1111 1111`
   - CVV: any 3 digits
   - Expiry: any future date
   - Complete payment

4. **Verify webhook processing**:
   - Check Edge Function logs:
     ```bash
     supabase functions logs razorpay-webhook
     ```
   - Invoice status should update to "paid"
   - `paid_at` timestamp should be set

## Step 7: Go Live

When ready for production:

1. **Switch to Live Mode** in Razorpay Dashboard
2. **Generate Live API Keys**
3. **Update environment variables**:
   ```env
   VITE_RAZORPAY_KEY_ID=rzp_live_YOUR_LIVE_KEY_ID
   ```
   ```bash
   supabase secrets set RAZORPAY_KEY_SECRET=YOUR_LIVE_SECRET_KEY
   ```
4. **Update webhook URL** to use live mode endpoint
5. **Test with real payment** (small amount first!)

## Troubleshooting

### Payment not confirming
- Check webhook logs: `supabase functions logs razorpay-webhook`
- Verify webhook secret is correct
- Check Razorpay Dashboard → Webhooks → Logs

### "Payment gateway not configured" error
- Ensure `VITE_RAZORPAY_KEY_ID` is set in `.env`
- Restart dev server after updating `.env`

### Webhook signature verification fails
- Verify `RAZORPAY_WEBHOOK_SECRET` matches Razorpay Dashboard
- Check webhook URL is correct

### Invoice not updating after payment
- Check Edge Function logs for errors
- Verify database permissions (RLS policies)
- Ensure `razorpay_order_id` is stored correctly

## Security Checklist

- ✅ Never commit `.env` file with real API keys
- ✅ Use test keys for development
- ✅ Webhook signature verification is enabled
- ✅ Edge Functions use service role key (not exposed to frontend)
- ✅ Payment confirmation only from webhook (not frontend callback)

## Support

For issues:
- **Razorpay Docs**: https://razorpay.com/docs/
- **Supabase Edge Functions**: https://supabase.com/docs/guides/functions
- **Webhook Testing**: Use Razorpay Dashboard → Webhooks → Test Webhook

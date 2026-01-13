# Razorpay Edge Function Secrets Setup

Since Supabase CLI is not installed locally, you'll need to set the Edge Function secrets via the Supabase Dashboard or install the CLI.

## Option 1: Using Supabase Dashboard (Recommended)

1. **Go to your Supabase Dashboard**: https://supabase.com/dashboard/project/alwznmjegccxzpfvyoln

2. **Navigate to Edge Functions**:
   - Click on "Edge Functions" in the left sidebar
   - Click on "Manage secrets" or "Secrets" tab

3. **Add the following secrets**:

   **Secret Name**: `RAZORPAY_KEY_ID`
   **Value**: `rzp_test_S3LRCccxZa0cHA`

   **Secret Name**: `RAZORPAY_KEY_SECRET`
   **Value**: `Btvj4WGVMvZsTDr11c107XDp`

   **Secret Name**: `RAZORPAY_WEBHOOK_SECRET`
   **Value**: (You'll get this after setting up webhook in Razorpay Dashboard - see step 4)

4. **Save the secrets**

## Option 2: Install Supabase CLI (Alternative)

If you want to use the CLI:

```powershell
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref alwznmjegccxzpfvyoln

# Set secrets
supabase secrets set RAZORPAY_KEY_ID=rzp_test_S3LRCccxZa0cHA
supabase secrets set RAZORPAY_KEY_SECRET=Btvj4WGVMvZsTDr11c107XDp
```

## Next Steps

After setting the secrets:

1. **Deploy the database migration**:
   - Go to Supabase Dashboard → Database → Migrations
   - Upload or run the migration file: `20260113100000_razorpay_integration.sql`

2. **Deploy Edge Functions**:
   - Go to Supabase Dashboard → Edge Functions
   - Deploy `create-razorpay-order` function
   - Deploy `razorpay-webhook` function

3. **Configure Razorpay Webhook**:
   - Go to Razorpay Dashboard → Settings → Webhooks
   - Add webhook URL: `https://alwznmjegccxzpfvyoln.supabase.co/functions/v1/razorpay-webhook`
   - Select event: `payment.captured`
   - Copy the webhook secret and add it to Supabase secrets

4. **Test the integration**:
   - Restart your dev server (the .env was updated)
   - Create a test invoice
   - Click "Pay Now" and use test card: `4111 1111 1111 1111`

## Current Status

✅ Frontend configured with Razorpay Key ID
⏳ Edge Function secrets need to be set (use Dashboard)
⏳ Database migration needs to be deployed
⏳ Edge Functions need to be deployed
⏳ Webhook needs to be configured in Razorpay Dashboard

-- Add Razorpay integration fields to invoices table
-- This migration adds support for Razorpay Orders API integration

-- Add new columns for Razorpay integration
ALTER TABLE public.invoices 
ADD COLUMN razorpay_order_id TEXT,
ADD COLUMN razorpay_payment_id TEXT,
ADD COLUMN paid_at TIMESTAMP WITH TIME ZONE;

-- Update status check constraint to include 'draft' status
ALTER TABLE public.invoices 
DROP CONSTRAINT IF EXISTS invoices_status_check;

ALTER TABLE public.invoices 
ADD CONSTRAINT invoices_status_check 
CHECK (status IN ('draft', 'pending', 'paid', 'overdue', 'cancelled'));

-- Drop payment_link column (replaced by Razorpay integration)
ALTER TABLE public.invoices 
DROP COLUMN IF EXISTS payment_link;

-- Add index on razorpay_order_id for faster webhook lookups
CREATE INDEX IF NOT EXISTS idx_invoices_razorpay_order_id 
ON public.invoices(razorpay_order_id);

-- Add index on razorpay_payment_id for payment tracking
CREATE INDEX IF NOT EXISTS idx_invoices_razorpay_payment_id 
ON public.invoices(razorpay_payment_id);

-- Add comment for documentation
COMMENT ON COLUMN public.invoices.razorpay_order_id IS 'Razorpay Order ID created via Orders API';
COMMENT ON COLUMN public.invoices.razorpay_payment_id IS 'Razorpay Payment ID after successful payment capture';
COMMENT ON COLUMN public.invoices.paid_at IS 'Timestamp when payment was confirmed via webhook';

-- Add currency column to invoices
ALTER TABLE public.invoices 
ADD COLUMN currency TEXT NOT NULL DEFAULT 'USD';

-- Update existing check constraint if desired, or just trust app logic for now.
-- Ideally we might want a check constraint for supported currencies, but keeping it flexible is fine.

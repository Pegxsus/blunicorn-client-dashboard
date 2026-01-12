-- Allow all authenticated users to view profiles (needed for chat/feedback)
-- We use CREATE POLICY IF NOT EXISTS logic by just creating it, or dropping if conflicting? 
-- Postgres doesn't have CREATE POLICY IF NOT EXISTS locally usually, so we'll just create it.
-- RLS policies are additive (OR).

CREATE POLICY "Allow all authenticated to view profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

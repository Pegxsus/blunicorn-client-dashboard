-- Trigger to automatically confirm new users
-- This bypasses email verification for all new signups
CREATE OR REPLACE FUNCTION public.auto_confirm_new_users()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
BEGIN
  -- Automatically confirm the email
  NEW.email_confirmed_at = now();
  -- Set confirmed_at for older schemas if needed, though email_confirmed_at is standard
  -- NEW.confirmed_at = now(); 
  RETURN NEW;
END;
$$;

-- Bind the trigger to auth.users
-- We drop it first to ensure idempotency
DROP TRIGGER IF EXISTS on_auth_user_created_auto_confirm ON auth.users;

CREATE TRIGGER on_auth_user_created_auto_confirm
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_confirm_new_users();

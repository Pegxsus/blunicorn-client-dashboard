-- 1. Restrict Signups (Block Public Registration)
-- Only allow INSERTs if 'created_by_admin' metadata is present
CREATE OR REPLACE FUNCTION public.restrict_public_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
BEGIN
  -- Check if the new user has the 'created_by_admin' flag
  -- We implicitly trust INSERTs that come with this flag because
  -- only Admins (via the dashboard) add this metadata during creation.
  IF NEW.raw_user_meta_data->>'created_by_admin' = 'true' THEN
    RETURN NEW;
  END IF;

  -- Block everything else (including Google Logins for NEW users)
  RAISE EXCEPTION 'Public registration is disabled. Only the Administrator can create accounts.';
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_restrict ON auth.users;

CREATE TRIGGER on_auth_user_created_restrict
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.restrict_public_signup();


-- 2. Protect Super Admin from Deletion
CREATE OR REPLACE FUNCTION public.protect_super_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
BEGIN
  -- Prevent deletion of specific email
  IF OLD.email = 'pav200113@gmail.com' THEN
    RAISE EXCEPTION 'CRITICAL: Cannot delete Super Admin account (pav200113@gmail.com).';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_deleted_protect ON auth.users;

CREATE TRIGGER on_auth_user_deleted_protect
  BEFORE DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_super_admin();

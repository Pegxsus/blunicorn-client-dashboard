-- Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

--------------------------------------------------------------------------------
-- 0. FIX FOREIGN KEY CONSTRAINT
-- Add ON DELETE CASCADE to project_feedback.author_id
--------------------------------------------------------------------------------
DO $$
BEGIN
  -- Drop the existing constraint if it exists (using the name from the error)
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'project_feedback_author_id_fkey'
  ) THEN
    ALTER TABLE public.project_feedback DROP CONSTRAINT project_feedback_author_id_fkey;
  END IF;

  -- Re-add the constraint with ON DELETE CASCADE
  ALTER TABLE public.project_feedback 
  ADD CONSTRAINT project_feedback_author_id_fkey 
  FOREIGN KEY (author_id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;
END $$;


--------------------------------------------------------------------------------
-- 1. Function to UPDATE PASSWORD
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_update_user_password(target_user_id UUID, new_password TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
BEGIN
  -- Check if executing user is an admin
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied. Only admins can update passwords.';
  END IF;

  -- Update the password in auth.users table
  UPDATE auth.users
  SET encrypted_password = crypt(new_password, gen_salt('bf'))
  WHERE id = target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found.';
  END IF;
END;
$$;

--------------------------------------------------------------------------------
-- 2. Function to DELETE USER (and all related data via cascade)
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_delete_user(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
BEGIN
  -- Check if executing user is an admin
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied. Only admins can delete users.';
  END IF;

  -- Delete from auth.users
  -- This will CASCADE to profiles, user_roles, and projects automatically
  -- Now that we fixed project_feedback, it will cascade there too.
  DELETE FROM auth.users
  WHERE id = target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found.';
  END IF;
END;
$$;

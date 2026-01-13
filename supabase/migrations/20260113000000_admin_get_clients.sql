--------------------------------------------------------------------------------
-- Function to GET CLIENTS with last_sign_in_at
-- This requires access to auth.users, so it must be SECURITY DEFINER
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_get_clients()
RETURNS TABLE (
  id UUID,
  email TEXT,
  display_name TEXT,
  last_sign_in_at TIMESTAMP WITH TIME ZONE
)
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
    RAISE EXCEPTION 'Access denied. Only admins can view client list.';
  END IF;

  RETURN QUERY
  SELECT
    au.id,
    au.email::text,
    COALESCE(p.display_name, au.email)::text as display_name,
    au.last_sign_in_at
  FROM auth.users au
  JOIN public.user_roles ur ON au.id = ur.user_id
  LEFT JOIN public.profiles p ON au.id = p.user_id
  WHERE ur.role IN ('client', 'admin')
  ORDER BY au.created_at DESC;
END;
$$;

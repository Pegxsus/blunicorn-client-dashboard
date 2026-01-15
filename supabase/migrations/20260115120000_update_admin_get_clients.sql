DROP FUNCTION IF EXISTS public.admin_get_clients();

CREATE OR REPLACE FUNCTION public.admin_get_clients()
RETURNS TABLE (
  id UUID,
  email TEXT,
  display_name TEXT,
  last_sign_in_at TIMESTAMP WITH TIME ZONE,
  last_sign_in_ip TEXT
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
    au.last_sign_in_at,
    (
      SELECT ip::text 
      FROM auth.sessions 
      WHERE user_id = au.id 
      ORDER BY created_at DESC 
      LIMIT 1
    ) as last_sign_in_ip
  FROM auth.users au
  JOIN public.user_roles ur ON au.id = ur.user_id
  LEFT JOIN public.profiles p ON au.id = p.user_id
  WHERE ur.role IN ('client', 'admin')
  ORDER BY au.created_at DESC;
END;
$$;

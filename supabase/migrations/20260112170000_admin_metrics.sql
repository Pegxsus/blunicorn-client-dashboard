-- Create a function to get system usage metrics securely
CREATE OR REPLACE FUNCTION public.get_system_metrics()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  client_count integer;
  project_count integer;
  storage_bytes bigint;
BEGIN
  -- Check if user is admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Count Clients
  SELECT count(*) INTO client_count
  FROM public.user_roles
  WHERE role = 'client';

  -- Count Projects
  SELECT count(*) INTO project_count
  FROM public.projects;

  -- Sum Storage Size
  -- storage.objects is in the storage schema
  SELECT COALESCE(SUM((metadata->>'size')::bigint), 0) INTO storage_bytes
  FROM storage.objects;

  RETURN json_build_object(
    'clients', client_count,
    'projects', project_count,
    'storage_bytes', storage_bytes
  );
END;
$$;

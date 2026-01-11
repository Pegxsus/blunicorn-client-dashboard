-- Backfill missing user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'client'
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.user_roles);

-- Backfill missing profiles
INSERT INTO public.profiles (user_id, email, display_name)
SELECT 
  id, 
  email, 
  COALESCE(raw_user_meta_data->>'display_name', raw_user_meta_data->>'full_name', split_part(email, '@', 1))
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.profiles);

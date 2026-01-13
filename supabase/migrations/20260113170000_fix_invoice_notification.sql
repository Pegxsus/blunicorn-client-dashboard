-- Fix invoice notification trigger to match actual notifications table schema
-- The notifications table only has: id, user_id, title, message, read, project_id, created_at
-- It does NOT have 'type' or 'link' columns

-- Drop and recreate the function with correct schema
CREATE OR REPLACE FUNCTION public.notify_on_new_invoice()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_user_id UUID;
  project_title TEXT;
BEGIN
  -- Get project details
  SELECT client_id, title INTO target_user_id, project_title
  FROM public.projects
  WHERE id = NEW.project_id;

  -- Insert notification (only using columns that exist)
  INSERT INTO public.notifications (user_id, project_id, title, message)
  VALUES (
    target_user_id, 
    NEW.project_id, 
    'New Invoice Generated', 
    format('A new invoice "%s" for %s %s has been generated for project "%s".', 
           NEW.title, 
           NEW.currency, 
           NEW.amount, 
           project_title)
  );

  RETURN NEW;
END;
$$;

-- Trigger already exists from previous migration, no need to recreate

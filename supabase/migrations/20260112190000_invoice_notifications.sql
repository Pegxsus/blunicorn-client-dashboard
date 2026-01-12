-- Function to notify client on new invoice
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

  -- Insert notification
  INSERT INTO public.notifications (user_id, project_id, title, message, type, link)
  VALUES (
    target_user_id, 
    NEW.project_id, 
    'New Invoice Generated', 
    format('A new invoice "%s" for %s%s has been generated for project "%s".', NEW.title, NEW.currency, NEW.amount, project_title),
    'billing',
    '/projects/' || NEW.project_id
  );

  RETURN NEW;
END;
$$;

-- Trigger
DROP TRIGGER IF EXISTS on_new_invoice ON public.invoices;
CREATE TRIGGER on_new_invoice
  AFTER INSERT ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_new_invoice();

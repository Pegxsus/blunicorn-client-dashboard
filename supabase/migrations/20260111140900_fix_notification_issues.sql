-- Fix notification issues

-- 1. Add DELETE policy so users can delete their own notifications
CREATE POLICY "Users can delete their own notifications"
ON public.notifications FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 2. Fix the notification trigger to also notify admins when clients send feedback
CREATE OR REPLACE FUNCTION public.handle_new_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id UUID;
  notification_title TEXT;
  notification_message TEXT;
  project_title TEXT;
  admin_record RECORD;
BEGIN
  -- 1. Project Status/Progress Updates
  IF TG_TABLE_NAME = 'projects' THEN
    -- Only notify on specific changes
    IF OLD.status IS DISTINCT FROM NEW.status OR OLD.progress IS DISTINCT FROM NEW.progress THEN
      
      -- Get project title
      project_title := NEW.title;
      target_user_id := NEW.client_id;
      
      IF OLD.status IS DISTINCT FROM NEW.status THEN
        notification_title := 'Project Status Updated';
        notification_message := format('Project "%s" is now %s', project_title, NEW.status);
      ELSIF OLD.progress IS DISTINCT FROM NEW.progress THEN
         notification_title := 'Project Progress Updated';
        notification_message := format('Project "%s" is now %s%% complete', project_title, NEW.progress);
      END IF;

      -- Insert notification
      INSERT INTO public.notifications (user_id, project_id, title, message)
      VALUES (target_user_id, NEW.id, notification_title, notification_message);
    END IF;
    
    RETURN NEW;
  
  -- 2. New Feedback Messages
  ELSIF TG_TABLE_NAME = 'project_feedback' THEN
    -- Get project details
    SELECT title, client_id INTO project_title, target_user_id
    FROM public.projects
    WHERE id = NEW.project_id;

    -- Determine who gets the notification
    IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = NEW.author_id AND role = 'admin') THEN
      -- Admin wrote message -> Notify Client
       INSERT INTO public.notifications (user_id, project_id, title, message)
       VALUES (target_user_id, NEW.project_id, 'New Feedback', format('New feedback on "%s"', project_title));
    ELSE
       -- Client wrote message -> Notify ALL Admins
       FOR admin_record IN 
         SELECT user_id FROM public.user_roles WHERE role = 'admin'
       LOOP
         INSERT INTO public.notifications (user_id, project_id, title, message)
         VALUES (admin_record.user_id, NEW.project_id, 'New Feedback', format('New feedback on "%s"', project_title));
       END LOOP;
    END IF;

    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$;

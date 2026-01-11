-- Create project_feedback table
CREATE TABLE IF NOT EXISTS public.project_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id),
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.project_feedback ENABLE ROW LEVEL SECURITY;

-- Policies for project_feedback
CREATE POLICY "Users can view feedback for their projects"
ON public.project_feedback FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = project_feedback.project_id
    AND (projects.client_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  )
);

CREATE POLICY "Users can insert feedback for their projects"
ON public.project_feedback FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = project_feedback.project_id
    AND (projects.client_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  )
);

-- Function to handle automatic notifications
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
    -- If author is client -> Notify all Admins (simplified to just creating one notif for now or skipping admin notifs if logic differs)
    -- If author is admin -> Notify Client
    
    IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = NEW.author_id AND role = 'admin') THEN
      -- Admin wrote message -> Notify Client
       INSERT INTO public.notifications (user_id, project_id, title, message)
       VALUES (target_user_id, NEW.project_id, 'New Feedback', format('New feedback on "%s"', project_title));
    ELSE
       -- Client wrote message -> Notify Admin (This requires looping through admins or a shared admin notification system. 
       -- For now, we will SKIP notifying admins via this table to avoid complexity or excessive rows, 
       -- assuming Admins monitor the dashboard differently. Or we can notify the specific admin if we tracked 'assigned_admin')
       -- Let's just notify the client ID if they didn't write it (which they didn't if they are the target)
       -- Actually, simpler: Notify the other party.
       
       -- But for this MVP: we only strictly care about the CLIENT getting notified as per user request.
       NULL;
    END IF;

    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$;

-- Trigger: On Project Update
DROP TRIGGER IF EXISTS on_project_update ON public.projects;
CREATE TRIGGER on_project_update
  AFTER UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_notification();

-- Trigger: On New Feedback
DROP TRIGGER IF EXISTS on_new_feedback ON public.project_feedback;
CREATE TRIGGER on_new_feedback
  AFTER INSERT ON public.project_feedback
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_notification();

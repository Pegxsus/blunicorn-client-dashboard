-- Add DELETE policy for project_feedback table
-- This allows admins to delete feedback messages

CREATE POLICY "Admins can delete any feedback"
ON public.project_feedback FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
);

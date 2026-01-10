-- Add missing fields to projects table
ALTER TABLE public.projects 
ADD COLUMN estimated_delivery TIMESTAMP WITH TIME ZONE,
ADD COLUMN milestones JSONB DEFAULT '[]'::jsonb,
ADD COLUMN deliverables JSONB DEFAULT '[]'::jsonb,
ADD COLUMN feedback JSONB DEFAULT '[]'::jsonb,
ADD COLUMN revision_count INTEGER DEFAULT 0;

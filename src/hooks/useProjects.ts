import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Project, ProjectStatus, Milestone, Deliverable, Feedback } from "@/types";

export const useProjects = () => {
    return useQuery({
        queryKey: ['projects'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('projects')
                .select('*, profiles:client_id(display_name)')
                .order('created_at', { ascending: false });

            if (error) throw error;

            return data.map(p => ({
                id: p.id,
                name: p.title,
                description: p.description || '',
                status: p.status as ProjectStatus,
                progress: p.progress,
                estimatedDelivery: p.estimated_delivery || '',
                clientId: p.client_id,
                clientName: p.profiles?.display_name || 'Unknown',
                milestones: (p.milestones as unknown as Milestone[]) || [],
                deliverables: (p.deliverables as unknown as Deliverable[]) || [],
                feedback: (p.feedback as unknown as Feedback[]) || [],
                createdAt: p.created_at,
                updatedAt: p.updated_at,
                revisionCount: p.revision_count
            })) as Project[];
        },
    });
};

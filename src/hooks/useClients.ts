import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Client {
    id: string;
    email: string;
    displayName: string;
}

export const useClients = () => {
    return useQuery({
        queryKey: ['clients'],
        queryFn: async () => {
            // First get user IDs that have the 'client' or 'admin' role
            // This allows admins to create projects for themselves during testing
            const { data: roleData, error: roleError } = await supabase
                .from('user_roles')
                .select('user_id')
                .in('role', ['client', 'admin']);

            if (roleError) throw roleError;

            const clientIds = roleData.map(r => r.user_id);

            if (clientIds.length === 0) return [];

            // Then fetch profile details for those IDs
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('user_id, email, display_name')
                .in('user_id', clientIds);

            if (profileError) throw profileError;

            return profileData.map(p => ({
                id: p.user_id,
                email: p.email,
                displayName: p.display_name || p.email
            })) as Client[];
        },
    });
};

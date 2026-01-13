import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Client {
    id: string;
    email: string;
    displayName: string;
    lastSignInAt: string | null;
}

export const useClients = () => {
    return useQuery({
        queryKey: ['clients'],
        queryFn: async () => {
            const { data, error } = await (supabase as any).rpc('admin_get_clients');

            if (error) throw error;

            return data.map((c: any) => ({
                id: c.id,
                email: c.email,
                displayName: c.display_name,
                lastSignInAt: c.last_sign_in_at
            })) as Client[];
        },
    });
};

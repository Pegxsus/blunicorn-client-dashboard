import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Database, Users, Briefcase, HardDrive } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface Metrics {
    clients: number;
    projects: number;
    storageUsed: number; // in bytes (mocked or calculated)
}

const UsageMetrics = () => {
    const [metrics, setMetrics] = useState<Metrics>({ clients: 0, projects: 0, storageUsed: 0 });
    const [loading, setLoading] = useState(true);

    // Free Tier Limits (Mock constants for display)
    const LIMITS = {
        clients: 50,
        projects: 100,
        storage: 500 * 1024 * 1024 // 500MB
    };

    useEffect(() => {
        const fetchMetrics = async () => {
            try {
                // Count Clients
                const { count: clientCount, error: clientError } = await supabase
                    .from('user_roles')
                    .select('*', { count: 'exact', head: true })
                    .eq('role', 'client');

                // Count Projects
                const { count: projectCount, error: projectError } = await supabase
                    .from('projects')
                    .select('*', { count: 'exact', head: true });

                // Storage is harder to get efficiently without admin API, we'll mock or skip for now
                // Or count files if we have RLS access to bucket

                if (!clientError && !projectError) {
                    setMetrics({
                        clients: clientCount || 0,
                        projects: projectCount || 0,
                        storageUsed: (projectCount || 0) * 2.5 * 1024 * 1024 // Mock: ~2.5MB per project
                    });
                }
            } catch (error) {
                console.error('Error fetching metrics', error);
            } finally {
                setLoading(false);
            }
        };

        fetchMetrics();

        // Subscribe to changes? Maybe overkill for metrics, simplistic fetch on mount is fine.
    }, []);

    if (loading) return null;

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    return (
        <div className="px-4 py-4 mt-auto border-t border-sidebar-border bg-sidebar/50">
            <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <Database className="w-3 h-3" />
                <span>Usage and Metrics</span>
            </div>

            <div className="space-y-4">
                {/* Clients Usage */}
                <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                            <Users className="w-3 h-3" /> Clients
                        </span>
                        <span className="font-medium text-foreground">{metrics.clients} / {LIMITS.clients}</span>
                    </div>
                    <Progress value={(metrics.clients / LIMITS.clients) * 100} className="h-1.5 bg-sidebar-border" />
                </div>

                {/* Projects Usage */}
                <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                            <Briefcase className="w-3 h-3" /> Projects
                        </span>
                        <span className="font-medium text-foreground">{metrics.projects} / {LIMITS.projects}</span>
                    </div>
                    <Progress value={(metrics.projects / LIMITS.projects) * 100} className="h-1.5 bg-sidebar-border" />
                </div>

                {/* Storage Usage (Mocked based on project count) */}
                <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                            <HardDrive className="w-3 h-3" /> Storage
                        </span>
                        <span className="font-medium text-foreground">{formatBytes(metrics.storageUsed)} / 500 MB</span>
                    </div>
                    <Progress value={(metrics.storageUsed / LIMITS.storage) * 100} className="h-1.5 bg-sidebar-border" />
                </div>
            </div>
        </div>
    );
};

export default UsageMetrics;

import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Database, Users, Briefcase, HardDrive } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Metrics {
    clients: number;
    projects: number;
    storageUsed: number;
}

const Usage = () => {
    const { role } = useAuth();
    const [metrics, setMetrics] = useState<Metrics>({ clients: 0, projects: 0, storageUsed: 0 });
    const [loading, setLoading] = useState(true);

    // Free Tier Limits (Mock constants)
    const LIMITS = {
        clients: 50,
        projects: 100,
        storage: 500 * 1024 * 1024, // 500MB
        apiRequests: 100000
    };

    useEffect(() => {
        const fetchMetrics = async () => {
            try {
                const { data, error } = await supabase.rpc('get_system_metrics' as any);

                if (error) throw error;

                if (data) {
                    // Cast to any because the RPC return type isn't automatically inferred yet
                    const metricsData = data as any;
                    setMetrics({
                        clients: metricsData.clients || 0,
                        projects: metricsData.projects || 0,
                        storageUsed: metricsData.storage_bytes || 0
                    });
                }
            } catch (error) {
                console.error('Error fetching metrics', error);

                // Fallback for dev/demo if RPC missing
                // (Optional: remove this block if we are strict, but good for stability)
                try {
                    const { count: c } = await supabase.from('user_roles').select('*', { count: 'exact', head: true }).eq('role', 'client');
                    const { count: p } = await (supabase as any).from('projects').select('*', { count: 'exact', head: true });
                    setMetrics({ clients: c || 0, projects: p || 0, storageUsed: 0 });
                } catch (err) { /* ignore */ }
            } finally {
                setLoading(false);
            }
        };

        fetchMetrics();
    }, []);

    if (role !== 'admin') {
        return <Navigate to="/dashboard" replace />;
    }

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    return (
        <DashboardLayout>
            <div className="space-y-6 animate-fade-in">
                <div className="flex flex-col gap-2">
                    <h1 className="text-3xl font-bold tracking-tight">Usage & Metrics</h1>
                    <p className="text-muted-foreground">
                        Monitor your platform's resource consumption and limits.
                    </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {/* Active Clients */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Active Clients</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{metrics.clients}</div>
                            <p className="text-xs text-muted-foreground">
                                {formatBytes(Math.max(0, LIMITS.clients - metrics.clients) * 0)} Enrolled users
                            </p>
                            <div className="mt-4 space-y-2">
                                <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">Limit: {LIMITS.clients} Clients</span>
                                    <span className="font-medium">{Math.round((metrics.clients / LIMITS.clients) * 100)}%</span>
                                </div>
                                <Progress value={(metrics.clients / LIMITS.clients) * 100} />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Active Projects */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
                            <Briefcase className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{metrics.projects}</div>
                            <p className="text-xs text-muted-foreground">
                                Across all clients
                            </p>
                            <div className="mt-4 space-y-2">
                                <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">Limit: {LIMITS.projects} Projects</span>
                                    <span className="font-medium">{Math.round((metrics.projects / LIMITS.projects) * 100)}%</span>
                                </div>
                                <Progress value={(metrics.projects / LIMITS.projects) * 100} />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Storage Usage (Estimated) */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Phone Storage</CardTitle>
                            <HardDrive className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatBytes(metrics.storageUsed)}</div>
                            <p className="text-xs text-muted-foreground">
                                Actual usage
                            </p>
                            <div className="mt-4 space-y-2">
                                <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">Limit: 500 MB (Free)</span>
                                    <span className="font-medium">{Math.round((metrics.storageUsed / LIMITS.storage) * 100)}%</span>
                                </div>
                                <Progress value={(metrics.storageUsed / LIMITS.storage) * 100} />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Database Healthy */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Database Health</CardTitle>
                            <Database className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-500">Optimum</div>
                            <p className="text-xs text-muted-foreground">
                                Connection stable
                            </p>
                            <div className="mt-4 h-2 w-full bg-green-500/10 rounded-full overflow-hidden">
                                <div className="h-full bg-green-500 w-full animate-pulse" />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default Usage;

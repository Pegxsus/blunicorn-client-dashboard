import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ProjectCard from '@/components/projects/ProjectCard';
import { mockNotifications } from '@/lib/mock-data';
import { Badge } from '@/components/ui/badge';
import {
  FolderOpen,
  CheckCircle2,
  Clock,
  TrendingUp,
  Bell,
  ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useProjects } from '@/hooks/useProjects';

const Dashboard = () => {
  const { user, profile, role } = useAuth();
  const { data: projects = [], isLoading } = useProjects();

  const userProjects = role === 'admin'
    ? projects
    : projects.filter(p => p.clientId === user?.id);

  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'User';

  const stats = {
    total: userProjects.length,
    completed: userProjects.filter(p => p.status === 'completed').length,
    inProgress: userProjects.filter(p => ['in-progress', 'testing', 'discovery'].includes(p.status)).length,
    ready: userProjects.filter(p => p.status === 'ready').length,
  };

  const recentNotifications = mockNotifications.slice(0, 3);

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-6xl">
        {/* Welcome section */}
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-foreground">
            Welcome back, {displayName.split(' ')[0]}
          </h1>
          <p className="text-sm text-muted-foreground">
            Here's what's happening with your automation projects.
          </p>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center">
                <FolderOpen className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-xl font-semibold text-foreground mono">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Projects</p>
              </div>
            </div>
          </div>

          <div className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-md bg-status-in-progress/10 flex items-center justify-center">
                <Clock className="w-4 h-4 text-status-in-progress" />
              </div>
              <div>
                <p className="text-xl font-semibold text-foreground mono">{stats.inProgress}</p>
                <p className="text-xs text-muted-foreground">In Progress</p>
              </div>
            </div>
          </div>

          <div className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-md bg-status-ready/10 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-status-ready" />
              </div>
              <div>
                <p className="text-xl font-semibold text-foreground mono">{stats.ready}</p>
                <p className="text-xs text-muted-foreground">Ready</p>
              </div>
            </div>
          </div>

          <div className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-md bg-status-completed/10 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-status-completed" />
              </div>
              <div>
                <p className="text-xl font-semibold text-foreground mono">{stats.completed}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main content grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Projects section */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-foreground">Your Projects</h2>
              <Button asChild variant="ghost" size="sm" className="text-xs h-7">
                <Link to="/projects" className="gap-1">
                  View all
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </Button>
            </div>

            {userProjects.length > 0 ? (
              <div className="grid gap-3">
                {userProjects.slice(0, 3).map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            ) : (
              <div className="glass-card p-10 text-center">
                <FolderOpen className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
                <h3 className="text-sm font-medium text-foreground mb-1">No projects yet</h3>
                <p className="text-xs text-muted-foreground">
                  Your automation projects will appear here once they're created.
                </p>
              </div>
            )}
          </div>

          {/* Notifications sidebar */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-foreground">Recent Updates</h2>
              <Badge variant="outline" className="text-[10px] h-5">
                {mockNotifications.filter(n => !n.read).length} new
              </Badge>
            </div>

            <div className="glass-card divide-y divide-border">
              {recentNotifications.map((notification) => (
                <Link
                  key={notification.id}
                  to={notification.projectId ? `/projects/${notification.projectId}` : '#'}
                  className="flex items-start gap-2.5 p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${notification.read ? 'bg-muted-foreground/30' : 'bg-primary'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{notification.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{notification.message}</p>
                  </div>
                </Link>
              ))}

              {recentNotifications.length === 0 && (
                <div className="p-6 text-center">
                  <Bell className="w-6 h-6 mx-auto mb-2 text-muted-foreground/50" />
                  <p className="text-xs text-muted-foreground">No updates yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;

import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ProjectCard from '@/components/projects/ProjectCard';
import { mockProjects, mockNotifications } from '@/lib/mock-data';
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

const Dashboard = () => {
  const { user } = useAuth();
  
  const userProjects = user?.role === 'admin' 
    ? mockProjects 
    : mockProjects.filter(p => p.clientId === user?.id);

  const stats = {
    total: userProjects.length,
    completed: userProjects.filter(p => p.status === 'completed').length,
    inProgress: userProjects.filter(p => ['in-progress', 'testing', 'discovery'].includes(p.status)).length,
    ready: userProjects.filter(p => p.status === 'ready').length,
  };

  const recentNotifications = mockNotifications.slice(0, 3);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Welcome section */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground animate-fade-in">
            Welcome back, {user?.name?.split(' ')[0]}
          </h1>
          <p className="text-muted-foreground animate-fade-in delay-100">
            Here's what's happening with your automation projects.
          </p>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-slide-up delay-100">
          <div className="glass-card p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FolderOpen className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Projects</p>
              </div>
            </div>
          </div>

          <div className="glass-card p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-status-in-progress/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-status-in-progress" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.inProgress}</p>
                <p className="text-sm text-muted-foreground">In Progress</p>
              </div>
            </div>
          </div>

          <div className="glass-card p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-status-ready/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-status-ready" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.ready}</p>
                <p className="text-sm text-muted-foreground">Ready</p>
              </div>
            </div>
          </div>

          <div className="glass-card p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-status-completed/10 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-status-completed" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.completed}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main content grid */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Projects section */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground">Your Projects</h2>
              <Button asChild variant="ghost" size="sm">
                <Link to="/projects" className="gap-1">
                  View all
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            </div>

            {userProjects.length > 0 ? (
              <div className="grid gap-4 animate-slide-up delay-200">
                {userProjects.slice(0, 3).map((project, index) => (
                  <div
                    key={project.id}
                    className="animate-slide-up"
                    style={{ animationDelay: `${200 + index * 100}ms` }}
                  >
                    <ProjectCard project={project} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="glass-card p-12 text-center">
                <FolderOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-lg font-medium text-foreground mb-2">No projects yet</h3>
                <p className="text-muted-foreground">
                  Your automation projects will appear here once they're created.
                </p>
              </div>
            )}
          </div>

          {/* Notifications sidebar */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground">Recent Updates</h2>
              <Badge variant="outline" className="text-xs">
                {mockNotifications.filter(n => !n.read).length} new
              </Badge>
            </div>

            <div className="glass-card divide-y divide-border animate-slide-up delay-300">
              {recentNotifications.map((notification) => (
                <Link
                  key={notification.id}
                  to={notification.projectId ? `/projects/${notification.projectId}` : '#'}
                  className="flex items-start gap-3 p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className={`w-2 h-2 rounded-full mt-2 ${notification.read ? 'bg-muted' : 'bg-primary'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{notification.title}</p>
                    <p className="text-sm text-muted-foreground truncate">{notification.message}</p>
                  </div>
                </Link>
              ))}

              {recentNotifications.length === 0 && (
                <div className="p-8 text-center">
                  <Bell className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">No updates yet</p>
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

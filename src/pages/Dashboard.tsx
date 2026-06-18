import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ProjectCard from '@/components/projects/ProjectCard';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';
// import { mockNotifications } from '@/lib/mock-data';
import { Badge } from '@/components/ui/badge';
import {
  FolderOpen,
  CheckCircle2,
  Clock,
  TrendingUp,
  Bell,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { useOnboarding } from '@/hooks/useOnboarding';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
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

  // Checklist state
  const [checklist, setChecklist] = useState({
    viewProject: false,
    checkUpdates: false,
    leaveFeedback: false,
    completeOnboarding: false
  });

  // Load checklist items from localStorage on mount and when user changes
  useEffect(() => {
    if (!user) return;
    const userId = user.id;
    const viewProject = localStorage.getItem(`blukaze_task_view_project_${userId}`) === 'true';
    const checkUpdates = localStorage.getItem(`blukaze_task_check_updates_${userId}`) === 'true';
    const leaveFeedback = localStorage.getItem(`blukaze_task_leave_feedback_${userId}`) === 'true';
    const completeOnboarding = localStorage.getItem(`blukaze_task_complete_onboarding_${userId}`) === 'true';

    setChecklist({
      viewProject,
      checkUpdates,
      leaveFeedback,
      completeOnboarding
    });
  }, [user]);

  const handleCheckUpdates = () => {
    if (!user) return;
    const userId = user.id;
    localStorage.setItem(`blukaze_task_check_updates_${userId}`, 'true');
    setChecklist(prev => ({ ...prev, checkUpdates: true }));
  };

  const handleTourComplete = () => {
    if (!user) return;
    const userId = user.id;
    localStorage.setItem(`blukaze_task_complete_onboarding_${userId}`, 'true');
    setChecklist(prev => ({ ...prev, completeOnboarding: true }));
    toast.success("Tour completed! Checklist updated.");
  };

  const handleTourSkip = () => {
    if (!user) return;
    const userId = user.id;
    localStorage.setItem(`blukaze_task_complete_onboarding_${userId}`, 'true');
    setChecklist(prev => ({ ...prev, completeOnboarding: true }));
  };

  const { startTour } = useOnboarding({
    userId: user?.id || undefined,
    onComplete: handleTourComplete,
    onSkip: handleTourSkip
  });

  const handleManualRestartTour = () => {
    startTour();
  };

  // Sync Supabase user metadata with local storage
  useEffect(() => {
    if (!user) return;
    const dbCompleted = user.user_metadata?.hasCompletedOnboarding === true;
    if (dbCompleted) {
      const onboardingCompletedKey = `blukaze_onboarding_completed_${user.id}`;
      const taskCompletedKey = `blukaze_task_complete_onboarding_${user.id}`;
      
      if (localStorage.getItem(onboardingCompletedKey) !== 'true') {
        localStorage.setItem(onboardingCompletedKey, 'true');
      }
      if (localStorage.getItem(taskCompletedKey) !== 'true') {
        localStorage.setItem(taskCompletedKey, 'true');
        setChecklist(prev => ({ ...prev, completeOnboarding: true }));
      }
    }
  }, [user]);

  // Auto-start tour on first login if not completed
  useEffect(() => {
    if (!user) return;
    const localCompleted = localStorage.getItem(`blukaze_onboarding_completed_${user.id}`) === 'true';
    const dbCompleted = user.user_metadata?.hasCompletedOnboarding === true;
    
    if (!localCompleted && !dbCompleted) {
      const timer = setTimeout(() => {
        startTour();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [user, startTour]);

  // Listen to custom window event
  useEffect(() => {
    const handleStartTour = () => {
      startTour();
    };
    window.addEventListener("start-blukaze-tour", handleStartTour);
    return () => {
      window.removeEventListener("start-blukaze-tour", handleStartTour);
    };
  }, [startTour]);

  const stats = {
    total: userProjects.length,
    completed: userProjects.filter(p => p.status === 'completed').length,
    inProgress: userProjects.filter(p => ['in-progress', 'testing', 'discovery'].includes(p.status)).length,
    ready: userProjects.filter(p => p.status === 'ready').length,
  };

  const [recentNotifications, setRecentNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;

    const fetchNotifications = async () => {
      const { data } = await supabase
        .from('notifications' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3);

      if (data) setRecentNotifications(data);
    };

    fetchNotifications();

    // Subscribe to real-time changes for dashboard widget
    const channel = supabase
      .channel('dashboard-notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setRecentNotifications((prev) => [payload.new, ...prev].slice(0, 3));
          } else if (payload.eventType === 'UPDATE') {
            setRecentNotifications((prev) =>
              prev.map((n) => (n.id === payload.new.id ? payload.new : n))
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

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

        {/* Getting Started Widget */}
        {(() => {
          const completedCount = Object.values(checklist).filter(Boolean).length;
          const completionPercentage = Math.round((completedCount / 4) * 100);
          const isChecklistFinished = completedCount === 4;

          if (isChecklistFinished) return null;

          return (
            <div id="tour-getting-started" className="p-6 rounded-lg border border-border bg-card/45 backdrop-blur-sm relative overflow-hidden animate-fade-in space-y-4">
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-primary/40 via-primary to-primary/40" />
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                    Getting Started
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Complete these tasks to get the most out of your Blukaze client dashboard.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-muted-foreground">{completedCount} of 4 tasks done</span>
                  <span className="text-xs bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded font-mono font-bold">
                    {completionPercentage}%
                  </span>
                </div>
              </div>

              <div className="w-full bg-muted rounded-full h-1 overflow-hidden">
                <div 
                  className="bg-primary h-full transition-all duration-500" 
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className={cn(
                  "flex items-center gap-2.5 p-3 rounded border transition-colors",
                  checklist.viewProject ? "bg-status-completed/5 border-status-completed/20 text-muted-foreground" : "bg-muted/20 border-border"
                )}>
                  <CheckCircle2 className={cn("w-4 h-4 shrink-0", checklist.viewProject ? "text-status-completed animate-scale-in" : "text-muted-foreground/30")} />
                  <span className={checklist.viewProject ? "line-through text-muted-foreground/50" : "font-medium"}>View your first project</span>
                </div>

                <div 
                  onClick={handleCheckUpdates}
                  className={cn(
                    "flex items-center gap-2.5 p-3 rounded border transition-colors cursor-pointer",
                    checklist.checkUpdates ? "bg-status-completed/5 border-status-completed/20 text-muted-foreground" : "bg-muted/20 border-border hover:border-primary/20"
                  )}
                >
                  <CheckCircle2 className={cn("w-4 h-4 shrink-0", checklist.checkUpdates ? "text-status-completed animate-scale-in" : "text-muted-foreground/30")} />
                  <span className={checklist.checkUpdates ? "line-through text-muted-foreground/50" : "font-medium"}>Check recent updates</span>
                </div>

                <div className={cn(
                  "flex items-center gap-2.5 p-3 rounded border transition-colors",
                  checklist.leaveFeedback ? "bg-status-completed/5 border-status-completed/20 text-muted-foreground" : "bg-muted/20 border-border"
                )}>
                  <CheckCircle2 className={cn("w-4 h-4 shrink-0", checklist.leaveFeedback ? "text-status-completed animate-scale-in" : "text-muted-foreground/30")} />
                  <span className={checklist.leaveFeedback ? "line-through text-muted-foreground/50" : "font-medium"}>Leave feedback</span>
                </div>

                <div 
                  onClick={handleManualRestartTour}
                  className={cn(
                    "flex items-center gap-2.5 p-3 rounded border transition-colors cursor-pointer",
                    checklist.completeOnboarding ? "bg-status-completed/5 border-status-completed/20 text-muted-foreground" : "bg-muted/20 border-border hover:border-primary/20"
                  )}
                >
                  <CheckCircle2 className={cn("w-4 h-4 shrink-0", checklist.completeOnboarding ? "text-status-completed animate-scale-in" : "text-muted-foreground/30")} />
                  <span className={checklist.completeOnboarding ? "line-through text-muted-foreground/50" : "font-medium"}>Complete onboarding</span>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Stats cards */}
        <div id="tour-overview-cards" className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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
                {userProjects.slice(0, 3).map((project, index) => (
                  <div key={project.id} id={index === 0 ? "tour-project-card" : undefined}>
                    <ProjectCard project={project} />
                  </div>
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
          <div id="tour-recent-updates" className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-foreground">Recent Updates</h2>
              <Badge variant="outline" className="text-[10px] h-5">
                {recentNotifications.filter(n => !n.read).length} new
              </Badge>
            </div>

            <div className="glass-card divide-y divide-border">
              {recentNotifications.map((notification) => (
                <Link
                  key={notification.id}
                  to={notification.project_id ? `/projects/${notification.project_id}` : '#'}
                  className="flex items-start gap-2.5 p-3 hover:bg-muted/50 transition-colors"
                  onClick={handleCheckUpdates}
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

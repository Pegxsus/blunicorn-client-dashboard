import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import MilestoneTimeline from '@/components/projects/MilestoneTimeline';
import DeliverablesList from '@/components/projects/DeliverablesList';
import FeedbackSection from '@/components/projects/FeedbackSection';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  Calendar,
  Clock,
  CheckCircle2,
  FileText,
  MessageSquare,
  Target
} from 'lucide-react';
import { format } from 'date-fns';
import { ProjectStatus } from '@/types';
import { useProjects } from '@/hooks/useProjects';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const statusLabels: Record<ProjectStatus, string> = {
  discovery: 'Discovery',
  'in-progress': 'In Progress',
  testing: 'Testing',
  ready: 'Ready',
  completed: 'Completed',
};

const ProjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: projects = [], isLoading } = useProjects();
  const { data: unreadNotifications = [] } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('notifications' as any)
        .select('*')
        .eq('user_id', user.id)
        .eq('read', false);
      return data || [];
    },
    enabled: !!user,
  });

  const project = projects.find((p) => p.id === id);
  const projectUnreadCount = unreadNotifications.filter(n => n.project_id === id).length;

  if (!project) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Project not found</h1>
          <p className="text-muted-foreground mb-6">
            The project you're looking for doesn't exist or you don't have access.
          </p>
          <Button asChild>
            <Link to="/projects">Back to Projects</Link>
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const completedMilestones = project.milestones.filter((m) => m.status === 'completed').length;
  const projectReady = project.status === 'ready' || project.status === 'completed';

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/projects')}
            className="mb-4 -ml-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Projects
          </Button>

          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-foreground">{project.name}</h1>
                <Badge variant={project.status} className="text-sm">
                  {statusLabels[project.status]}
                </Badge>
              </div>
              <p className="text-muted-foreground max-w-2xl">{project.description}</p>
            </div>

            {user?.role === 'admin' && (
              <Button asChild>
                <Link to={`/admin?project=${project.id}`}>Manage Project</Link>
              </Button>
            )}
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Target className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">{project.progress}%</p>
                <p className="text-xs text-muted-foreground">Progress</p>
              </div>
            </div>
          </div>

          <div className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-status-completed/10 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-status-completed" />
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">
                  {completedMilestones}/{project.milestones.length}
                </p>
                <p className="text-xs text-muted-foreground">Milestones</p>
              </div>
            </div>
          </div>

          <div className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-status-in-progress/10 flex items-center justify-center">
                <Calendar className="w-4 h-4 text-status-in-progress" />
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">
                  {format(new Date(project.estimatedDelivery), 'MMM d')}
                </p>
                <p className="text-xs text-muted-foreground">Est. Delivery</p>
              </div>
            </div>
          </div>

          <div className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-secondary/10 flex items-center justify-center">
                <Clock className="w-4 h-4 text-secondary" />
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">
                  {format(new Date(project.updatedAt), 'MMM d')}
                </p>
                <p className="text-xs text-muted-foreground">Last Updated</p>
              </div>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-foreground">Project Progress</span>
            <span className="text-sm text-muted-foreground">{project.progress}% complete</span>
          </div>
          <Progress value={project.progress} className="h-3" />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="milestones" className="space-y-6">
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="milestones" className="gap-2">
              <Target className="w-4 h-4" />
              <span className="hidden sm:inline">Milestones</span>
            </TabsTrigger>
            <TabsTrigger value="deliverables" className="gap-2">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Deliverables</span>
              {projectReady && (
                <Badge variant="ready" className="ml-1 text-[10px] px-1.5">
                  Ready
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="feedback" className="gap-2">
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">Feedback</span>
              {project.revisionCount > 0 && (
                <Badge variant="outline" className="ml-1 text-[10px] px-1.5">
                  {project.revisionCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="milestones" className="mt-0">
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold text-foreground mb-6">Project Timeline</h3>
              <MilestoneTimeline milestones={project.milestones} />
            </div>
          </TabsContent>

          <TabsContent value="deliverables" className="mt-0">
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-foreground">Deliverables</h3>
                {!projectReady && (
                  <Badge variant="outline" className="text-xs">
                    Available when project is ready
                  </Badge>
                )}
              </div>
              <DeliverablesList deliverables={project.deliverables} projectReady={projectReady} />
            </div>
          </TabsContent>

          <TabsContent value="feedback" className="mt-0">
            <div className="glass-card p-6">

              <FeedbackSection
                revisionCount={project.revisionCount}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default ProjectDetail;

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useSearchParams } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { mockProjects } from '@/lib/mock-data';
import { Project, ProjectStatus, Milestone } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Plus, 
  Edit, 
  Upload, 
  Bell, 
  Eye,
  CheckCircle2,
  Search,
  Users
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const statusLabels: Record<ProjectStatus, string> = {
  discovery: 'Discovery',
  'in-progress': 'In Progress',
  testing: 'Testing',
  ready: 'Ready',
  completed: 'Completed',
};

const statusOptions: ProjectStatus[] = ['discovery', 'in-progress', 'testing', 'ready', 'completed'];

const Admin = () => {
  const { user, role } = useAuth();
  const [searchParams] = useSearchParams();
  const selectedProjectId = searchParams.get('project');
  
  const [projects, setProjects] = useState<Project[]>(mockProjects);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Redirect non-admin users - Note: This is a UX check only.
  // Backend operations MUST be protected by RLS policies using has_role() function.
  if (role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  const filteredProjects = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.clientName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedProject = selectedProjectId
    ? projects.find((p) => p.id === selectedProjectId)
    : null;

  const handleStatusChange = (projectId: string, newStatus: ProjectStatus) => {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId
          ? {
              ...p,
              status: newStatus,
              progress: calculateProgress(newStatus, p.milestones),
              updatedAt: new Date().toISOString(),
            }
          : p
      )
    );
  };

  const handleMilestoneToggle = (projectId: string, milestoneId: string) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== projectId) return p;
        
        const updatedMilestones = p.milestones.map((m) => {
          if (m.id !== milestoneId) return m;
          
          const newStatus = m.status === 'completed' ? 'pending' : 'completed';
          return {
            ...m,
            status: newStatus as Milestone['status'],
            completedAt: newStatus === 'completed' ? new Date().toISOString() : undefined,
          };
        });

        // Update active milestone
        const firstPending = updatedMilestones.findIndex((m) => m.status !== 'completed');
        const finalMilestones = updatedMilestones.map((m, i) => ({
          ...m,
          status: m.status === 'completed' 
            ? 'completed' 
            : i === firstPending 
              ? 'active' 
              : 'pending',
        })) as Milestone[];

        const completedCount = finalMilestones.filter((m) => m.status === 'completed').length;
        const progress = Math.round((completedCount / finalMilestones.length) * 100);

        return {
          ...p,
          milestones: finalMilestones,
          progress,
          updatedAt: new Date().toISOString(),
        };
      })
    );
  };

  const calculateProgress = (status: ProjectStatus, milestones: Milestone[]): number => {
    if (status === 'completed') return 100;
    if (status === 'ready') return 100;
    
    const completedCount = milestones.filter((m) => m.status === 'completed').length;
    return Math.round((completedCount / milestones.length) * 100);
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Admin Panel</h1>
            <p className="text-muted-foreground mt-1">Manage projects and client deliverables</p>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="gradient" className="gap-2">
                <Plus className="w-4 h-4" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
                <DialogDescription>
                  Add a new automation project for a client.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Project Name</Label>
                  <Input placeholder="E.g., CRM Integration Workflow" />
                </div>
                <div className="space-y-2">
                  <Label>Client</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a client" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Alex Johnson</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea placeholder="Brief project description..." />
                </div>
                <div className="space-y-2">
                  <Label>Estimated Delivery</Label>
                  <Input type="date" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setCreateDialogOpen(false)}>
                  Create Project
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-card p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{projects.length}</p>
                <p className="text-sm text-muted-foreground">Total Projects</p>
              </div>
            </div>
          </div>
          <div className="glass-card p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-status-in-progress/10 flex items-center justify-center">
                <Edit className="w-5 h-5 text-status-in-progress" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {projects.filter((p) => p.status === 'in-progress').length}
                </p>
                <p className="text-sm text-muted-foreground">In Progress</p>
              </div>
            </div>
          </div>
          <div className="glass-card p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-status-ready/10 flex items-center justify-center">
                <Upload className="w-5 h-5 text-status-ready" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {projects.filter((p) => p.status === 'ready').length}
                </p>
                <p className="text-sm text-muted-foreground">Ready for Delivery</p>
              </div>
            </div>
          </div>
          <div className="glass-card p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-status-completed/10 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-status-completed" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {projects.filter((p) => p.status === 'completed').length}
                </p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search projects or clients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Projects table */}
        <div className="glass-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Project</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProjects.map((project) => (
                <TableRow 
                  key={project.id}
                  className={cn(
                    selectedProject?.id === project.id && 'bg-primary/5'
                  )}
                >
                  <TableCell>
                    <div>
                      <p className="font-medium text-foreground">{project.name}</p>
                      <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                        {project.description}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {project.clientName}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={project.status}
                      onValueChange={(value) =>
                        handleStatusChange(project.id, value as ProjectStatus)
                      }
                    >
                      <SelectTrigger className="w-[140px] h-8">
                        <Badge variant={project.status} className="font-normal">
                          {statusLabels[project.status]}
                        </Badge>
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((status) => (
                          <SelectItem key={status} value={status}>
                            <Badge variant={status}>{statusLabels[status]}</Badge>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full progress-gradient"
                          style={{ width: `${project.progress}%` }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {project.progress}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(project.updatedAt), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingProject(project)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        asChild
                      >
                        <a href={`/projects/${project.id}`}>
                          <Eye className="w-4 h-4" />
                        </a>
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Bell className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Edit Project Dialog */}
        <Dialog open={!!editingProject} onOpenChange={() => setEditingProject(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Project</DialogTitle>
              <DialogDescription>
                Update project details and milestone status.
              </DialogDescription>
            </DialogHeader>
            {editingProject && (
              <div className="space-y-6 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Project Name</Label>
                    <Input defaultValue={editingProject.name} />
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      defaultValue={editingProject.status}
                      onValueChange={(value) =>
                        handleStatusChange(editingProject.id, value as ProjectStatus)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((status) => (
                          <SelectItem key={status} value={status}>
                            {statusLabels[status]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea defaultValue={editingProject.description} />
                </div>

                <div className="space-y-3">
                  <Label>Milestones</Label>
                  <div className="space-y-2">
                    {editingProject.milestones.map((milestone) => (
                      <div
                        key={milestone.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={milestone.status === 'completed'}
                            onCheckedChange={() =>
                              handleMilestoneToggle(editingProject.id, milestone.id)
                            }
                          />
                          <div>
                            <p className="font-medium text-sm">{milestone.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {milestone.description}
                            </p>
                          </div>
                        </div>
                        {milestone.completedAt && (
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(milestone.completedAt), 'MMM d')}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Internal Notes</Label>
                  <Textarea 
                    placeholder="Add internal notes (not visible to client)..."
                    className="min-h-[80px]"
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingProject(null)}>
                Cancel
              </Button>
              <Button onClick={() => setEditingProject(null)}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default Admin;

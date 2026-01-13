import { createClient } from '@supabase/supabase-js';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useSearchParams } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Plus,
  Edit,
  Upload,
  Bell,
  Eye,
  CheckCircle2,
  Search,
  Users,
  Loader2,
  Trash2,
  UserPlus,
  Key,
  Info
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useProjects } from '@/hooks/useProjects';
import { useClients } from '@/hooks/useClients';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { EditProjectDialog } from '@/components/admin/EditProjectDialog';

const statusLabels: Record<ProjectStatus, string> = {
  discovery: 'Discovery',
  'in-progress': 'In Progress',
  testing: 'Testing',
  ready: 'Ready',
  completed: 'Completed',
};

const statusOptions: ProjectStatus[] = ['discovery', 'in-progress', 'testing', 'ready', 'completed'];

const Admin = () => {
  const { role } = useAuth();
  const [searchParams] = useSearchParams();
  const selectedProjectId = searchParams.get('project');
  const queryClient = useQueryClient();

  const { data: projects = [], isLoading: isProjectsLoading } = useProjects();
  const { data: clients = [], isLoading: isClientsLoading } = useClients();

  const [searchQuery, setSearchQuery] = useState('');
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [createClientDialogOpen, setCreateClientDialogOpen] = useState(false);
  const [manageClientsDialogOpen, setManageClientsDialogOpen] = useState(false);
  const [deleteClientDialogOpen, setDeleteClientDialogOpen] = useState(false);
  const [changePasswordDialogOpen, setChangePasswordDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<{ id: string; name: string } | null>(null);
  const [clientToChangePassword, setClientToChangePassword] = useState<any>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // New Project State
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectClient, setNewProjectClient] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [newProjectDate, setNewProjectDate] = useState('');

  // New Client State
  const [newClientName, setNewClientName] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientPassword, setNewClientPassword] = useState('');

  // Redirect non-admin users
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

  const handleCreateProject = async () => {
    if (!newProjectName || !newProjectClient) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsCreating(true);
    try {
      const { error } = await supabase.from('projects').insert({
        title: newProjectName,
        client_id: newProjectClient,
        description: newProjectDescription,
        estimated_delivery: newProjectDate ? new Date(newProjectDate).toISOString() : null,
        status: 'discovery',
        progress: 0
      });

      if (error) throw error;

      toast.success("Project created successfully");
      setCreateDialogOpen(false);
      setNewProjectName('');
      setNewProjectClient('');
      setNewProjectDescription('');
      setNewProjectDate('');
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    } catch (error: any) {
      console.error('Error creating project:', error);
      toast.error(error.message || "Failed to create project");
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateClient = async () => {
    if (!newClientName || !newClientEmail || !newClientPassword) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsCreatingClient(true);
    try {
      // Check if user already exists in profiles
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('email')
        .eq('email', newClientEmail)
        .single();

      if (existingUser) {
        toast.error("A user with this email address already exists.");
        setIsCreatingClient(false);
        return;
      }

      // Create a temporary client to avoid signing out the admin
      const tempSupabase = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        {
          auth: {
            persistSession: false, // Don't persist this session
            autoRefreshToken: false,
            detectSessionInUrl: false
          }
        }
      );

      const { data, error } = await tempSupabase.auth.signUp({
        email: newClientEmail,
        password: newClientPassword,
        options: {
          data: {
            display_name: newClientName,
            full_name: newClientName, // Adding both for compatibility
            created_by_admin: true // Flag to allow bypass of signup restriction
          }
        }
      });

      if (error) throw error;

      if (data.user) {
        // Wait for the profile to be created via trigger
        let profileCreated = false;
        let attempts = 0;

        while (!profileCreated && attempts < 10) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('user_id', data.user.id)
            .single();

          if (profile) {
            profileCreated = true;
          } else {
            // Wait 500ms before next attempt
            await new Promise(resolve => setTimeout(resolve, 500));
            attempts++;
          }
        }

        if (profileCreated) {
          toast.success("Client created successfully");
          setCreateClientDialogOpen(false);
          setNewClientName('');
          setNewClientEmail('');
          setNewClientPassword('');
          // Invalidate clients query to refresh the list
          queryClient.invalidateQueries({ queryKey: ['clients'] });
        } else {
          toast.warning("Client created, but profile creation is taking longer than expected. Please refresh the page.");
          setCreateClientDialogOpen(false);
        }
      }
    } catch (error: any) {
      console.error('Error creating client:', error);
      toast.error(error.message || "Failed to create client");
    } finally {
      setIsCreatingClient(false);
    }
  };


  const handleUpdatePassword = async () => {
    if (!clientToChangePassword || !newPasswordInput) return;

    setIsChangingPassword(true);
    try {
      const { error } = await (supabase as any).rpc('admin_update_user_password', {
        target_user_id: clientToChangePassword.id,
        new_password: newPasswordInput
      });

      if (error) throw error;

      toast.success("Password updated successfully");
      setChangePasswordDialogOpen(false);
      setNewPasswordInput('');
      setClientToChangePassword(null);
    } catch (error: any) {
      console.error('Error updating password:', error);
      toast.error(error.message || "Failed to update password");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const confirmDeleteClient = (clientId: string, clientName: string) => {
    setClientToDelete({ id: clientId, name: clientName });
    setDeleteClientDialogOpen(true);
  };

  const handleDeleteClient = async () => {
    if (!clientToDelete) return;

    try {
      // Use the secure RPC function to delete the user from auth.users
      // This will cascade delete their profile, user_roles, and projects
      const { error } = await (supabase as any).rpc('admin_delete_user', {
        target_user_id: clientToDelete.id
      });

      if (error) throw error;

      toast.success('Client removed successfully');
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setDeleteClientDialogOpen(false);
      setClientToDelete(null);
    } catch (error: any) {
      console.error('Error deleting client:', error);
      toast.error(error.message || 'Failed to delete client');
    }
  };

  const handleStatusChange = async (projectId: string, newStatus: ProjectStatus) => {
    try {
      // Determine default progress based on status
      let newProgress = 0;
      switch (newStatus) {
        case 'discovery':
          newProgress = 0;
          break;
        case 'in-progress':
          newProgress = 25;
          break;
        case 'testing':
          newProgress = 75;
          break;
        case 'ready':
          newProgress = 90;
          break;
        case 'completed':
          newProgress = 100;
          break;
      }

      const { error } = await supabase
        .from('projects')
        .update({
          status: newStatus,
          progress: newProgress
        })
        .eq('id', projectId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success("Status and progress updated");
    } catch (error: any) {
      toast.error("Failed to update status");
    }
  };

  const handleDeleteProject = async (projectId: string, projectName: string) => {
    setProjectToDelete({ id: projectId, name: projectName });
    setDeleteDialogOpen(true);
  };

  const confirmDeleteProject = async () => {
    if (!projectToDelete) return;

    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectToDelete.id);

      if (error) throw error;

      toast.success('Project deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setDeleteDialogOpen(false);
      setProjectToDelete(null);
    } catch (error: any) {
      console.error('Error deleting project:', error);
      toast.error(error.message || 'Failed to delete project');
    }
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
          <div className="flex gap-2">
            <Dialog open={manageClientsDialogOpen} onOpenChange={setManageClientsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" className="gap-2">
                  <Users className="w-4 h-4" />
                  Manage Clients
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Manage Clients</DialogTitle>
                  <DialogDescription>
                    View and manage registered clients.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                  {isClientsLoading ? (
                    <div className="text-center py-4">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                    </div>
                  ) : clients.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">
                      No clients found
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {clients.map((client) => (
                        <div key={client.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div className="min-w-0 flex-1 mr-2">
                            <p className="font-medium text-sm text-foreground truncate">{client.displayName}</p>
                            <p className="text-xs text-muted-foreground truncate">{client.email}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="View Info"
                                >
                                  <Info className="w-4 h-4 text-muted-foreground" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-4">
                                <div className="space-y-2">
                                  <h4 className="font-medium leading-none">Client Info</h4>
                                  <p className="text-sm text-muted-foreground">
                                    <span className="font-semibold">Last Online:</span>{' '}
                                    {client.lastSignInAt
                                      ? format(new Date(client.lastSignInAt), 'MMM d, yyyy h:mm a')
                                      : 'Never'}
                                  </p>
                                </div>
                              </PopoverContent>
                            </Popover>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Change Password"
                              onClick={() => {
                                setClientToChangePassword(client);
                                setChangePasswordDialogOpen(true);
                                setNewPasswordInput('');
                              }}
                            >
                              <Key className="w-4 h-4 text-muted-foreground" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive shrink-0"
                              onClick={() => confirmDeleteClient(client.id, client.displayName)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setManageClientsDialogOpen(false)}>
                    Close
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={changePasswordDialogOpen} onOpenChange={setChangePasswordDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Change Password</DialogTitle>
                  <DialogDescription>
                    Set a new password for <span className="font-semibold">{clientToChangePassword?.displayName}</span>.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>New Password</Label>
                    <div className="relative">
                      <Input
                        type="text"
                        placeholder="Enter new password"
                        value={newPasswordInput}
                        onChange={(e) => setNewPasswordInput(e.target.value)}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      The new password will be active immediately.
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setChangePasswordDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleUpdatePassword} disabled={isChangingPassword || !newPasswordInput}>
                    {isChangingPassword ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Update Password
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={createClientDialogOpen} onOpenChange={setCreateClientDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <UserPlus className="w-4 h-4" />
                  New Client
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Enroll New Client</DialogTitle>
                  <DialogDescription>
                    Create a new client account. They will be able to log in with these credentials.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Full Name *</Label>
                    <Input
                      placeholder="John Doe"
                      value={newClientName}
                      onChange={(e) => setNewClientName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email *</Label>
                    <Input
                      type="email"
                      placeholder="john@example.com"
                      value={newClientEmail}
                      onChange={(e) => setNewClientEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Password *</Label>
                    <Input
                      type="password"
                      placeholder="******"
                      value={newClientPassword}
                      onChange={(e) => setNewClientPassword(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateClientDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateClient} disabled={isCreatingClient}>
                    {isCreatingClient ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Create Client
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
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
                    <Label>Project Name *</Label>
                    <Input
                      placeholder="E.g., CRM Integration Workflow"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Client *</Label>
                    <Select value={newProjectClient} onValueChange={setNewProjectClient}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a client" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.displayName} ({client.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      placeholder="Brief project description..."
                      value={newProjectDescription}
                      onChange={(e) => setNewProjectDescription(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Estimated Delivery</Label>
                    <Input
                      type="date"
                      value={newProjectDate}
                      onChange={(e) => setNewProjectDate(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateProject} disabled={isCreating}>
                    {isCreating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Create Project
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
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
              {isProjectsLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : filteredProjects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No projects found
                  </TableCell>
                </TableRow>
              ) : (
                filteredProjects.map((project) => (
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
                          onClick={() => {
                            setEditingProject(project);
                            setEditDialogOpen(true);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteProject(project.id, project.name)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
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
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Edit Project Dialog */}
      {editingProject && (
        <EditProjectDialog
          project={editingProject}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Are you sure you want to permanently delete{' '}
                <span className="font-semibold">{projectToDelete?.name}</span>?
              </p>
              <p className="text-sm">This will delete all:</p>
              <ul className="text-sm list-disc list-inside space-y-1 ml-2">
                <li>Milestones</li>
                <li>Deliverables</li>
                <li>Feedback messages</li>
                <li>Associated notifications</li>
              </ul>
              <p className="text-sm font-semibold text-destructive">
                This action cannot be undone.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteProject}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete Project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Client Confirmation Dialog */}
      <AlertDialog open={deleteClientDialogOpen} onOpenChange={setDeleteClientDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Client</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Are you sure you want to permanently delete{' '}
                <span className="font-semibold">{clientToDelete?.name}</span>?
              </p>
              <p className="text-sm">This will remove their profile and access to the dashboard. Their user account will remain but they will be unable to log in.</p>
              <p className="text-sm font-semibold text-destructive">
                This action cannot be undone.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteClient}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete Client
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default Admin;

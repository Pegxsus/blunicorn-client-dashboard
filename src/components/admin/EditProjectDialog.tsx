import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Project, Milestone, Deliverable, MilestoneStatus } from '@/types';
import { Plus, Trash2, Check, Loader2, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EditProjectDialogProps {
    project: Project;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function EditProjectDialog({ project, open, onOpenChange, onSuccess }: EditProjectDialogProps) {
    const [milestones, setMilestones] = useState<Milestone[]>([]);
    const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    // Milestone state
    const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
    const [newMilestoneDesc, setNewMilestoneDesc] = useState('');

    // Deliverable state
    const [newDeliverableName, setNewDeliverableName] = useState('');
    const [newDeliverableType, setNewDeliverableType] = useState<'workflow' | 'documentation' | 'guide' | 'video'>('workflow');
    const [newDeliverableUrl, setNewDeliverableUrl] = useState('');


    // Reset state when dialog first opens (not when project changes during editing)
    useEffect(() => {
        if (open) {
            console.log('Dialog opened - Initializing with project:', project);
            console.log('Project milestones:', project.milestones);
            console.log('Project deliverables:', project.deliverables);
            setMilestones(project.milestones || []);
            setDeliverables(project.deliverables || []);
        } else {
            // Reset when dialog closes
            setMilestones([]);
            setDeliverables([]);
        }
    }, [open]); // Only depend on 'open', not 'project'

    const handleAddMilestone = () => {
        if (!newMilestoneTitle.trim()) {
            toast.error('Please enter a milestone title');
            return;
        }

        const newMilestone: Milestone = {
            id: `milestone-${Date.now()}`,
            title: newMilestoneTitle,
            description: newMilestoneDesc,
            status: 'pending',
        };

        setMilestones([...milestones, newMilestone]);
        setNewMilestoneTitle('');
        setNewMilestoneDesc('');
        toast.success('Milestone added');
    };

    const handleUpdateMilestoneStatus = (id: string, status: MilestoneStatus) => {
        setMilestones(milestones.map(m =>
            m.id === id ? { ...m, status, completedAt: status === 'completed' ? new Date().toISOString() : undefined } : m
        ));
    };

    const handleDeleteMilestone = (id: string) => {
        setMilestones(milestones.filter(m => m.id !== id));
        toast.success('Milestone removed');
    };

    const handleAddDeliverable = () => {
        if (!newDeliverableName.trim() || !newDeliverableUrl.trim()) {
            toast.error('Please enter name and URL');
            return;
        }

        const newDeliverable: Deliverable = {
            id: `deliverable-${Date.now()}`,
            name: newDeliverableName,
            type: newDeliverableType,
            url: newDeliverableUrl,
            locked: false, // Changed to false so deliverables are immediately visible
        };

        console.log('Adding deliverable:', newDeliverable);
        console.log('Current deliverables:', deliverables);
        const updatedDeliverables = [...deliverables, newDeliverable];
        console.log('Updated deliverables:', updatedDeliverables);

        setDeliverables(updatedDeliverables);
        setNewDeliverableName('');
        setNewDeliverableUrl('');
        toast.success('Deliverable added');
    };

    const handleToggleDeliverableLock = (id: string) => {
        setDeliverables(deliverables.map(d =>
            d.id === id ? { ...d, locked: !d.locked } : d
        ));
    };

    const handleDeleteDeliverable = (id: string) => {
        setDeliverables(deliverables.filter(d => d.id !== id));
        toast.success('Deliverable removed');
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            console.log('Saving milestones:', milestones);
            console.log('Saving deliverables:', deliverables);

            const { error, data } = await supabase
                .from('projects')
                .update({
                    milestones: milestones as any,
                    deliverables: deliverables as any,
                })
                .eq('id', project.id)
                .select();

            console.log('Save response:', { error, data });

            if (error) throw error;

            toast.success('Project updated successfully');
            onSuccess();
            onOpenChange(false);
        } catch (error: any) {
            console.error('Error updating project:', error);
            toast.error(error.message || 'Failed to update project');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Edit Project: {project.name}</DialogTitle>
                    <DialogDescription>
                        Manage milestones and deliverables for this project
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="milestones" className="mt-4">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="milestones">Milestones ({milestones.length})</TabsTrigger>
                        <TabsTrigger value="deliverables">Deliverables ({deliverables.length})</TabsTrigger>
                    </TabsList>

                    <TabsContent value="milestones" className="space-y-4">
                        {/* Add Milestone Form */}
                        <div className="p-4 border rounded-lg space-y-3">
                            <h4 className="font-medium">Add Milestone</h4>
                            <div className="space-y-2">
                                <Input
                                    placeholder="Milestone title"
                                    value={newMilestoneTitle}
                                    onChange={(e) => setNewMilestoneTitle(e.target.value)}
                                />
                                <Textarea
                                    placeholder="Description (optional)"
                                    value={newMilestoneDesc}
                                    onChange={(e) => setNewMilestoneDesc(e.target.value)}
                                    rows={2}
                                />
                                <Button onClick={handleAddMilestone} size="sm" className="w-full">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Milestone
                                </Button>
                            </div>
                        </div>

                        {/* Milestone List */}
                        <div className="space-y-2">
                            {milestones.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-8">
                                    No milestones yet. Add one above.
                                </p>
                            ) : (
                                milestones.map((milestone) => (
                                    <div key={milestone.id} className="p-3 border rounded-lg space-y-2">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <h5 className="font-medium">{milestone.title}</h5>
                                                {milestone.description && (
                                                    <p className="text-sm text-muted-foreground">{milestone.description}</p>
                                                )}
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDeleteMilestone(milestone.id)}
                                                className="text-destructive"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                variant={milestone.status === 'pending' ? 'secondary' : 'outline'}
                                                size="sm"
                                                onClick={() => handleUpdateMilestoneStatus(milestone.id, 'pending')}
                                            >
                                                Pending
                                            </Button>
                                            <Button
                                                variant={milestone.status === 'active' ? 'secondary' : 'outline'}
                                                size="sm"
                                                onClick={() => handleUpdateMilestoneStatus(milestone.id, 'active')}
                                            >
                                                Active
                                            </Button>
                                            <Button
                                                variant={milestone.status === 'completed' ? 'secondary' : 'outline'}
                                                size="sm"
                                                onClick={() => handleUpdateMilestoneStatus(milestone.id, 'completed')}
                                            >
                                                <Check className="w-4 h-4 mr-1" />
                                                Completed
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="deliverables" className="space-y-4">
                        {/* Add Deliverable Form */}
                        <div className="p-4 border rounded-lg space-y-3">
                            <h4 className="font-medium">Add Deliverable</h4>
                            <div className="space-y-2">
                                <Input
                                    placeholder="Deliverable name"
                                    value={newDeliverableName}
                                    onChange={(e) => setNewDeliverableName(e.target.value)}
                                />
                                <Select value={newDeliverableType} onValueChange={(v: any) => setNewDeliverableType(v)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="workflow">Workflow</SelectItem>
                                        <SelectItem value="documentation">Documentation</SelectItem>
                                        <SelectItem value="guide">Guide</SelectItem>
                                        <SelectItem value="video">Video</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Input
                                    placeholder="URL (e.g., https://example.com/file.pdf)"
                                    value={newDeliverableUrl}
                                    onChange={(e) => setNewDeliverableUrl(e.target.value)}
                                />
                                <Button onClick={handleAddDeliverable} size="sm" className="w-full">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Deliverable
                                </Button>
                            </div>
                        </div>

                        {/* Deliverable List */}
                        <div className="space-y-2">
                            {deliverables.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-8">
                                    No deliverables yet. Add one above.
                                </p>
                            ) : (
                                deliverables.map((deliverable) => (
                                    <div key={deliverable.id} className="p-3 border rounded-lg flex items-center justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <h5 className="font-medium">{deliverable.name}</h5>
                                                <span className="text-xs bg-secondary px-2 py-0.5 rounded">
                                                    {deliverable.type}
                                                </span>
                                            </div>
                                            <p className="text-sm text-muted-foreground truncate">{deliverable.url}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant={deliverable.locked ? 'destructive' : 'outline'}
                                                size="sm"
                                                onClick={() => handleToggleDeliverableLock(deliverable.id)}
                                            >
                                                {deliverable.locked ? (
                                                    <><Lock className="w-3 h-3 mr-1" /> Locked</>
                                                ) : (
                                                    'Unlocked'
                                                )}
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDeleteDeliverable(deliverable.id)}
                                                className="text-destructive"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </TabsContent>
                </Tabs>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

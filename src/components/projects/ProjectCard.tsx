import { Link } from 'react-router-dom';
import { Project, ProjectStatus } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Calendar, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';

interface ProjectCardProps {
  project: Project;
}

const statusLabels: Record<ProjectStatus, string> = {
  discovery: 'Discovery',
  'in-progress': 'In Progress',
  testing: 'Testing',
  ready: 'Ready',
  completed: 'Completed',
};

const ProjectCard = ({ project }: ProjectCardProps) => {
  return (
    <div className="glass-card glow-effect p-4 group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
            {project.name}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
            {project.description}
          </p>
        </div>
        <Badge variant={project.status} className="ml-3 shrink-0 text-[10px]">
          {statusLabels[project.status]}
        </Badge>
      </div>

      <div className="space-y-3">
        <div>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium text-foreground mono">{project.progress}%</span>
          </div>
          <Progress value={project.progress} className="h-1" />
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="w-3 h-3" />
            <span>Est. {format(new Date(project.estimatedDelivery), 'MMM d, yyyy')}</span>
          </div>
          <Button asChild variant="ghost" size="sm" className="gap-1 h-7 text-xs">
            <Link to={`/projects/${project.id}`}>
              View
              <ArrowRight className="w-3 h-3" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProjectCard;

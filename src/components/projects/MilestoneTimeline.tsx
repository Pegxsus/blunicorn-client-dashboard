import { Milestone } from '@/types';
import { Check, Circle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface MilestoneTimelineProps {
  milestones: Milestone[];
}

const MilestoneTimeline = ({ milestones }: MilestoneTimelineProps) => {
  return (
    <div className="space-y-0">
      {milestones.map((milestone, index) => (
        <div key={milestone.id} className="relative pl-10 pb-8 last:pb-0">
          {/* Connecting line */}
          {index < milestones.length - 1 && (
            <div
              className={cn(
                'absolute left-3 top-6 w-px h-full',
                milestone.status === 'completed'
                  ? 'bg-gradient-to-b from-status-completed to-status-completed/30'
                  : 'bg-border'
              )}
            />
          )}

          {/* Status dot */}
          <div
            className={cn(
              'absolute left-0 w-6 h-6 rounded-full border-2 flex items-center justify-center',
              milestone.status === 'completed' && 'bg-status-completed border-status-completed',
              milestone.status === 'active' && 'bg-primary/20 border-primary animate-pulse',
              milestone.status === 'pending' && 'bg-muted border-border'
            )}
          >
            {milestone.status === 'completed' && (
              <Check className="w-3 h-3 text-primary-foreground" />
            )}
            {milestone.status === 'active' && (
              <Clock className="w-3 h-3 text-primary" />
            )}
            {milestone.status === 'pending' && (
              <Circle className="w-3 h-3 text-muted-foreground" />
            )}
          </div>

          {/* Content */}
          <div
            className={cn(
              'glass-card p-4',
              milestone.status === 'active' && 'border-primary/30',
              milestone.status === 'pending' && 'opacity-60'
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h4
                  className={cn(
                    'font-medium',
                    milestone.status === 'completed' && 'text-foreground',
                    milestone.status === 'active' && 'text-primary',
                    milestone.status === 'pending' && 'text-muted-foreground'
                  )}
                >
                  {milestone.title}
                </h4>
                <p className="text-sm text-muted-foreground mt-1">
                  {milestone.description}
                </p>
              </div>
              {milestone.completedAt && (
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {format(new Date(milestone.completedAt), 'MMM d')}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default MilestoneTimeline;

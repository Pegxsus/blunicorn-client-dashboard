import { Deliverable } from '@/types';
import { Button } from '@/components/ui/button';
import { Download, Lock, FileJson, FileText, PlayCircle, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DeliverablesListProps {
  deliverables: Deliverable[];
  projectReady: boolean;
}

const typeIcons = {
  workflow: FileJson,
  documentation: FileText,
  guide: BookOpen,
  video: PlayCircle,
};

const typeLabels = {
  workflow: 'n8n Workflow',
  documentation: 'Documentation',
  guide: 'Setup Guide',
  video: 'Video Walkthrough',
};

const DeliverablesList = ({ deliverables, projectReady }: DeliverablesListProps) => {
  const handleDownload = (deliverable: Deliverable) => {
    // In production, this would trigger a secure download
    console.log('Downloading:', deliverable.name);
    
    if (deliverable.type === 'video' && deliverable.url.startsWith('http')) {
      window.open(deliverable.url, '_blank');
    } else {
      // Simulate download
      const link = document.createElement('a');
      link.href = deliverable.url;
      link.download = deliverable.name;
      link.click();
    }
  };

  return (
    <div className="space-y-3">
      {deliverables.map((deliverable) => {
        const Icon = typeIcons[deliverable.type];
        const isLocked = deliverable.locked && !projectReady;

        return (
          <div
            key={deliverable.id}
            className={cn(
              'flex items-center justify-between p-4 rounded-lg border transition-all duration-200',
              isLocked
                ? 'bg-muted/30 border-border opacity-60'
                : 'glass-card hover:border-primary/30'
            )}
          >
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center',
                  isLocked ? 'bg-muted' : 'bg-primary/10'
                )}
              >
                {isLocked ? (
                  <Lock className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <Icon className="w-5 h-5 text-primary" />
                )}
              </div>
              <div>
                <h4 className="font-medium text-foreground">{deliverable.name}</h4>
                <p className="text-sm text-muted-foreground">
                  {typeLabels[deliverable.type]}
                </p>
              </div>
            </div>

            <Button
              variant={isLocked ? 'outline' : 'default'}
              size="sm"
              disabled={isLocked}
              onClick={() => handleDownload(deliverable)}
              className={cn(isLocked && 'cursor-not-allowed')}
            >
              {isLocked ? (
                <>
                  <Lock className="w-4 h-4 mr-1" />
                  Locked
                </>
              ) : deliverable.type === 'video' ? (
                <>
                  <PlayCircle className="w-4 h-4 mr-1" />
                  Watch
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-1" />
                  Download
                </>
              )}
            </Button>
          </div>
        );
      })}

      {deliverables.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No deliverables yet</p>
          <p className="text-sm">Files will appear here once ready</p>
        </div>
      )}
    </div>
  );
};

export default DeliverablesList;

import { useState } from 'react';
import { Feedback } from '@/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface FeedbackSectionProps {
  feedback: Feedback[];
  revisionCount: number;
  onSubmit?: (message: string) => void;
}

const FeedbackSection = ({ feedback, revisionCount, onSubmit }: FeedbackSectionProps) => {
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();

  const handleSubmit = async () => {
    if (!message.trim()) return;

    setIsSubmitting(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 500));
    
    if (onSubmit) {
      onSubmit(message);
    }
    
    setMessage('');
    setIsSubmitting(false);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* Revision indicator */}
      {revisionCount > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
          <MessageSquare className="w-4 h-4 text-primary" />
          <span className="text-sm">
            <span className="font-medium text-primary">{revisionCount}</span>
            <span className="text-muted-foreground">
              {' '}revision{revisionCount !== 1 ? 's' : ''} on this project
            </span>
          </span>
        </div>
      )}

      {/* Feedback thread */}
      <div className="space-y-4">
        {feedback.map((item) => {
          const isCurrentUser = item.author === user?.name;

          return (
            <div
              key={item.id}
              className={`flex gap-3 ${isCurrentUser ? 'flex-row-reverse' : ''}`}
            >
              <Avatar className="w-8 h-8 shrink-0">
                <AvatarFallback
                  className={`text-xs ${
                    isCurrentUser
                      ? 'bg-primary/10 text-primary'
                      : 'bg-secondary/30 text-secondary'
                  }`}
                >
                  {getInitials(item.author)}
                </AvatarFallback>
              </Avatar>
              <div
                className={`max-w-[80%] ${isCurrentUser ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`rounded-lg px-4 py-3 ${
                    isCurrentUser
                      ? 'bg-primary text-primary-foreground rounded-tr-none'
                      : 'bg-muted rounded-tl-none'
                  }`}
                >
                  <p className="text-sm">{item.message}</p>
                </div>
                <div
                  className={`flex items-center gap-2 mt-1 text-xs text-muted-foreground ${
                    isCurrentUser ? 'justify-end' : ''
                  }`}
                >
                  <span>{item.author}</span>
                  <span>•</span>
                  <span>{format(new Date(item.createdAt), 'MMM d, h:mm a')}</span>
                </div>
              </div>
            </div>
          );
        })}

        {feedback.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No feedback yet</p>
            <p className="text-sm">Start the conversation below</p>
          </div>
        )}
      </div>

      {/* New feedback input */}
      <div className="flex gap-3">
        <Textarea
          placeholder="Add your feedback or request changes..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="min-h-[80px] resize-none"
        />
        <Button
          onClick={handleSubmit}
          disabled={!message.trim() || isSubmitting}
          size="icon"
          className="h-auto"
        >
          <Send className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
};

export default FeedbackSection;

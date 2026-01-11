import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';

interface FeedbackSectionProps {
  revisionCount: number;
}

interface FeedbackItem {
  id: string;
  message: string;
  created_at: string;
  author_id: string;
  author_name?: string;
  author_avatar?: string;
}

const FeedbackSection = ({ revisionCount }: FeedbackSectionProps) => {
  const { id: projectId } = useParams(); // Route uses :id, so we alias it to projectId
  const [messages, setMessages] = useState<FeedbackItem[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, profile, role } = useAuth();

  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'User';

  useEffect(() => {
    if (!projectId) return;

    // Fetch initial messages
    const fetchMessages = async () => {
      if (!projectId) return;

      // First fetch messages
      const { data: feedbackData, error: feedbackError } = await supabase
        .from('project_feedback' as any)
        .select(`
        id,
        message,
        created_at,
        author_id
      `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

      if (feedbackError) {
        console.error('Error fetching feedback:', feedbackError);
        return;
      }

      if (!feedbackData || feedbackData.length === 0) {
        setMessages([]);
        return;
      }

      // Then fetch profiles for these authors
      const authorIds = [...new Set(feedbackData.map((msg: any) => msg.author_id))];
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', authorIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
      }

      // Create a map of authorId -> profile
      const profileMap = new Map();
      if (profilesData) {
        profilesData.forEach(p => profileMap.set(p.id, p));
      }

      // Combine data
      const combinedMessages = feedbackData.map((msg: any) => {
        const authorProfile = profileMap.get(msg.author_id);
        return {
          ...msg,
          author_name: authorProfile?.display_name || 'User',
          author_avatar: authorProfile?.avatar_url
        };
      });

      setMessages(combinedMessages);
    };

    fetchMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel('feedback-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'project_feedback',
          filter: `project_id=eq.${projectId}`,
        },
        async (payload) => {
          await fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);

  const handleSubmit = async () => {
    if (!newMessage.trim() || !user || !projectId) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('project_feedback' as any)
        .insert({
          project_id: projectId,
          author_id: user.id,
          message: newMessage.trim()
        });

      if (error) throw error;

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAll = async () => {
    if (!projectId || role !== 'admin') return;

    if (!confirm('Are you sure you want to delete all conversation history? This cannot be undone.')) return;

    try {
      const { error } = await supabase
        .from('project_feedback' as any)
        .delete()
        .eq('project_id', projectId);

      if (error) throw error;

      setMessages([]);
      toast.success('Conversation cleared');
    } catch (error) {
      console.error('Error deleting feedback:', error);
      toast.error('Failed to clear conversation');
    }
  };

  const getInitials = (name?: string) => {
    return (name || 'U')
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  // Helper to check if message is from current user
  // This helps simple UI logic even without joining profiles table for every single author name
  const isOwnMessage = (authorId: string) => user?.id === authorId;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">
          Feedback & Revisions
        </h3>

        {role === 'admin' && messages.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDeleteAll}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            Clear Conversation
          </Button>
        )}
      </div>

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
      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
        {messages.map((item) => {
          const isCurrentUser = isOwnMessage(item.author_id);
          // Ideally we would fetch the author's name, but for this MVP we can show 'Me' or 'Client/Admin'
          // Since we don't have the joined profile readily available in the real-time payload without complex logic,
          // we'll simplify: if it's me -> Me. If not me -> Admin (or Client depending on viewer)
          const authorLabel = isCurrentUser ? displayName : 'Admin'; // Assumption: mostly User <-> Admin chat

          return (
            <div
              key={item.id}
              className={`flex gap-3 ${isCurrentUser ? 'flex-row-reverse' : ''}`}
            >
              <Avatar className="w-8 h-8 shrink-0">
                <AvatarFallback
                  className={`text-xs ${isCurrentUser
                    ? 'bg-primary/10 text-primary'
                    : 'bg-secondary/30 text-secondary'
                    }`}
                >
                  {getInitials(authorLabel)}
                </AvatarFallback>
              </Avatar>
              <div
                className={`max-w-[80%] ${isCurrentUser ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`rounded-lg px-4 py-3 ${isCurrentUser
                    ? 'bg-primary text-primary-foreground rounded-tr-none'
                    : 'bg-muted rounded-tl-none'
                    }`}
                >
                  <p className="text-sm">{item.message}</p>
                </div>
                <div
                  className={`flex items-center gap-2 mt-1 text-xs text-muted-foreground ${isCurrentUser ? 'justify-end' : ''
                    }`}
                >
                  <span>{authorLabel}</span>
                  <span>•</span>
                  <span>{format(new Date(item.created_at), 'MMM d, h:mm a')}</span>
                </div>
              </div>
            </div>
          );
        })}

        {messages.length === 0 && (
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
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          className="min-h-[80px] resize-none"
        />
        <Button
          onClick={handleSubmit}
          disabled={!newMessage.trim() || isSubmitting}
          size="icon"
          className="w-10 h-10 shrink-0"
        >
          <Send className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
};

export default FeedbackSection;

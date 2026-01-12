import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { user, profile, role } = useAuth();

  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'User';

  const playMessageSound = () => {
    try {
      const audio = new Audio('/notification.mp3');
      audio.play().catch(e => console.log('Audio play failed', e));
    } catch (e) {
      console.error('Audio setup failed', e);
    }
  };

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
      .select('user_id, display_name, avatar_url')
      .in('user_id', authorIds); // Changed from 'id' to 'user_id'

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
    }

    console.log('📝 Author IDs to fetch:', authorIds);
    console.log('📝 Profiles fetched from DB:', profilesData);

    // Create a map of authorId -> profile
    const profileMap = new Map();
    if (profilesData) {
      profilesData.forEach(p => {
        console.log(`  Profile for user ${p.user_id}:`, {
          display_name: p.display_name,
          avatar_url: p.avatar_url
        });
        profileMap.set(p.user_id, p); // Changed from p.id to p.user_id
      });
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
    console.log('Fetched messages with profiles:', combinedMessages);
  };

  useEffect(() => {
    if (!projectId) return;

    // Fetch initial messages
    fetchMessages();

    // Subscribe to new messages (real-time)
    const channel = supabase
      .channel(`feedback-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'project_feedback',
          filter: `project_id=eq.${projectId}`,
        },
        async (payload) => {
          console.log('Real-time INSERT detected:', payload);
          // Play sound for new messages from other users
          if (payload.new && payload.new.author_id !== user?.id) {
            playMessageSound();
          }
          await fetchMessages();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'project_feedback',
          filter: `project_id=eq.${projectId}`,
        },
        async (payload) => {
          console.log('Real-time DELETE detected:', payload);
          await fetchMessages();
        }
      )
      .subscribe((status) => {
        console.log('Feedback subscription status:', status);
      });

    // Polling fallback - check for new messages every 3 seconds
    // This ensures messages appear even if real-time subscription fails
    const pollingInterval = setInterval(() => {
      fetchMessages();
    }, 3000); // 3 seconds

    return () => {
      console.log('Cleaning up feedback channel');
      supabase.removeChannel(channel);
      clearInterval(pollingInterval);
    };
  }, [projectId]); // fetchMessages is stable due to useCallback, no need in deps

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

      // Clear input
      setNewMessage('');

      // Manually refetch to ensure message appears immediately
      // (Real-time subscription might have delays or connection issues)
      await fetchMessages();
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAll = async () => {
    if (!projectId || role !== 'admin') return;

    try {
      const { error } = await supabase
        .from('project_feedback' as any)
        .delete()
        .eq('project_id', projectId);

      if (error) throw error;

      setMessages([]);
      toast.success('Conversation cleared');
      setIsDeleteDialogOpen(false);
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
          <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                Clear Conversation
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete all conversation history for this project.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAll}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  Delete Everything
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
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
          const authorLabel = item.author_name || 'User';

          return (
            <div
              key={item.id}
              className={`flex gap-3 ${isCurrentUser ? 'flex-row-reverse' : ''}`}
            >
              <Avatar className="w-8 h-8 shrink-0">
                <AvatarImage src={item.author_avatar} alt={authorLabel} />
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
                  <p className="text-sm whitespace-pre-wrap">
                    {(() => {
                      const urlRegex = /(https?:\/\/[^\s]+)/g;
                      const parts = item.message.split(urlRegex);
                      return parts.map((part, i) => {
                        if (part.match(urlRegex)) {
                          return (
                            <a
                              key={i}
                              href={part}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-green-500 underline hover:no-underline break-all"
                            >
                              {part}
                            </a>
                          );
                        }
                        return part;
                      });
                    })()}
                  </p>
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
      <div className="flex gap-3 items-end">
        <Textarea
          placeholder="Add your feedback or request changes..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          className="min-h-[80px] resize-none flex-1"
        />
        <Button
          onClick={handleSubmit}
          disabled={!newMessage.trim() || isSubmitting}
          size="icon"
          className="w-12 h-12 rounded-full shrink-0"
        >
          <Send className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
};

export default FeedbackSection;

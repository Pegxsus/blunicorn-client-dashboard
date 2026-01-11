import { ReactNode, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  FolderOpen,
  Settings,
  LogOut,
  Bell,
  Menu,
  X,
  ChevronDown,
  Shield,
} from 'lucide-react';
import logo from '@/assets/logo.png';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
// import { mockNotifications } from '@/lib/mock-data'; // Removed mock data usage

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { user, profile, role, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;

    // Fetch initial notifications
    const fetchNotifications = async () => {
      const { data } = await supabase
        .from('notifications' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (data) setNotifications(data);
    };

    fetchNotifications();

    // Subscribe to real-time changes
    const channel = supabase
      .channel('notifications-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setNotifications((prev) => [payload.new, ...prev]);
            playNotificationSound();
          } else if (payload.eventType === 'UPDATE') {
            setNotifications((prev) =>
              prev.map((n) => (n.id === payload.new.id ? payload.new : n))
            );
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Subscribed to notifications');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const playNotificationSound = () => {
    // Professional "Ping" sound (Base64)
    const audio = new Audio("data:audio/mp3;base64,SUQzBAAAAAABAFRYVFgAAAASAAADbWFqb3JfYnJhbmQAbXA0MgBUWFJYAAAAEQAAA21pbm9yX3ZlcnNpb24AMABUWFJYAAAAIAAAA2NvbXBhdGlibGVfYnJhbmRzAGlzb21tcDQyAP/7UAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAInfoAAAApV1111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111/7UAAAAAAAADAAJAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABMYXZjNTguNTQuMTAwWAQAAAAAAABABAAAAAAAAAABAAAAHwAAAAEAAADnAAAAAQAAAAAAAAAAAP/7UAAAABqQcQYA8AAACyBw5gDwAAAEVFBEAAAGYABAAAAAAAAAAAAAAIAGYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAASAAKoKj444wGDAwMDAYGDAwMDAYGDAwMDAYGDAwMDAYGDAwMDAYGDAwMDAYGDAwMDAYGDAwMDAYGDAwMDAYGDAwMDAYGDAwMDAYGDAwMDAYGDAwMDAYGDAwMDAYGDAwMDAYGDAwMDAYGDAwMDAYGDAwMDAYGDAwMDAYGDAwMDAYGDAwMDAYGDAwMDAYGDAwMDAYGDAwMDAYGDAwMDAYGDAwMDAYGDAwMDCQ5T//7UAAAAA8gAPIALQAIAAAOgBAAAAAEEFCRwAAAO8ABAAAAABAAEAEAAgEAEAAQAAgAAAABQASAAAAEAAQAAAAAAgAAAAAAAAAAAAAAAgEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAKgunjjjAYMDAwMBgYMDAwMBgYMDAwMBgYMDAwMBgYMDAwMBgYMDAwMBgYMDAwMBgYMDAwMBgYMDAwMBgYMDAwMBgYMDAwMBgYMDAwMBgYMDAwMBgYMDAwMBgYMDAwMBgYMDAwMBgYMDAwMBgYMDAwMBgYMDAwMBgYMDAwMBgYMDAwMBgYMDAwMBgYMDAwMBgYMDAwMBgYMDAwMBgYMDAwMBgYMDAwMAAD/+5AAAEAAAEAAAAABAAAEAAAAABAAAI1gAAAAAAjWAAAAAAACgAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/7UAAAAAAIAAIAAAAAAAgAAABAAAAALAAKquAAAAAAqq4AAAAAACgAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//7UAAAAAAIAAIAAAAAAAgAAABAAAAALAAKy2AAAAAArLYAAAAAACgAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//7UAAAAAAIAAIAAAAAAAgAAABAAAAALAAK64AAAAAArrgAAAAAACgAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//7UAAAAAAIAAIAAAAAAAgAAABAAAAALAAK64AAAAAArrgAAAAAACgAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//7UAAAAAAIAAIAAAAAAAgAAABAAAAALAAK64AAAAAArrgAAAAAACgAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//7UAAAAAAIAAIAAAAAAAgAAABAAAAALAAK64AAAAAArrgAAAAAACgAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//7UAAAAAAIAAIAAAAAAAgAAABAAAAALAAK64AAAAAArrgAAAAAACgAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//7UAAAAAAIAAIAAAAAAAgAAABAAAAALAAK64AAAAAArrgAAAAAACgAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//7UAAAAAAIAAIAAAAAAAgAAABAAAAALAAK64AAAAAArrgAAAAAACgAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//7UAAAAAAIAAIAAAAAAAgAAABAAAAALAAK64AAAAAArrgAAAAAACgAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//7UAAAAAAIAAIAAAAAAAgAAABAAAAALAAK64AAAAAArrgAAAAAACgAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//7UAAAAAAIAAIAAAAAAAgAAABAAAAALAAK64AAAAAArrgAAAAAACgAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//7UAAAAAAIAAIAAAAAAAgAAABAAAAALAAK64AAAAAArrgAAAAAACgAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//7UAAAAAAIAAIAAAAAAAgAAABAAAAALAAK64AAAAAArrgAAAAAACgAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");
    audio.volume = 0.5;
    audio.play().catch(e => console.error("Error playing sound:", e));
  };

  const markAsRead = async (id: string) => {
    if (!id) return;
    try {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );

      const { error } = await supabase
        .from('notifications' as any)
        .update({ read: true })
        .eq('id', id);

      if (error) {
        console.error('Error marking notification as read:', error);
      }
    } catch (e) {
      console.error('Exception in markAsRead', e);
    }
  };

  const clearAllNotifications = async () => {
    if (notifications.length === 0) return;

    // Optimistic update - clear list immediately
    setNotifications([]);

    try {
      const { error } = await supabase
        .from('notifications' as any)
        .delete()
        .eq('user_id', user?.id);

      if (error) {
        console.error('Error clearing notifications:', error);
        // We could revert here, but for 'clear all' silent failure is often acceptable or we just fetch again
        // fetchNotifications();
      }
    } catch (e) {
      console.error('Exception in clearAllNotifications', e);
    }
  };

  const unreadNotifications = notifications.filter(n => !n.read).length;

  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'User';

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    {
      name: 'Projects',
      href: '/projects',
      icon: FolderOpen,
      badge: unreadNotifications > 0 ? unreadNotifications : undefined
    },
    ...(role === 'admin'
      ? [{ name: 'Admin', href: '/admin', icon: Shield }]
      : []),
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-60 transform bg-sidebar border-r border-sidebar-border transition-transform duration-200 ease-in-out lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-14 items-center justify-between px-4 border-b border-sidebar-border">
            <Link to="/dashboard" className="flex items-center gap-2.5">
              <img src={logo} alt="Blunicorn" className="w-8 h-8 object-contain rounded-lg" />
              <span className="text-sm font-semibold text-foreground">Blunicorn</span>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden h-8 w-8"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-0.5 p-3">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href ||
                (item.href !== '/dashboard' && location.pathname.startsWith(item.href));

              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors relative',
                    isActive
                      ? 'bg-muted text-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="w-4 h-4" />
                  <span className="flex-1">{item.name}</span>
                  {item.badge !== undefined && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className="p-3 border-t border-sidebar-border">
            <div className="flex items-center gap-2.5">
              <Avatar className="w-8 h-8">
                <AvatarImage src={profile?.avatar_url || ''} />
                <AvatarFallback className="bg-muted text-foreground text-xs">
                  {getInitials(displayName)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {displayName}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {role === 'admin' ? 'Administrator' : 'Client'}
                </p>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleLogout}>
                <LogOut className="w-4 h-4 text-muted-foreground" />
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-60">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 sm:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden h-8 w-8"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-4 h-4" />
          </Button>

          <div className="flex-1" />

          <div className="flex items-center gap-2">
            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="w-5 h-5" />
                  {unreadNotifications > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary text-[10px] font-medium flex items-center justify-center text-primary-foreground">
                      {unreadNotifications}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <div className="px-4 py-3 border-b border-border">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Notifications</h3>
                    {notifications.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-6 px-2 text-muted-foreground hover:text-destructive"
                        onClick={clearAllNotifications}
                      >
                        Clear all
                      </Button>
                    )}
                  </div>
                </div>
                <div className="max-h-[300px] overflow-y-auto">
                  {notifications.length > 0 ? (
                    notifications.map((notification) => (
                      <DropdownMenuItem
                        key={notification.id}
                        className="flex flex-col items-start p-4 cursor-pointer"
                        onClick={() => {
                          if (!notification.read) {
                            markAsRead(notification.id);
                          }
                          if (notification.project_id) {
                            // Navigate to feedback tab if it's a feedback notification
                            const isFeedbackNotification = notification.title?.toLowerCase().includes('feedback');
                            const route = `/projects/${notification.project_id}`;
                            navigate(route);

                            // After navigation, switch to feedback tab if needed
                            if (isFeedbackNotification) {
                              // Small delay to ensure the page loads first
                              setTimeout(() => {
                                const feedbackTab = document.querySelector('[value="feedback"]') as HTMLElement;
                                feedbackTab?.click();
                              }, 100);
                            }
                          }
                        }}
                      >
                        <div className="flex items-center gap-2 w-full">
                          <span className={cn(
                            'font-medium text-sm',
                            !notification.read && 'text-primary'
                          )}>
                            {notification.title}
                          </span>
                          {!notification.read && (
                            <span className="w-2 h-2 rounded-full bg-primary ml-auto" />
                          )}
                        </div>
                        <span className="text-sm text-muted-foreground mt-1">
                          {notification.message}
                        </span>
                      </DropdownMenuItem>
                    ))
                  ) : (
                    <div className="p-4 text-center text-muted-foreground text-sm">
                      No notifications
                    </div>
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* User menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2">
                  <Avatar className="w-7 h-7">
                    <AvatarImage src={profile?.avatar_url || ''} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {getInitials(displayName)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline-block text-sm font-medium">
                    {displayName}
                  </span>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate('/settings')}>
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
};

export default DashboardLayout;

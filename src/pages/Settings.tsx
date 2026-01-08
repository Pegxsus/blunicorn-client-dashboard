import { useTheme } from 'next-themes';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { User, Bell, Shield, Palette } from 'lucide-react';

const Settings = () => {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl space-y-8 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage your account preferences and notifications
          </p>
        </div>

        {/* Profile Section */}
        <section className="glass-card p-6 space-y-6">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">Profile</h2>
          </div>
          <Separator />

          <div className="flex items-center gap-6">
            <Avatar className="w-20 h-20">
              <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                {user ? getInitials(user.name) : '??'}
              </AvatarFallback>
            </Avatar>
            <div>
              <Button variant="outline" size="sm">
                Change Photo
              </Button>
              <p className="text-sm text-muted-foreground mt-2">
                JPG, PNG or GIF. Max 2MB.
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" defaultValue={user?.name} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" defaultValue={user?.email} />
            </div>
          </div>

          <Button>Save Changes</Button>
        </section>

        {/* Notifications Section */}
        <section className="glass-card p-6 space-y-6">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">Notifications</h2>
          </div>
          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Email Notifications</p>
                <p className="text-sm text-muted-foreground">
                  Receive updates about your projects via email
                </p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Project Updates</p>
                <p className="text-sm text-muted-foreground">
                  Get notified when milestones are completed
                </p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Deliverable Ready</p>
                <p className="text-sm text-muted-foreground">
                  Get notified when deliverables are available for download
                </p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Feedback Responses</p>
                <p className="text-sm text-muted-foreground">
                  Get notified when you receive a response
                </p>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
        </section>

        {/* Security Section */}
        <section className="glass-card p-6 space-y-6">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">Security</h2>
          </div>
          <Separator />

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <Input id="current-password" type="password" />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input id="new-password" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input id="confirm-password" type="password" />
              </div>
            </div>
            <Button>Update Password</Button>
          </div>
        </section>

        {/* Appearance Section */}
        <section className="glass-card p-6 space-y-6">
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">Appearance</h2>
          </div>
          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Dark Mode</p>
              <p className="text-sm text-muted-foreground">
                Toggle between light and dark theme
              </p>
            </div>
            <Switch 
              checked={theme === 'dark'} 
              onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
            />
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
};

export default Settings;

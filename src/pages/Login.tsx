import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, Mail, Lock, Eye, EyeOff, ArrowLeft, Sun, Moon } from 'lucide-react';

// Blunicorn Logo SVG Component
const BlunicornLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 40 40" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <path
      d="M20 4L4 12V28L20 36L36 28V12L20 4Z"
      fill="url(#logo-gradient)"
      fillOpacity="0.2"
      stroke="url(#logo-gradient)"
      strokeWidth="1.5"
    />
    <path
      d="M20 8L28 12.5V18L20 22.5L12 18V12.5L20 8Z"
      fill="url(#logo-gradient)"
    />
    <path
      d="M20 22.5V32M12 18L6 21.5M28 18L34 21.5"
      stroke="url(#logo-gradient)"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <defs>
      <linearGradient id="logo-gradient" x1="4" y1="4" x2="36" y2="36" gradientUnits="userSpaceOnUse">
        <stop stopColor="#60A5FA" />
        <stop offset="1" stopColor="#A78BFA" />
      </linearGradient>
    </defs>
  </svg>
);

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const { login, isLoading } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    const result = await login(email, password);
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error || 'Login failed');
    }
  };

  const handleDemoLogin = async (role: 'client' | 'admin') => {
    const demoCredentials = {
      client: { email: 'client@example.com', password: 'demo123' },
      admin: { email: 'admin@blunicorn.org', password: 'demo123' },
    };
    
    const result = await login(demoCredentials[role].email, demoCredentials[role].password);
    if (result.success) {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen mesh-gradient grid-overlay flex flex-col">
      {/* Top Bar with Back + Theme Toggle */}
      <div className="p-6 flex items-center justify-between">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>
        
        {/* Theme Toggle */}
        <div className="flex items-center gap-3">
          <Sun className="w-4 h-4 text-muted-foreground" />
          <Switch
            checked={theme === 'dark'}
            onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
          />
          <Moon className="w-4 h-4 text-muted-foreground" />
        </div>
      </div>

      {/* Centered Auth Card */}
      <div className="flex-1 flex items-center justify-center p-6 -mt-16">
        <div className="w-full max-w-md animate-scale-in">
          <div className="auth-card p-8 space-y-8">
            {/* Logo & Header */}
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-3">
                <BlunicornLogo className="w-10 h-10" />
                <span className="text-xl font-bold text-foreground">Blunicorn</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Welcome back</h1>
                <p className="text-muted-foreground mt-1">
                  Enter your credentials to access your account
                </p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="input-with-icon">
                  <Mail className="input-icon" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="input-with-icon">
                  <Lock className="input-icon" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    className="pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="input-action text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <a 
                  href="#" 
                  className="text-sm text-primary hover:underline"
                >
                  Forgot password?
                </a>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm text-center">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-3 text-muted-foreground">Or continue with</span>
              </div>
            </div>

            {/* Social Login */}
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full gap-3"
              onClick={() => handleDemoLogin('client')}
              disabled={isLoading}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </Button>

            {/* Demo Access (for testing) */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleDemoLogin('client')}
                disabled={isLoading}
                className="text-xs"
              >
                Demo: Client
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleDemoLogin('admin')}
                disabled={isLoading}
                className="text-xs"
              >
                Demo: Admin
              </Button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

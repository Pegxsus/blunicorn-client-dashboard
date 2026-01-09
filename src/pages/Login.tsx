import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Mail, Lock, Eye, EyeOff, ArrowLeft, User } from 'lucide-react';
import logo from '@/assets/logo.png';
import { z } from 'zod';

const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const { signIn, signUp, signInWithGoogle, isLoading, user } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate inputs
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      setError(emailResult.error.errors[0].message);
      return;
    }

    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      setError(passwordResult.error.errors[0].message);
      return;
    }

    if (isSignUp) {
      const result = await signUp(email, password, displayName || undefined);
      if (result.success) {
        navigate('/dashboard');
      } else {
        setError(result.error || 'Sign up failed');
      }
    } else {
      const result = await signIn(email, password);
      if (result.success) {
        navigate('/dashboard');
      } else {
        setError(result.error || 'Sign in failed');
      }
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setIsGoogleLoading(true);
    const result = await signInWithGoogle();
    if (!result.success) {
      setError(result.error || 'Google sign in failed');
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[128px] animate-[float_8s_ease-in-out_infinite]" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-secondary/15 rounded-full blur-[100px] animate-[float_10s_ease-in-out_infinite_reverse]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[150px] animate-[pulse_6s_ease-in-out_infinite]" />
        <div className="absolute inset-0 bg-[linear-gradient(hsl(var(--border)/0.03)_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border)/0.03)_1px,transparent_1px)] bg-[size:64px_64px]" />
      </div>

      {/* Top Bar */}
      <div className="p-4 border-b border-border opacity-0 animate-fade-in">
        <Link 
          to="/" 
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-all duration-300 hover:-translate-x-1"
        >
          <ArrowLeft className="w-3.5 h-3.5 transition-transform duration-300 group-hover:-translate-x-1" />
          Back
        </Link>
      </div>

      {/* Centered Auth Card */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="auth-card p-6 space-y-6 opacity-0 animate-blur-in hover-lift">
            {/* Logo & Header */}
            <div className="text-center space-y-3">
              <div className="flex items-center justify-center gap-2 opacity-0 animate-bounce-in delay-100">
                <img src={logo} alt="Blunicorn" className="w-8 h-8 object-contain rounded-lg transition-transform duration-300 hover:scale-110 hover:rotate-6" />
                <span className="text-base font-semibold text-foreground">Blunicorn</span>
              </div>
              <div className="opacity-0 animate-slide-up delay-200">
                <h1 className="text-lg font-semibold text-foreground">
                  {isSignUp ? 'Create an account' : 'Welcome back'}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {isSignUp ? 'Enter your details to get started' : 'Enter your credentials to continue'}
                </p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignUp && (
                <div className="space-y-1.5 opacity-0 animate-slide-up delay-300">
                  <Label htmlFor="displayName" className="text-xs">Display Name</Label>
                  <div className="input-with-icon group">
                    <User className="input-icon transition-colors duration-300 group-focus-within:text-primary" />
                    <Input
                      id="displayName"
                      type="text"
                      placeholder="Your name"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      autoComplete="name"
                      className="h-9 transition-all duration-300 focus:shadow-[0_0_20px_-5px_hsl(var(--primary)/0.3)]"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5 opacity-0 animate-slide-up delay-300">
                <Label htmlFor="email" className="text-xs">Email</Label>
                <div className="input-with-icon group">
                  <Mail className="input-icon transition-colors duration-300 group-focus-within:text-primary" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    className="h-9 transition-all duration-300 focus:shadow-[0_0_20px_-5px_hsl(var(--primary)/0.3)]"
                  />
                </div>
              </div>

              <div className="space-y-1.5 opacity-0 animate-slide-up delay-400">
                <Label htmlFor="password" className="text-xs">Password</Label>
                <div className="input-with-icon group">
                  <Lock className="input-icon transition-colors duration-300 group-focus-within:text-primary" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={isSignUp ? 'new-password' : 'current-password'}
                    className="pr-11 h-9 transition-all duration-300 focus:shadow-[0_0_20px_-5px_hsl(var(--primary)/0.3)]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="input-action text-muted-foreground hover:text-foreground transition-all duration-300 hover:scale-110"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {!isSignUp && (
                <div className="flex justify-end opacity-0 animate-fade-in delay-500">
                  <a 
                    href="#" 
                    className="text-xs text-muted-foreground hover:text-foreground transition-all duration-300 hover:translate-x-0.5"
                  >
                    Forgot password?
                  </a>
                </div>
              )}

              {error && (
                <div className="p-2.5 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-xs text-center animate-scale-in">
                  {error}
                </div>
              )}

              <div className="opacity-0 animate-slide-up delay-500">
                <Button
                  type="submit"
                  className="w-full transition-all duration-300 hover:shadow-[0_0_30px_-5px_hsl(var(--primary)/0.5)] hover:scale-[1.02] active:scale-[0.98]"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    isSignUp ? 'Create Account' : 'Sign In'
                  )}
                </Button>
              </div>

              {/* Divider */}
              <div className="relative opacity-0 animate-fade-in delay-600">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                </div>
              </div>

              {/* Google Sign In */}
              <div className="opacity-0 animate-slide-up delay-700">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full group transition-all duration-300 hover:shadow-[0_0_25px_-5px_hsl(var(--primary)/0.3)] hover:border-primary/50 active:scale-[0.98]"
                  onClick={handleGoogleSignIn}
                  disabled={isGoogleLoading || isLoading}
                >
                  {isGoogleLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2 transition-transform duration-300 group-hover:scale-110" viewBox="0 0 24 24">
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
                    </>
                  )}
                </Button>
              </div>
            </form>

          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

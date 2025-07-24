import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { Eye, EyeOff, User, Mail, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useScrollToTop } from '@/hooks/use-scroll-to-top';

export default function Login() {
  const [location, setLocation] = useLocation();
  const isSignup = location === '/signup';
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    rememberMe: false,
  });
  const { toast } = useToast();
  
  // Scroll to top when component mounts
  useScrollToTop();

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isSignup) {
        if (formData.password !== formData.confirmPassword) {
          toast({
            title: "Password Mismatch",
            description: "Passwords do not match. Please try again.",
            variant: "destructive",
          });
          return;
        }

        const response = await apiRequest('POST', '/api/auth/register', {
          username: formData.username,
          email: formData.email,
          password: formData.password,
        });
        
        toast({
          title: "Account Created",
          description: "Your account has been created successfully!",
        });
        
        // Redirect to home page after successful registration
        setLocation('/');
      } else {
        const response = await apiRequest('POST', '/api/auth/login', {
          username: formData.username,
          password: formData.password,
        });
        
        toast({
          title: "Welcome Back",
          description: "You have been logged in successfully!",
        });
        
        // Redirect to home page after successful login
        setLocation('/');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="pt-16 bg-[var(--dark-gray)] min-h-screen">
      <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="card-dark p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-[var(--accent-purple)] rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              {isSignup ? 'Create Account' : 'Welcome Back'}
            </h1>
            <p className="text-gray-300">
              {isSignup 
                ? 'Join BroLab Entertainment and start your musical journey' 
                : 'Sign in to access your beats and downloads'
              }
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username - only show for signup */}
            {isSignup && (
              <div>
                <label className="form-label">Username *</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    type="text"
                    required
                    value={formData.username}
                    onChange={(e) => handleInputChange('username', e.target.value)}
                    className="pl-10 form-input"
                    placeholder="Enter your username"
                  />
                </div>
              </div>
            )}

            {/* Email - only for signup */}
            {isSignup && (
              <div>
                <label className="form-label">Email *</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="pl-10 form-input"
                    placeholder="Enter your email"
                  />
                </div>
              </div>
            )}

            {/* Username for login, or keep for signup */}
            {!isSignup && (
              <div>
                <label className="form-label">Username *</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    type="text"
                    required
                    value={formData.username}
                    onChange={(e) => handleInputChange('username', e.target.value)}
                    className="pl-10 form-input"
                    placeholder="Enter your username"
                  />
                </div>
              </div>
            )}

            {/* Password */}
            <div>
              <label className="form-label">Password *</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className="pl-10 pr-10 form-input"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password (only for signup) */}
            {isSignup && (
              <div>
                <label className="form-label">Confirm Password *</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    className="pl-10 form-input"
                    placeholder="Confirm your password"
                  />
                </div>
              </div>
            )}

            {/* Remember Me (only for login) */}
            {!isSignup && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember-me"
                  checked={formData.rememberMe}
                  onCheckedChange={(checked) => handleInputChange('rememberMe', checked as boolean)}
                />
                <label htmlFor="remember-me" className="text-gray-300 text-sm cursor-pointer">
                  Remember me for 30 days
                </label>
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full btn-primary text-lg py-4"
            >
              {isLoading ? (
                <>
                  <div className="loading-spinner mr-2" />
                  {isSignup ? 'Creating Account...' : 'Signing In...'}
                </>
              ) : (
                isSignup ? 'Create Account' : 'Sign In'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-300">
              {isSignup ? 'Already have an account?' : "Don't have an account?"}
              {' '}
              <Link href={isSignup ? '/login' : '/signup'} className="text-[var(--accent-purple)] hover:text-purple-400 font-medium">
                {isSignup ? 'Sign In' : 'Sign Up'}
              </Link>
            </p>
          </div>

          {!isSignup && (
            <div className="mt-4 text-center">
              <a href="#" className="text-[var(--accent-purple)] hover:text-purple-400 text-sm">
                Forgot your password?
              </a>
            </div>
          )}

          {isSignup && (
            <div className="mt-6 text-center">
              <p className="text-gray-400 text-xs">
                By creating an account, you agree to our{' '}
                <a href="#" className="text-[var(--accent-purple)] hover:underline">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="#" className="text-[var(--accent-purple)] hover:underline">
                  Privacy Policy
                </a>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

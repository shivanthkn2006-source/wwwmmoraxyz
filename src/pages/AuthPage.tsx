import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import { Eye, EyeOff, ScanFace, Mic } from 'lucide-react';
import { z } from 'zod';
import { cn } from '@/lib/utils';
import FaceLoginModal from '@/components/FaceLoginModal';
import LoginQueueSystem from '@/components/LoginQueueSystem';
import PermissionActivationModal from '@/components/PermissionActivationModal';
import { hasActivatedPermissions } from '@/utils/unifiedPermissionManager';


// Validation schemas
const signUpSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .max(255, 'Email too long'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password too long'),
  displayName: z.string()
    .trim()
    .min(1, 'Display name required')
    .max(50, 'Display name too long'),
  username: z.string()
    .trim()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username too long')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username: letters, numbers, underscores only')
});

const signInSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .max(255, 'Email too long'),
  password: z.string()
    .min(1, 'Password required')
    .max(72, 'Password too long')
});

const AuthPage = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showFaceLogin, setShowFaceLogin] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);

  // Safe session wrapper (some browsers can throw on sessionStorage)
  const safeSession = useCallback(
    () => ({
      get(key: string) {
        try {
          return sessionStorage.getItem(key);
        } catch {
          return null;
        }
      },
      set(key: string, value: string) {
        try {
          sessionStorage.setItem(key, value);
        } catch {
          // ignore
        }
      },
    }),
    []
  );

  const [showQueue, setShowQueue] = useState(() => {
    // Show queue on first visit this session to warm up functions
    return !safeSession().get('spartans_queue_completed');
  });

  // Queue completion handler - proceed with auth after queue
  const handleQueueComplete = useCallback(() => {
    safeSession().set('spartans_queue_completed', 'true');
    setShowQueue(false);
  }, [safeSession]);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: '',
    username: '',
  });

  const { signIn, signUp } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate input before submission
      if (isSignUp) {
        const validation = signUpSchema.safeParse(formData);
        if (!validation.success) {
          const firstError = validation.error.errors[0];
          toast({
            title: "Validation Error",
            description: firstError.message,
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        const { error } = await signUp(formData.email, formData.password, {
          display_name: formData.displayName,
          username: formData.username,
        });

        if (error) {
          const isConnectionError = error?.name === 'ConnectionError' || /failed to fetch|load failed|network request failed|connection failed/i.test(error?.message || '');
          toast({
            title: isConnectionError ? "Connection Interrupted" : "Sign up failed",
            description: isConnectionError 
              ? "Connection issue detected. Please retry in a few seconds."
              : error.message,
            variant: "destructive",
            duration: isConnectionError ? 10000 : 5000,
          });
        } else {
          toast({
            title: "Welcome to MMora!",
            description: "Account created successfully",
          });
          // Navigate to home - the HomePage will open profile setup automatically
          navigate('/home');
        }
      } else {
        const validation = signInSchema.safeParse(formData);
        if (!validation.success) {
          const firstError = validation.error.errors[0];
          toast({
            title: "Validation Error",
            description: firstError.message,
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        const { error } = await signIn(formData.email, formData.password);

        if (error) {
          const isConnectionError = error?.name === 'ConnectionError' || /failed to fetch|load failed|network request failed|connection failed/i.test(error?.message || '');
          toast({
            title: isConnectionError ? "Connection Interrupted" : "Sign in failed",
            description: isConnectionError 
              ? "Connection issue detected. Please retry in a few seconds."
              : error.message,
            variant: "destructive",
            duration: isConnectionError ? 10000 : 5000,
          });
        } else {
          toast({
            title: "Welcome back!",
            description: "Signed in successfully",
          });
          navigate('/home');
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <>
      {/* Login Queue System - Staggers entry to prevent cold start issues */}
      {showQueue && (
        <LoginQueueSystem
          onQueueComplete={handleQueueComplete}
          enabled={true}
          maxQueueTime={3000}
        />
      )}
      
      <div className="min-h-screen bg-background flex items-center justify-center p-responsive safe-area-pb safe-area-pt">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md xxs:max-w-[calc(100%-1rem)] xs:max-w-sm sm:max-w-md md:max-w-lg lg:max-w-md xl:max-w-lg 2xl:max-w-xl 4k:max-w-2xl"
      >
        {/* Logo and Header - Responsive */}
        <div className="text-center mb-6 xxs:mb-4 xs:mb-6 sm:mb-8 md:mb-10">
          <div className={cn(
            "mx-auto bg-primary rounded-2xl flex items-center justify-center shadow-lg",
            "w-12 h-12 xxs:w-12 xxs:h-12 xs:w-14 xs:h-14 sm:w-16 sm:h-16 md:w-20 md:h-20",
            "lg:w-16 lg:h-16 xl:w-20 xl:h-20 2xl:w-24 2xl:h-24 4k:w-32 4k:h-32",
            "mb-3 xxs:mb-3 xs:mb-4 sm:mb-4"
          )}>
            <span className={cn(
              "font-bold text-primary-foreground",
              "text-lg xxs:text-lg xs:text-xl sm:text-2xl md:text-3xl",
              "lg:text-2xl xl:text-3xl 2xl:text-4xl 4k:text-5xl"
            )}>M</span>
          </div>
          <h1 className={cn(
            "font-bold text-foreground",
            "text-xl xxs:text-xl xs:text-2xl sm:text-2xl md:text-3xl",
            "lg:text-2xl xl:text-3xl 2xl:text-4xl 4k:text-5xl",
            "mb-1 xxs:mb-1 xs:mb-2 sm:mb-2"
          )}>
            {isSignUp ? 'Join M\'Mora' : 'Welcome Back'}
          </h1>
          <p className={cn(
            "text-muted-foreground",
            "text-xs xxs:text-xs xs:text-sm sm:text-base md:text-lg",
            "lg:text-base xl:text-lg 2xl:text-xl 4k:text-2xl"
          )}>
            {isSignUp ? 'Create your account to get started' : 'Sign in to continue'}
          </p>
        </div>

        {/* Auth Card - Responsive */}
        <Card className="bg-card border-border responsive-card">
          <CardContent className={cn(
            "p-4 xxs:p-4 xs:p-5 sm:p-6 md:p-8",
            "lg:p-6 xl:p-8 2xl:p-10 4k:p-12"
          )}>
            <form onSubmit={handleSubmit} className={cn(
              "space-y-3 xxs:space-y-3 xs:space-y-4 sm:space-y-4 md:space-y-5",
              "lg:space-y-4 xl:space-y-5 2xl:space-y-6 4k:space-y-8"
            )}>
              {isSignUp && (
                <>
                  <Input
                    name="displayName"
                    type="text"
                    placeholder="Display Name"
                    value={formData.displayName}
                    onChange={handleInputChange}
                    autoComplete="name"
                    required={isSignUp}
                    className={cn(
                      "bg-input border-border",
                      "h-10 xxs:h-10 xs:h-11 sm:h-12 md:h-14",
                      "lg:h-12 xl:h-14 2xl:h-16 4k:h-20",
                      "text-sm xxs:text-sm xs:text-base sm:text-base md:text-lg",
                      "lg:text-base xl:text-lg 2xl:text-xl 4k:text-2xl"
                    )}
                  />
                  <Input
                    name="username"
                    type="text"
                    placeholder="Username"
                    value={formData.username}
                    onChange={handleInputChange}
                    autoComplete="username"
                    required={isSignUp}
                    className={cn(
                      "bg-input border-border",
                      "h-10 xxs:h-10 xs:h-11 sm:h-12 md:h-14",
                      "lg:h-12 xl:h-14 2xl:h-16 4k:h-20",
                      "text-sm xxs:text-sm xs:text-base sm:text-base md:text-lg",
                      "lg:text-base xl:text-lg 2xl:text-xl 4k:text-2xl"
                    )}
                  />
                </>
              )}

              <Input
                name="email"
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleInputChange}
                autoComplete="email"
                required
                className={cn(
                  "bg-input border-border",
                  "h-10 xxs:h-10 xs:h-11 sm:h-12 md:h-14",
                  "lg:h-12 xl:h-14 2xl:h-16 4k:h-20",
                  "text-sm xxs:text-sm xs:text-base sm:text-base md:text-lg",
                  "lg:text-base xl:text-lg 2xl:text-xl 4k:text-2xl"
                )}
              />

              <div className="relative">
                <Input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleInputChange}
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                  required
                  className={cn(
                    "bg-input border-border pr-10",
                    "h-10 xxs:h-10 xs:h-11 sm:h-12 md:h-14",
                    "lg:h-12 xl:h-14 2xl:h-16 4k:h-20",
                    "text-sm xxs:text-sm xs:text-base sm:text-base md:text-lg",
                    "lg:text-base xl:text-lg 2xl:text-xl 4k:text-2xl"
                  )}
                />
                <button
                  type="button"
                  className={cn(
                    "absolute inset-y-0 right-0 flex items-center",
                    "pr-3 xxs:pr-3 xs:pr-3 sm:pr-4 md:pr-5"
                  )}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className={cn(
                      "text-muted-foreground",
                      "h-4 w-4 xxs:h-4 xxs:w-4 xs:h-5 xs:w-5 sm:h-5 sm:w-5 md:h-6 md:w-6",
                      "lg:h-5 lg:w-5 xl:h-6 xl:w-6 2xl:h-7 2xl:w-7 4k:h-8 4k:w-8"
                    )} />
                  ) : (
                    <Eye className={cn(
                      "text-muted-foreground",
                      "h-4 w-4 xxs:h-4 xxs:w-4 xs:h-5 xs:w-5 sm:h-5 sm:w-5 md:h-6 md:w-6",
                      "lg:h-5 lg:w-5 xl:h-6 xl:w-6 2xl:h-7 2xl:w-7 4k:h-8 4k:w-8"
                    )} />
                  )}
                </button>
              </div>

              <Button
                type="submit"
                className={cn(
                  "w-full bg-primary text-primary-foreground hover:bg-primary/90",
                  "h-10 xxs:h-10 xs:h-11 sm:h-12 md:h-14",
                  "lg:h-12 xl:h-14 2xl:h-16 4k:h-20",
                  "text-sm xxs:text-sm xs:text-base sm:text-base md:text-lg",
                  "lg:text-base xl:text-lg 2xl:text-xl 4k:text-2xl"
                )}
                disabled={loading}
              >
                {loading ? 'Please wait...' : (isSignUp ? 'Create Account' : 'Sign In')}
              </Button>

              {!isSignUp && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "w-full gap-2 border-primary/30 hover:bg-primary/10",
                      "h-10 xxs:h-10 xs:h-11 sm:h-12 md:h-14",
                      "lg:h-12 xl:h-14 2xl:h-16 4k:h-20",
                      "text-sm xxs:text-sm xs:text-base sm:text-base md:text-lg",
                      "lg:text-base xl:text-lg 2xl:text-xl 4k:text-2xl"
                    )}
                    onClick={() => setShowFaceLogin(true)}
                  >
                    <ScanFace className={cn(
                      "w-4 h-4 xxs:w-4 xxs:h-4 xs:w-5 xs:h-5 sm:w-5 sm:h-5",
                      "md:w-6 md:h-6 lg:w-5 lg:h-5 xl:w-6 xl:h-6"
                    )} />
                    Sign in with Face ID
                  </Button>
                  
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "w-full gap-2 border-primary/30 hover:bg-primary/10 text-primary",
                      "h-10 xxs:h-10 xs:h-11 sm:h-12 md:h-14",
                      "lg:h-12 xl:h-14 2xl:h-16 4k:h-20",
                      "text-sm xxs:text-sm xs:text-base sm:text-base md:text-lg",
                      "lg:text-base xl:text-lg 2xl:text-xl 4k:text-2xl"
                    )}
                    onClick={() => navigate('/voice-auth')}
                  >
                    <Mic className={cn(
                      "w-4 h-4 xxs:w-4 xxs:h-4 xs:w-5 xs:h-5 sm:w-5 sm:h-5",
                      "md:w-6 md:h-6 lg:w-5 lg:h-5 xl:w-6 xl:h-6"
                    )} />
                    Voice Citadel Login
                  </Button>
                </>
              )}
            </form>

            <div className={cn(
              "mt-4 xxs:mt-4 xs:mt-5 sm:mt-6 md:mt-8",
              "space-y-2 xxs:space-y-2 xs:space-y-3 sm:space-y-3",
              "text-center"
            )}>
              {!isSignUp && (
                <button
                  type="button"
                  onClick={() => navigate('/password-recovery')}
                  className={cn(
                    "text-white/70 hover:text-white inline-flex items-center gap-1",
                    "text-xs xxs:text-xs xs:text-sm sm:text-sm md:text-base",
                    "lg:text-sm xl:text-base 2xl:text-lg 4k:text-xl"
                  )}
                >
                  Forgot password?
                </button>
              )}
              <div>
                <button
                  type="button"
                  onClick={() => setIsSignUp(!isSignUp)}
                  className={cn(
                    "text-white hover:text-white/80 font-medium",
                    "text-xs xxs:text-xs xs:text-sm sm:text-sm md:text-base",
                    "lg:text-sm xl:text-base 2xl:text-lg 4k:text-xl"
                  )}
                >
                  {isSignUp
                    ? 'Already have an account? Sign in'
                    : 'Need an account? Sign up'
                  }
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <FaceLoginModal
        open={showFaceLogin}
        onClose={() => setShowFaceLogin(false)}
        onSuccess={() => {
          setShowFaceLogin(false);
          if (!hasActivatedPermissions()) {
            setShowPermissionModal(true);
          } else {
            navigate('/home');
          }
        }}
      />
      
      {/* Permission Activation Modal - Shows after auth */}
      <PermissionActivationModal
        open={showPermissionModal}
        onOpenChange={(open) => {
          setShowPermissionModal(open);
          if (!open) {
            navigate('/home');
          }
        }}
        onComplete={() => {
          // Navigate to home after permissions
          setTimeout(() => navigate('/home'), 500);
        }}
      />
      </div>
    </>
  );
};

export default AuthPage;

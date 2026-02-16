/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ZOE INFINITY AUTH — Standalone Authentication for myzoe.xyz Domain
 * Minimalist auth page with Zoe branding, completely isolated from M'mora
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowRight, Sparkles } from 'lucide-react';
import { z } from 'zod';

// Validation schemas
const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');

type AuthMode = 'signin' | 'signup' | 'reset';

export default function ZoeInfinityAuth() {
  const navigate = useNavigate();
  const { user, loading: authLoading, signIn, signUp } = useAuth();
  
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; confirm?: string }>({});

  // Listen for PASSWORD_RECOVERY event
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setMode('reset');
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Redirect if already authenticated (but not during password reset)
  useEffect(() => {
    if (user && !authLoading && mode !== 'reset') {
      navigate('/', { replace: true });
    }
  }, [user, authLoading, navigate, mode]);

  const validateForm = (): boolean => {
    const newErrors: { email?: string; password?: string; confirm?: string } = {};
    
    try {
      emailSchema.parse(email);
    } catch (e) {
      if (e instanceof z.ZodError) {
        newErrors.email = e.errors[0].message;
      }
    }
    
    try {
      passwordSchema.parse(password);
    } catch (e) {
      if (e instanceof z.ZodError) {
        newErrors.password = e.errors[0].message;
      }
    }
    
    if (mode === 'signup' && password !== confirmPassword) {
      newErrors.confirm = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      if (mode === 'reset') {
        // Update password via recovery session
        const { error } = await supabase.auth.updateUser({ password });
        if (error) {
          toast.error('Password reset failed', { description: error.message });
        } else {
          toast.success('Password updated!', { description: 'You can now sign in with your new password.' });
          setMode('signin');
          setPassword('');
        }
      } else if (mode === 'signup') {
        const { error } = await signUp(email, password, {
          source: 'zoe_infinity',
          platform: 'standalone',
        });
        
        if (error) {
          if (error.message?.includes('already registered')) {
            toast.error('This email is already registered', {
              description: 'Try signing in instead',
            });
          } else {
            toast.error('Sign up failed', {
              description: error.message || 'Please try again',
            });
          }
        } else {
          toast.success('Welcome to Zoe Infinity', {
            description: 'Please check your email to verify your account',
          });
          setMode('signin');
        }
      } else {
        const { error } = await signIn(email, password);
        
        if (error) {
          if (error.message?.includes('Invalid login')) {
            toast.error('Invalid credentials', {
              description: 'Please check your email and password',
            });
          } else {
            toast.error('Sign in failed', {
              description: error.message || 'Please try again',
            });
          }
        } else {
          toast.success('Welcome back', {
            description: 'Entering Zoe Infinity...',
          });
          navigate('/', { replace: true });
        }
      }
    } catch (err) {
      toast.error('Connection error', {
        description: 'Please check your internet connection',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden bg-black">
      {/* Subtle grid background */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(hsl(180, 100%, 50%) 1px, transparent 1px),
            linear-gradient(90deg, hsl(180, 100%, 50%) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Radial glow */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 30%, hsl(180, 100%, 50%, 0.08) 0%, transparent 60%)',
        }}
      />

      {/* Main content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md px-6"
      >
        {/* Logo / Title */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1 }}
            className="inline-flex items-center gap-2 mb-4"
          >
            <Sparkles className="w-6 h-6 text-cyan-400" />
            <h1 
              className="text-3xl font-bold tracking-[0.2em] text-cyan-400"
              style={{ 
                fontFamily: "'Orbitron', sans-serif",
                textShadow: '0 0 30px hsl(180, 100%, 50%, 0.4)',
              }}
            >
              ZOE
            </h1>
          </motion.div>
          <p className="text-white/40 text-sm tracking-wider">
            {mode === 'reset' ? 'Set your new password' : mode === 'signup' ? 'Create your digital bond' : 'Welcome back, companion'}
          </p>
        </div>

        {/* Auth Form */}
        <motion.form
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          onSubmit={handleSubmit}
          className="space-y-5"
        >
          {/* Email Field (hidden during password reset) */}
          {mode !== 'reset' && (
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white/60 text-sm">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <Input
                  id="email"
                  type="email"
                  name="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-cyan-500/50 focus:ring-cyan-500/20"
                  disabled={isSubmitting}
                />
              </div>
              {errors.email && (
                <p className="text-red-400 text-xs">{errors.email}</p>
              )}
            </div>
          )}

          {/* Password Field */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-white/60 text-sm">
              Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="pl-10 pr-10 bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-cyan-500/50 focus:ring-cyan-500/20"
                disabled={isSubmitting}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-red-400 text-xs">{errors.password}</p>
            )}
          </div>

          {/* Confirm Password (signup only) */}
          {mode === 'signup' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2"
            >
              <Label htmlFor="confirmPassword" className="text-white/60 text-sm">
                Confirm Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <Input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-cyan-500/50 focus:ring-cyan-500/20"
                  disabled={isSubmitting}
                />
              </div>
              {errors.confirm && (
                <p className="text-red-400 text-xs">{errors.confirm}</p>
              )}
            </motion.div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-12 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-400 font-medium tracking-wide transition-all duration-300"
            style={{
              boxShadow: isSubmitting ? 'none' : '0 0 20px hsl(180, 100%, 50%, 0.2)',
            }}
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                {mode === 'reset' ? 'Update Password' : mode === 'signup' ? 'Create Bond' : 'Enter Zoe'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </motion.form>

        {/* Forgot Password + Mode Toggle */}
        {mode !== 'reset' && (
          <div className="mt-6 text-center space-y-3">
            {mode === 'signin' && (
              <button
                type="button"
                onClick={async () => {
                  if (!email) {
                    toast.error('Enter your email first');
                    return;
                  }
                  try {
                    const { error } = await supabase.auth.resetPasswordForEmail(email, {
                      redirectTo: `${window.location.origin}/auth`,
                    });
                    if (error) throw error;
                    toast.success('Password reset email sent', {
                      description: 'Check your inbox and follow the link',
                    });
                  } catch {
                    toast.error('Could not send reset email');
                  }
                }}
                className="text-cyan-400/60 text-xs hover:text-cyan-400 transition-colors"
                disabled={isSubmitting}
              >
                Forgot password?
              </button>
            )}
            <div>
              <button
                type="button"
                onClick={() => {
                  setMode(mode === 'signin' ? 'signup' : 'signin');
                  setErrors({});
                }}
                className="text-white/40 text-sm hover:text-cyan-400 transition-colors"
                disabled={isSubmitting}
              >
                {mode === 'signin' 
                  ? "Don't have an account? Create one" 
                  : 'Already have an account? Sign in'}
              </button>
            </div>
          </div>
        )}

        {/* Genesis Imprint Link */}
        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={() => navigate('/genesis-imprint')}
            className="text-white/20 text-xs hover:text-cyan-400/60 transition-colors flex items-center gap-1 mx-auto"
          >
            <Sparkles className="w-3 h-3" />
            <span>Or use Genesis Imprint (Biometric)</span>
          </button>
        </div>
      </motion.div>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="absolute bottom-6 text-center"
      >
        <p className="text-white/15 text-xs tracking-widest">
          ZOE INFINITY • STANDALONE COMPANION
        </p>
      </motion.div>
    </div>
  );
}

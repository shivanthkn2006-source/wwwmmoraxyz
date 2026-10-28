import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import { Eye, EyeOff, ScanFace, Mic, Fingerprint, Loader2 } from 'lucide-react';
import { z } from 'zod';
import { cn } from '@/lib/utils';
import FaceLoginModal from '@/components/FaceLoginModal';
import { useWebAuthn } from '@/hooks/useWebAuthn';
import PageSeo from '@/components/seo/PageSeo';
import { ROUTE_SEO } from '@/config/routeSeo';
import TurnstileSignup, { verifyTurnstileToken } from '@/components/security/TurnstileSignup';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { RecoveryCodeSignIn } from '@/components/auth/RecoveryCodeSignIn';
import { captureReferralFromUrl, redeemStoredReferral } from '@/lib/referral';
import { markTourPending } from '@/components/onboarding/GuidedTour';



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
  const location = useLocation();
  const startsOnSignUp = location.pathname.startsWith('/signup');
  const [isSignUp, setIsSignUp] = useState(startsOnSignUp);
  const referralCode = useMemo(() => captureReferralFromUrl(location.search), [location.search]);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showFaceLogin, setShowFaceLogin] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaReset, setCaptchaReset] = useState(0);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Home is the destination for every successful sign-in. Fetch its route
  // while the member is entering credentials so navigation does not replace
  // the authenticated screen with the full-page lazy-route loader.
  useEffect(() => {
    void import('./HomePage');
  }, []);

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

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: '',
    username: '',
  });

  const { signIn, signUp, user, loading: authLoading } = useAuth();
  const { authenticateWithEmail, isLoading: passkeyLoading, isSupported: passkeySupported, deviceType } = useWebAuthn();
  const { toast } = useToast();
  const navigate = useNavigate();

  // The auth-state event is authoritative. Navigate as soon as the session is
  // hydrated instead of waiting for referral/profile background work or for a
  // slow sign-in request wrapper to settle on mobile networks.
  useEffect(() => {
    if (!authLoading && user) navigate('/home', { replace: true });
  }, [authLoading, navigate, user]);

  const handlePasskeyLogin = async () => {
    if (!formData.email.trim()) {
      toast({
        title: 'Email required',
        description: 'Enter your email before using Face ID, Touch ID, or fingerprint login.',
        variant: 'destructive',
      });
      return;
    }

    const success = await authenticateWithEmail(formData.email);
    if (success) {
      toast({
        title: 'Biometric login successful',
        description: 'Signed in with your device passkey.',
      });
      navigate('/home');
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      safeSession().set('mmora_oauth_return_to', '/home');
      // Returns through /~oauth/callback on this domain (matches Google's saved redirect URIs).
      const result = await lovable.auth.signInWithOAuth('google', {
        redirect_uri: `${window.location.origin}/auth`,
        extraParams: { prompt: 'select_account' },
      });
      if (result.error) {
        toast({ title: 'Google sign-in failed', description: result.error.message || 'Please try again.', variant: 'destructive' });
        return;
      }
      if (result.redirected) return;
      navigate('/home', { replace: true });
    } catch (error) {
      toast({
        title: 'Google sign-in failed',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setGoogleLoading(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search + '&' + window.location.hash.replace(/^#/, ''));
    const oauthError = params.get('error_description') || params.get('error');
    if (oauthError) {
      toast({ title: 'Google sign-in failed', description: oauthError.replace(/\+/g, ' '), variant: 'destructive' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [showRecovery, setShowRecovery] = useState(false);
  const passkeyLabel = deviceType === 'faceid'
    ? 'Face ID/Passkey'
    : deviceType === 'touchid'
      ? 'Touch ID/Passkey'
      : 'Fingerprint/Passkey';

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

        if (!captchaToken || !(await verifyTurnstileToken(captchaToken))) {
          toast({
            title: 'Security check required',
            description: 'Please complete the human verification and try again.',
            variant: 'destructive',
          });
          setCaptchaReset((value) => value + 1);
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
          // With email confirmation on, signUp returns no session until the
          // member clicks the link in their inbox. Never treat it as signed in.
          const { data: sessionData } = await supabase.auth.getSession();
          // New members get the short guided walk on their first signed-in page.
          markTourPending();
          if (sessionData?.session) {
            void redeemStoredReferral();
            toast({ title: "Welcome to M'Mora!", description: 'Account created successfully' });
            navigate('/setup/location');
          } else {
            setPendingEmail(formData.email);
          }

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
          // Invite redemption is idempotent background work. It must never hold
          // successful authentication or delay the first Home paint.
          void redeemStoredReferral();
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

  const resendConfirmation = async () => {
    if (!pendingEmail) return;
    setResending(true);
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: pendingEmail,
      options: { emailRedirectTo: `${window.location.origin}/` },
    });
    setResending(false);
    toast(
      error
        ? { title: 'Could not resend', description: error.message, variant: 'destructive' }
        : { title: 'Confirmation sent', description: `We emailed ${pendingEmail} again.` },
    );
  };

  // Fit the whole page on one screen (large phone text sizes included) by
  // scaling everything evenly, so spacing stays proportional, never squeezed.
  const fitRef = useRef<HTMLDivElement>(null);
  const [fitScale, setFitScale] = useState(1);
  useEffect(() => {
    const el = fitRef.current;
    if (!el) return;
    let tallest = 0; // phone keyboard shrinks the window: keep the full-screen height
    let lastW = window.innerWidth;
    const fit = () => {
      if (window.innerWidth !== lastW) { lastW = window.innerWidth; tallest = 0; } // rotated
      tallest = Math.max(tallest, window.innerHeight);
      if (window.innerHeight < tallest * 0.8) return; // keyboard open: keep the current size
      const avail = tallest - 24;
      setFitScale(Math.min(1, avail / Math.max(1, el.offsetHeight)));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    window.addEventListener('resize', fit);
    return () => { ro.disconnect(); window.removeEventListener('resize', fit); };
  }, [pendingEmail]);

  if (pendingEmail) {
    return (
      <>
        <PageSeo title={ROUTE_SEO['/auth'].title} description={ROUTE_SEO['/auth'].description} path="/auth" />
        <main className="min-h-dvh bg-background flex items-center justify-center p-6">
          <Card className="w-full max-w-md bg-card border-border">
            <CardContent className="p-6 space-y-4 text-center">
              <h1 className="text-xl font-semibold text-foreground">Confirm your email</h1>
              <p className="text-sm text-muted-foreground">
                We sent a confirmation link to <span className="text-foreground">{pendingEmail}</span>.
                Open it to finish creating your account.
              </p>
              <Button className="w-full" onClick={resendConfirmation} disabled={resending}>
                {resending ? 'Sending…' : 'Resend the email'}
              </Button>
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setPendingEmail(null);
                  setIsSignUp(false);
                }}
              >
                Back to sign in
              </button>
            </CardContent>
          </Card>
        </main>
      </>
    );
  }

  return (
    <>
      <PageSeo title={ROUTE_SEO['/auth'].title} description={ROUTE_SEO['/auth'].description} path="/auth" />
      <main className="h-[100dvh] overflow-hidden surface-warm-tan text-white flex items-center justify-center p-responsive safe-area-pb safe-area-pt">
      <motion.div
        ref={fitRef}
        style={{ scale: fitScale }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md xxs:max-w-[calc(100%-1rem)] xs:max-w-sm sm:max-w-md md:max-w-lg lg:max-w-md xl:max-w-lg 2xl:max-w-xl 4k:max-w-2xl"
      >
        {/* Logo and Header - Responsive */}
        <div className="text-center mb-3 xxs:mb-2 xs:mb-3 sm:mb-4 md:mb-5">
          <div className={cn(
            "mx-auto flex items-center justify-center",
            "w-12 h-12 xxs:w-12 xxs:h-12 xs:w-14 xs:h-14 sm:w-16 sm:h-16 md:w-20 md:h-20",
            "lg:w-16 lg:h-16 xl:w-20 xl:h-20 2xl:w-24 2xl:h-24 4k:w-32 4k:h-32",
            "mb-3 xxs:mb-3 xs:mb-4 sm:mb-4"
          )}>
            <span className={cn(
              "font-bold text-white",
              "text-lg xxs:text-lg xs:text-xl sm:text-2xl md:text-3xl",
              "lg:text-2xl xl:text-3xl 2xl:text-4xl 4k:text-5xl"
            )}>M</span>
          </div>
          <h1 className={cn(
            "font-bold text-white",
            "text-xl xxs:text-xl xs:text-2xl sm:text-2xl md:text-3xl",
            "lg:text-2xl xl:text-3xl 2xl:text-4xl 4k:text-5xl",
            "mb-1 xxs:mb-1 xs:mb-2 sm:mb-2"
          )}>
            {isSignUp ? 'Join M\'Mora' : 'Welcome Back'}
          </h1>
          <p className={cn(
            "text-white",
            "text-xs xxs:text-xs xs:text-sm sm:text-base md:text-lg",
            "lg:text-base xl:text-lg 2xl:text-xl 4k:text-2xl"
          )}>
            {isSignUp ? 'Create your account to get started' : 'Sign in/Sign up'}
          </p>
          {referralCode && (
            <p className="mt-2 text-xs text-white">
              Invite code <span className="font-mono">{referralCode}</span> will be applied to your account.
            </p>
          )}
        </div>


        {/* Auth Card - Responsive */}
        <div className="bg-transparent border-0 shadow-none">
          <div className={cn(
            "p-4 xxs:p-4 xs:p-5 sm:p-6 md:p-8",
            "lg:p-6 xl:p-8 2xl:p-10 4k:p-12"
          )}>
            <form onSubmit={handleSubmit} className={cn(
              "space-y-1.5 xxs:space-y-1.5 xs:space-y-2 sm:space-y-2 md:space-y-2.5",
              "lg:space-y-2 xl:space-y-2.5 2xl:space-y-3 4k:space-y-4"
            )}>
              {isSignUp && (
                <>
                  <Input
                    name="displayName"
                    aria-label="Display name"
                    type="text"
                    placeholder="Display Name"
                    value={formData.displayName}
                    onChange={handleInputChange}
                    autoComplete="name"
                    required={isSignUp}
                    className={cn(
                      "bg-transparent border-0 shadow-none rounded-none px-10 text-center text-white placeholder:text-white/80 caret-white focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0",
                      "h-9 xxs:h-9 xs:h-9 sm:h-10 md:h-10",
                      "lg:h-10 xl:h-10 2xl:h-12 4k:h-14",
                      "text-sm xxs:text-sm xs:text-base sm:text-base md:text-lg",
                      "lg:text-base xl:text-lg 2xl:text-xl 4k:text-2xl"
                    )}
                  />
                  <Input
                    name="username"
                    aria-label="Username"
                    type="text"
                    placeholder="Username"
                    value={formData.username}
                    onChange={handleInputChange}
                    autoComplete="username"
                    required={isSignUp}
                    className={cn(
                      "bg-transparent border-0 shadow-none rounded-none px-10 text-center text-white placeholder:text-white/80 caret-white focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0",
                      "h-9 xxs:h-9 xs:h-9 sm:h-10 md:h-10",
                      "lg:h-10 xl:h-10 2xl:h-12 4k:h-14",
                      "text-sm xxs:text-sm xs:text-base sm:text-base md:text-lg",
                      "lg:text-base xl:text-lg 2xl:text-xl 4k:text-2xl"
                    )}
                  />
                </>
              )}

              <Input
                name="email"
                aria-label="Email"
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleInputChange}
                autoComplete="email"
                required
                className={cn(
                  "bg-transparent border-0 shadow-none rounded-none px-10 text-center text-white placeholder:text-white/80 caret-white focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0",
                  "h-9 xxs:h-9 xs:h-9 sm:h-10 md:h-10",
                  "lg:h-10 xl:h-10 2xl:h-12 4k:h-14",
                  "text-sm xxs:text-sm xs:text-base sm:text-base md:text-lg",
                  "lg:text-base xl:text-lg 2xl:text-xl 4k:text-2xl"
                )}
              />

              <div className="relative">
                <Input
                  name="password"
                  aria-label="Password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleInputChange}
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                  required
                  className={cn(
                    "bg-transparent border-0 shadow-none rounded-none px-10 text-center text-white placeholder:text-white/80 caret-white focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 pr-10",
                    "h-9 xxs:h-9 xs:h-9 sm:h-10 md:h-10",
                    "lg:h-10 xl:h-10 2xl:h-12 4k:h-14",
                    "text-sm xxs:text-sm xs:text-base sm:text-base md:text-lg",
                    "lg:text-base xl:text-lg 2xl:text-xl 4k:text-2xl"
                  )}
                />
                <Button
                  type="button"
                  variant="ghost"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  className={cn(
                    "absolute inset-y-0 right-0 flex h-full min-w-11 items-center bg-transparent hover:bg-transparent",
                    "pr-3 xxs:pr-3 xs:pr-3 sm:pr-4 md:pr-5"
                  )}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className={cn(
                      "text-white",
                      "h-4 w-4 xxs:h-4 xxs:w-4 xs:h-5 xs:w-5 sm:h-5 sm:w-5 md:h-6 md:w-6",
                      "lg:h-5 lg:w-5 xl:h-6 xl:w-6 2xl:h-7 2xl:w-7 4k:h-8 4k:w-8"
                    )} />
                  ) : (
                    <Eye className={cn(
                      "text-white",
                      "h-4 w-4 xxs:h-4 xxs:w-4 xs:h-5 xs:w-5 sm:h-5 sm:w-5 md:h-6 md:w-6",
                      "lg:h-5 lg:w-5 xl:h-6 xl:w-6 2xl:h-7 2xl:w-7 4k:h-8 4k:w-8"
                    )} />
                  )}
                </Button>
              </div>

              {isSignUp && (
                <TurnstileSignup onTokenChange={setCaptchaToken} resetSignal={captchaReset} />
              )}

              <Button
                type="submit"
                className={cn(
                  "w-full gap-2 bg-transparent border-0 shadow-none text-white hover:bg-transparent hover:text-white/80 whitespace-normal text-center",
                  "h-9 xxs:h-9 xs:h-9 sm:h-10 md:h-10",
                  "lg:h-10 xl:h-10 2xl:h-12 4k:h-14",
                  "text-sm xxs:text-sm xs:text-base sm:text-base md:text-lg",
                  "lg:text-base xl:text-lg 2xl:text-xl 4k:text-2xl"
                )}
                disabled={loading}
              >
                {loading ? 'Please wait...' : (isSignUp ? 'Create Account' : 'Sign In')}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className={cn(
                  "w-3/4 mx-auto flex gap-2 rounded-full border-0 bg-[#ffffff] text-[#1f1f1f] hover:bg-[#f2f2f2] hover:text-[#1f1f1f] font-medium",
                  "h-9 xxs:h-9 xs:h-9 sm:h-10 md:h-10",
                  "lg:h-10 xl:h-10 2xl:h-12 4k:h-14",
                  "text-sm xxs:text-sm xs:text-base sm:text-base md:text-lg",
                  "lg:text-base xl:text-lg 2xl:text-xl 4k:text-2xl"
                )}
                onClick={handleGoogleLogin}
                disabled={googleLoading}
                aria-describedby="google-sign-in-details"
              >
                {googleLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span aria-hidden="true" className="inline-flex size-5 items-center justify-center font-semibold">G</span>}
                Continue with Google
              </Button>
              <p id="google-sign-in-details" className="mx-auto max-w-sm text-center text-xs leading-relaxed text-foreground">
                Mmora receives your name, email and profile photo—never your Google password. Google may send its own security notice.
              </p>

              {!isSignUp && (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    className={cn(
                      "w-full gap-2 bg-transparent border-0 shadow-none text-white hover:bg-transparent hover:text-white/80 whitespace-normal text-center",
                      "h-9 xxs:h-9 xs:h-9 sm:h-10 md:h-10",
                      "lg:h-10 xl:h-10 2xl:h-12 4k:h-14",
                      "text-sm xxs:text-sm xs:text-base sm:text-base md:text-lg",
                      "lg:text-base xl:text-lg 2xl:text-xl 4k:text-2xl"
                    )}
                    onClick={() => setShowFaceLogin(true)}
                  >
                    <ScanFace className={cn(
                      "w-4 h-4 xxs:w-4 xxs:h-4 xs:w-5 xs:h-5 sm:w-5 sm:h-5",
                      "md:w-6 md:h-6 lg:w-5 lg:h-5 xl:w-6 xl:h-6"
                    )} />
                    Face Scan
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    className={cn(
                      "w-full gap-2 bg-transparent border-0 shadow-none text-white hover:bg-transparent hover:text-white/80 whitespace-normal text-center",
                      "h-9 xxs:h-9 xs:h-9 sm:h-10 md:h-10",
                      "lg:h-10 xl:h-10 2xl:h-12 4k:h-14",
                      "text-sm xxs:text-sm xs:text-base sm:text-base md:text-lg",
                      "lg:text-base xl:text-lg 2xl:text-xl 4k:text-2xl"
                    )}
                    onClick={handlePasskeyLogin}
                    disabled={passkeyLoading || !passkeySupported}
                  >
                    {passkeyLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Fingerprint className={cn(
                        "w-4 h-4 xxs:w-4 xxs:h-4 xs:w-5 xs:h-5 sm:w-5 sm:h-5",
                        "md:w-6 md:h-6 lg:w-5 lg:h-5 xl:w-6 xl:h-6"
                      )} />
                    )}
                    {passkeySupported ? `${passkeyLabel}` : 'Passkeys unavailable in this browser'}
                  </Button>
                  
                  <Button
                    type="button"
                    variant="ghost"
                    className={cn(
                      "w-full gap-2 bg-transparent border-0 shadow-none text-white hover:bg-transparent hover:text-white/80 whitespace-normal text-center",
                      "h-9 xxs:h-9 xs:h-9 sm:h-10 md:h-10",
                      "lg:h-10 xl:h-10 2xl:h-12 4k:h-14",
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
              <div className="mt-1 text-center">
                <button
                  type="button"
                  onClick={() => setIsSignUp(!isSignUp)}
                  className={cn(
                    "text-white hover:text-white/80 font-bold !min-h-0 leading-tight",
                    "text-xl xxs:text-xl xs:text-2xl sm:text-2xl md:text-3xl",
                    "lg:text-2xl xl:text-3xl 2xl:text-4xl 4k:text-5xl"
                  )}
                >
                  {isSignUp
                    ? 'Already have an account? Sign in'
                    : 'Explore M\'Mora — sign up now..'
                  }
                </button>
              </div>

            <div className={cn(
              "mt-4 xxs:mt-4 xs:mt-5 sm:mt-5 md:mt-6",
              "flex flex-col items-center gap-0",
              "text-center"
            )}>
              {!isSignUp && (
                <button
                  type="button"
                  onClick={() => navigate('/password-recovery')}
                  className={cn(
                    "text-white hover:text-white/80 inline-flex items-center gap-1 !min-h-0 py-0",
                    "text-xs xxs:text-xs xs:text-sm sm:text-sm md:text-base",
                    "lg:text-sm xl:text-base 2xl:text-lg 4k:text-xl"
                  )}
                >
                  Forgot password?
                </button>
              )}
              {!isSignUp && (
                <div>
                  <button type="button" onClick={() => setShowRecovery(true)} className="text-white hover:text-white/80 text-xs xs:text-sm md:text-base !min-h-0 py-0">
                    Use a recovery code
                  </button>
                  <RecoveryCodeSignIn open={showRecovery} onOpenChange={setShowRecovery} defaultEmail={formData.email} />
                </div>
              )}
              <nav aria-label="About M'Mora" className="flex flex-wrap justify-center gap-x-1.5 pt-1 text-[11px] xs:text-xs text-white/75">
                {[['About', '/about'], ['Terms', '/terms'], ['Help', '/help'], ['Privacy', '/data-policy'], ['Report abuse', '/report-abuse'], ['Site map', '/map']].map(([label, to], i) => (
                  <span key={to} className="flex items-center gap-x-1.5">
                    {i > 0 && <span aria-hidden>/</span>}
                    <a href={to} className="min-h-11 inline-flex items-center px-2 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring">{label}</a>
                  </span>
                ))}
              </nav>
            </div>
          </div>
        </div>
      </motion.div>

      <FaceLoginModal
        open={showFaceLogin}
        onClose={() => setShowFaceLogin(false)}
        onSuccess={() => {
          setShowFaceLogin(false);
          navigate('/home');
        }}
      />
      </main>
    </>
  );
};

export default AuthPage;

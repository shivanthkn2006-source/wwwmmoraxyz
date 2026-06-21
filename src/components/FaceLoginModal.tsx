import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Camera, CheckCircle2, Loader2, AlertCircle, X, ScanFace } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface FaceLoginModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type Step = 'email' | 'camera' | 'verifying' | 'success' | 'error';

const FaceLoginModal: React.FC<FaceLoginModalProps> = ({ open, onClose, onSuccess }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  useEffect(() => {
    if (!open) {
      // Reset state when modal closes
      setStep('email');
      setEmail('');
      setErrorMessage('');
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
    }
  }, [open]);

  const checkFaceEnrolled = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('face-verification', {
        body: { operation: 'check_face_enrolled', email }
      });

      if (error) throw error;
      return data?.enrolled === true;
    } catch (err) {
      console.error('Check face enrolled error:', err);
      return false;
    }
  };

  const startCamera = async () => {
    if (!email.trim()) {
      toast.error('Please enter your email first');
      return;
    }

    // Check if face ID is set up for this email
    const isEnrolled = await checkFaceEnrolled();
    if (!isEnrolled) {
      setErrorMessage('Face ID is not set up for this account. Please sign in with password first and set up Face ID in settings.');
      setStep('error');
      return;
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        }
      });
      
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setStep('camera');
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast.error('Failed to access camera. Please check permissions.');
    }
  };

  const captureAndVerify = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setStep('verifying');

    try {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context not available');

      ctx.drawImage(video, 0, 0);
      const imageData = canvas.toDataURL('image/jpeg', 0.95);

      // Stop camera
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }

      // Send to face verification edge function
      const { data, error } = await supabase.functions.invoke('face-verification', {
        body: {
          operation: 'login_with_face',
          email,
          imageData
        }
      });

      if (error) throw error;

      if (data?.success && data?.verified) {
        setStep('success');
        toast.success('Face verified! Signing you in...');
        
        // Use the token to sign in
        if (data.token) {
          const { error: signInError } = await supabase.auth.verifyOtp({
            token_hash: data.token,
            type: 'magiclink'
          });

          if (signInError) {
            console.error('Sign in error:', signInError);
            // Fallback: reload to trigger auth state change
            setTimeout(() => {
              window.location.reload();
            }, 1500);
          } else {
            setTimeout(() => {
              onSuccess();
            }, 1500);
          }
        } else {
          setTimeout(() => {
            onSuccess();
          }, 1500);
        }
      } else {
        setErrorMessage(data?.error || 'Face verification failed. Please try again or use password.');
        setStep('error');
      }
    } catch (error: any) {
      console.error('Face login error:', error);
      setErrorMessage(error.message || 'Face verification failed. Please try again.');
      setStep('error');
    }
  };

  const retry = () => {
    setStep('email');
    setErrorMessage('');
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <ScanFace className="w-5 h-5 text-primary" />
            Sign in with Face ID
          </DialogTitle>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {step === 'email' && (
            <motion.div
              key="email"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <p className="text-sm text-muted-foreground">
                Enter your email to sign in with Face ID
              </p>
              <Input
                type="email"
                placeholder="Your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-input border-border"
              />
              <div className="flex gap-2">
                <Button onClick={startCamera} className="flex-1 gap-2">
                  <Camera className="w-4 h-4" />
                  Continue with Camera
                </Button>
                <Button onClick={onClose} variant="outline">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 'camera' && (
            <motion.div
              key="camera"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-4"
            >
              <div className="relative rounded-lg overflow-hidden border-2 border-primary/30">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-auto"
                />
                <div className="absolute inset-0 border-4 border-primary/30 rounded-lg pointer-events-none">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-64 border-2 border-primary rounded-full"></div>
                </div>
              </div>
              
              <canvas ref={canvasRef} className="hidden" />
              
              <p className="text-sm text-muted-foreground text-center">
                Position your face in the oval and click verify
              </p>
              
              <div className="flex gap-2">
                <Button onClick={captureAndVerify} className="flex-1 gap-2">
                  <ScanFace className="w-4 h-4" />
                  Verify & Sign In
                </Button>
                <Button onClick={onClose} variant="outline">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 'verifying' && (
            <motion.div
              key="verifying"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-8 space-y-4"
            >
              <div className="w-16 h-16 mx-auto bg-primary/20 rounded-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  Verifying Face
                </h3>
                <p className="text-sm text-muted-foreground">
                  Analyzing with AI vision...
                </p>
              </div>
            </motion.div>
          )}

          {step === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-8 space-y-4"
            >
              <div className="w-16 h-16 mx-auto bg-emerald-500/20 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  Face Verified!
                </h3>
                <p className="text-sm text-muted-foreground">
                  Signing you in...
                </p>
              </div>
            </motion.div>
          )}

          {step === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-8 space-y-4"
            >
              <div className="w-16 h-16 mx-auto bg-destructive/20 rounded-full flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-destructive" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  Verification Failed
                </h3>
                <p className="text-sm text-muted-foreground">
                  {errorMessage}
                </p>
              </div>
              <div className="flex gap-2 justify-center">
                <Button onClick={retry} variant="outline">
                  Try Again
                </Button>
                <Button onClick={onClose}>
                  Use Password
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};

export default FaceLoginModal;

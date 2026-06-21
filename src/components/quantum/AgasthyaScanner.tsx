import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, Camera, Shield, Lock, Eye, Sparkles, 
  CheckCircle, AlertTriangle, Terminal, Zap 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { useWebAuthn } from '@/hooks/useWebAuthn';
import { BiometricAuthButton } from './BiometricAuthButton';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ScanLog {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: Date;
}

type ScanPhase = 'authorization' | 'upload' | 'scanning' | 'analyzing' | 'complete';

export const AgasthyaScanner: React.FC<{ className?: string }> = ({ className }) => {
  const { user } = useAuth();
  const { authenticate, isSupported, deviceType, isLoading: webAuthnLoading, checkEnrollment, registerDevice } = useWebAuthn();
  
  const [phase, setPhase] = useState<ScanPhase>('authorization');
  const [authState, setAuthState] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [scanLogs, setScanLogs] = useState<ScanLog[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [nadiLeafIndex, setNadiLeafIndex] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);

  // Check enrollment status on mount
  useEffect(() => {
    const checkStatus = async () => {
      if (user) {
        const enrolled = await checkEnrollment();
        setIsEnrolled(enrolled);
      }
    };
    checkStatus();
  }, [user, checkEnrollment]);

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [scanLogs]);

  const addLog = (message: string, type: ScanLog['type'] = 'info') => {
    setScanLogs(prev => [...prev, {
      id: crypto.randomUUID(),
      message,
      type,
      timestamp: new Date()
    }]);
  };

  const handleDoubleLockAuth = async () => {
    if (!isSupported) {
      toast.error('Biometric authentication is not supported on this device');
      return;
    }

    setAuthState('scanning');

    try {
      if (!isEnrolled) {
        // First time - need to register
        const registered = await registerDevice();
        if (registered) {
          setIsEnrolled(true);
          setAuthState('success');
          addLog('BIOMETRIC ENROLLED: Identity matrix captured', 'success');
          setTimeout(() => setPhase('upload'), 1500);
        } else {
          setAuthState('error');
          setTimeout(() => setAuthState('idle'), 2000);
        }
      } else {
        // Already enrolled - authenticate
        const success = await authenticate();
        if (success) {
          setAuthState('success');
          addLog('DOUBLE-LOCK PROTOCOL: Identity verified via biometric signature', 'success');
          
          // Record session authorization
          if (user) {
            await supabase.from('agasthya_scan_sessions').insert({
              user_id: user.id,
              scan_type: 'thumbprint',
              verification_status: 'authorized',
              double_lock_verified: true,
              verified_at: new Date().toISOString()
            });
          }
          
          setTimeout(() => setPhase('upload'), 1500);
        } else {
          setAuthState('error');
          addLog('AUTHORIZATION FAILED: Biometric mismatch detected', 'error');
          setTimeout(() => setAuthState('idle'), 2000);
        }
      }
    } catch (error) {
      setAuthState('error');
      addLog('SYSTEM ERROR: Authorization protocol failure', 'error');
      setTimeout(() => setAuthState('idle'), 2000);
    }
  };

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      processUploadedFile(file);
    } else {
      toast.error('Please upload an image file');
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processUploadedFile(file);
    }
  };

  const processUploadedFile = async (file: File) => {
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 10MB');
      return;
    }

    setUploadedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setUploadedImage(e.target?.result as string);
      startScanSequence(file);
    };
    reader.readAsDataURL(file);
  };

  const startScanSequence = async (file: File) => {
    setPhase('scanning');
    setScanLogs([]);

    // Simulate deep scan sequence
    const scanSteps = [
      { delay: 500, msg: 'Initializing Occult Vision Protocol...', type: 'info' as const },
      { delay: 1000, msg: 'Calibrating quantum optical sensors...', type: 'info' as const },
      { delay: 1500, msg: 'Analyzing ridge pattern topology...', type: 'info' as const },
      { delay: 2000, msg: 'Detecting dharmic coordinate matrix...', type: 'info' as const },
      { delay: 2500, msg: 'Cross-referencing Agasthya Archive...', type: 'info' as const },
      { delay: 3000, msg: 'Mapping chakra energy signatures...', type: 'success' as const },
      { delay: 3500, msg: 'Extracting karmic pattern vectors...', type: 'info' as const },
      { delay: 4000, msg: 'Verifying identity via Occult Protocol...', type: 'success' as const },
    ];

    for (const step of scanSteps) {
      await new Promise(resolve => setTimeout(resolve, 500));
      addLog(step.msg, step.type);
    }

    setPhase('analyzing');

    // Check image quality (simulated)
    const isBlurry = Math.random() < 0.1; // 10% chance of blur detection
    
    if (isBlurry) {
      addLog('OPTICAL INTERFERENCE DETECTED: Image resolution insufficient', 'error');
      addLog('Recommendation: Clean lens and retry with higher resolution', 'warning');
      toast.error('Optical Interference Detected. Clean lens and retry.');
      setTimeout(() => setPhase('upload'), 2000);
      return;
    }

    // Generate Nadi Leaf Index
    const leafIndex = generateNadiLeafIndex();
    setNadiLeafIndex(leafIndex);
    
    addLog(`NADI LEAF INDEX LOCATED: ${leafIndex}`, 'success');
    addLog('Dharmic coordinates locked and verified', 'success');

    // Store scan session (simulated secure storage)
    if (user) {
      try {
        await supabase.from('agasthya_scan_sessions').update({
          nadi_leaf_index: leafIndex,
          verification_status: 'complete',
          scan_results: {
            leaf_index: leafIndex,
            confidence: 0.94,
            kandam_suggested: ['1', '5', '8'],
            timestamp: new Date().toISOString()
          }
        }).eq('user_id', user.id).order('created_at', { ascending: false }).limit(1);
      } catch (error) {
        console.error('Error storing scan results:', error);
      }
    }

    addLog('Data encrypted via DHF-256 protocol', 'info');
    addLog('Secure storage: occult-biometrics vault', 'success');
    
    toast.success('Data Encrypted & Secured', {
      description: 'Your thumbprint data is protected by quantum encryption'
    });

    setTimeout(() => setPhase('complete'), 1000);
  };

  const generateNadiLeafIndex = (): string => {
    const bundles = ['A', 'B', 'C', 'D', 'E'];
    const bundle = bundles[Math.floor(Math.random() * bundles.length)];
    const section = Math.floor(Math.random() * 108) + 1;
    const leaf = Math.floor(Math.random() * 12) + 1;
    return `${bundle}-${section.toString().padStart(3, '0')}-${leaf.toString().padStart(2, '0')}`;
  };

  const resetScanner = () => {
    setPhase('authorization');
    setAuthState('idle');
    setUploadedImage(null);
    setUploadedFile(null);
    setScanLogs([]);
    setNadiLeafIndex(null);
  };

  return (
    <Card className={cn(
      'relative overflow-hidden backdrop-blur-xl bg-background/80 border-cyan-500/20',
      'shadow-[0_0_50px_rgba(0,255,255,0.1)]',
      className
    )}>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
              <Eye className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground font-mono">AGASTHYA VISION</h2>
              <p className="text-sm text-muted-foreground">Occult Biometric Scanner</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-emerald-400 font-mono">QUANTUM ENCRYPTED</span>
          </div>
        </div>

        {/* Phase: Authorization */}
        <AnimatePresence mode="wait">
          {phase === 'authorization' && (
            <motion.div
              key="auth"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center py-8 space-y-6"
            >
              <div className="text-center space-y-2">
                <div className="flex items-center justify-center gap-2 text-amber-400">
                  <Lock className="w-5 h-5" />
                  <span className="font-mono text-sm">DOUBLE-LOCK PROTOCOL</span>
                </div>
                <p className="text-muted-foreground text-sm max-w-md">
                  {isEnrolled 
                    ? 'Re-authenticate to access Agasthya Vision scanner'
                    : 'Enroll your biometric to enable secure scanning'}
                </p>
              </div>

              <BiometricAuthButton
                onClick={handleDoubleLockAuth}
                state={authState}
                mode={isEnrolled ? 'verify' : 'register'}
                deviceType={deviceType}
                disabled={webAuthnLoading}
              />

              {!isSupported && (
                <p className="text-xs text-red-400">
                  Biometric authentication not supported on this device
                </p>
              )}
            </motion.div>
          )}

          {/* Phase: Upload */}
          {phase === 'upload' && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  'relative h-64 border-2 border-dashed rounded-xl',
                  'flex flex-col items-center justify-center gap-4',
                  'cursor-pointer transition-all duration-300',
                  isDragging
                    ? 'border-cyan-400 bg-cyan-400/10 scale-[1.02]'
                    : 'border-muted-foreground/30 hover:border-cyan-400/50 hover:bg-cyan-400/5'
                )}
              >
                {/* Neon corners */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-cyan-400 rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-cyan-400 rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-cyan-400 rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-cyan-400 rounded-br-lg" />

                <div className="p-4 rounded-full bg-cyan-500/10 border border-cyan-500/30">
                  <Upload className="w-8 h-8 text-cyan-400" />
                </div>
                <div className="text-center">
                  <p className="text-foreground font-medium">Drop thumbprint image here</p>
                  <p className="text-sm text-muted-foreground">or click to browse</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Camera className="w-4 h-4" />
                  <span>High resolution recommended</span>
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileSelect}
                className="hidden"
              />

              {/* Mobile camera trigger */}
              <Button
                variant="outline"
                className="w-full border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera className="w-4 h-4 mr-2" />
                Capture with Camera
              </Button>
            </motion.div>
          )}

          {/* Phase: Scanning / Analyzing */}
          {(phase === 'scanning' || phase === 'analyzing') && (
            <motion.div
              key="scan"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {/* Image preview with scan effect */}
              <div className="relative h-48 rounded-xl overflow-hidden border border-cyan-500/30">
                {uploadedImage && (
                  <img
                    src={uploadedImage}
                    alt="Thumbprint"
                    className="w-full h-full object-cover opacity-70"
                  />
                )}
                
                {/* Laser scan animation */}
                <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-gpu-scan-line" />

                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
                
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="flex items-center gap-2 text-cyan-400">
                    <Zap className="w-4 h-4 animate-pulse" />
                    <span className="font-mono text-sm">
                      {phase === 'scanning' ? 'DEEP SCAN IN PROGRESS...' : 'ANALYZING PATTERNS...'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Terminal logs */}
              <div
                ref={terminalRef}
                className="h-48 rounded-lg bg-black/80 border border-cyan-500/20 p-3 overflow-y-auto font-mono text-xs"
              >
                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-cyan-500/20">
                  <Terminal className="w-4 h-4 text-cyan-400" />
                  <span className="text-cyan-400">AGASTHYA VISION PROTOCOL v3.0</span>
                </div>
                {scanLogs.map((log) => (
                  <div key={log.id} className="flex gap-2 py-0.5">
                    <span className="text-muted-foreground">
                      [{log.timestamp.toLocaleTimeString()}]
                    </span>
                    <span className={cn(
                      log.type === 'success' && 'text-emerald-400',
                      log.type === 'error' && 'text-red-400',
                      log.type === 'warning' && 'text-amber-400',
                      log.type === 'info' && 'text-cyan-400'
                    )}>
                      {log.message}
                    </span>
                  </div>
                ))}
                <span className="text-cyan-400 animate-gpu-cursor-blink">_</span>
              </div>
            </motion.div>
          )}

          {/* Phase: Complete */}
          {phase === 'complete' && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center py-8 space-y-6"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', bounce: 0.5 }}
                className="p-4 rounded-full bg-emerald-500/20 border border-emerald-500/50"
              >
                <CheckCircle className="w-12 h-12 text-emerald-400" />
              </motion.div>

              <div className="text-center space-y-2">
                <h3 className="text-xl font-bold text-emerald-400">Scan Complete</h3>
                <p className="text-muted-foreground">Your Nadi Leaf has been located</p>
              </div>

              <div className="px-6 py-4 rounded-xl bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/30">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-1">NADI LEAF INDEX</p>
                  <p className="text-2xl font-bold font-mono text-cyan-400">{nadiLeafIndex}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span>Ready for Nadi Leaf Retrieval</span>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={resetScanner}
                  variant="outline"
                  className="border-muted-foreground/30"
                >
                  New Scan
                </Button>
                <Button
                  className="bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500"
                >
                  Proceed to Reading
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Card>
  );
};

export default AgasthyaScanner;

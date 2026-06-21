import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Fingerprint, Scan, Check, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type AuthState = 'idle' | 'scanning' | 'success' | 'error';
type AuthMode = 'login' | 'verify' | 'register';

interface BiometricAuthButtonProps {
  onClick: () => void;
  state: AuthState;
  mode?: AuthMode;
  deviceType?: 'touchid' | 'faceid' | 'fingerprint' | 'unknown';
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const stateColors = {
  idle: 'from-cyan-500/20 to-cyan-600/10 border-cyan-500/50',
  scanning: 'from-amber-500/30 to-orange-600/20 border-amber-400/70',
  success: 'from-emerald-500/30 to-green-600/20 border-emerald-400/70',
  error: 'from-red-500/30 to-rose-600/20 border-red-400/70'
};

const stateGlows = {
  idle: 'shadow-[0_0_30px_rgba(0,255,255,0.3)]',
  scanning: 'shadow-[0_0_40px_rgba(255,165,0,0.5)]',
  success: 'shadow-[0_0_50px_rgba(0,255,128,0.6)]',
  error: 'shadow-[0_0_40px_rgba(255,50,50,0.5)]'
};

const modeLabels = {
  login: { idle: 'Secure Login', action: 'Verifying Identity...', success: 'Access Granted' },
  verify: { idle: 'Verify Identity', action: 'Scanning Biometrics...', success: 'Verified' },
  register: { idle: 'Register Biometric', action: 'Enrolling...', success: 'Enrolled' }
};

const deviceLabels = {
  touchid: 'Touch ID',
  faceid: 'Face ID',
  fingerprint: 'Fingerprint',
  unknown: 'Biometric'
};

const sizeConfig = {
  sm: { container: 'w-20 h-20', icon: 'w-8 h-8', text: 'text-xs' },
  md: { container: 'w-28 h-28', icon: 'w-12 h-12', text: 'text-sm' },
  lg: { container: 'w-36 h-36', icon: 'w-16 h-16', text: 'text-base' }
};

export const BiometricAuthButton: React.FC<BiometricAuthButtonProps> = ({
  onClick,
  state,
  mode = 'login',
  deviceType = 'unknown',
  disabled = false,
  className,
  size = 'lg'
}) => {
  const labels = modeLabels[mode];
  const sizes = sizeConfig[size];

  const getLabel = () => {
    switch (state) {
      case 'scanning':
        return labels.action;
      case 'success':
        return labels.success;
      case 'error':
        return 'Try Again';
      default:
        return labels.idle;
    }
  };

  const getIcon = () => {
    switch (state) {
      case 'scanning':
        return <Loader2 className={cn(sizes.icon, 'text-amber-400 animate-spin')} />;
      case 'success':
        return <Check className={cn(sizes.icon, 'text-emerald-400')} />;
      case 'error':
        return <X className={cn(sizes.icon, 'text-red-400')} />;
      default:
        return deviceType === 'faceid' 
          ? <Scan className={cn(sizes.icon, 'text-cyan-400')} />
          : <Fingerprint className={cn(sizes.icon, 'text-cyan-400')} />;
    }
  };

  return (
    <div className={cn('flex flex-col items-center gap-4', className)}>
      <motion.button
        onClick={onClick}
        disabled={disabled || state === 'scanning'}
        className={cn(
          'relative rounded-full border-2 backdrop-blur-xl',
          'bg-gradient-to-br flex items-center justify-center',
          'transition-all duration-500 cursor-pointer',
          'hover:scale-105 active:scale-95',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100',
          sizes.container,
          stateColors[state],
          stateGlows[state],
          state === 'scanning' && 'animate-gpu-glow-amber'
        )}
        whileHover={state === 'idle' ? { scale: 1.05 } : {}}
        whileTap={state === 'idle' ? { scale: 0.95 } : {}}
      >
        {/* Pulsing ring animation - CSS */}
        <AnimatePresence>
          {state === 'scanning' && (
            <div className="absolute inset-0 rounded-full border-2 border-amber-400/50 animate-gpu-ring-expand" />
          )}
        </AnimatePresence>

        {/* Success burst */}
        <AnimatePresence>
          {state === 'success' && (
            <motion.div
              className="absolute inset-0 rounded-full bg-emerald-400/20"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1.2, opacity: [0, 1, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
            />
          )}
        </AnimatePresence>

        {/* Error shake wrapper */}
        <motion.div
          animate={state === 'error' ? {
            x: [0, -10, 10, -10, 10, 0]
          } : {}}
          transition={{ duration: 0.4 }}
        >
          {getIcon()}
        </motion.div>

        {/* Scanning laser effect */}
        <AnimatePresence>
          {state === 'scanning' && (
            <div className="absolute inset-4 overflow-hidden rounded-full">
              <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent animate-gpu-scan-line" />
            </div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Labels */}
      <div className="text-center space-y-1">
        <motion.p
          key={state}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            'font-medium tracking-wide',
            sizes.text,
            state === 'success' && 'text-emerald-400',
            state === 'error' && 'text-red-400',
            state === 'scanning' && 'text-amber-400',
            state === 'idle' && 'text-cyan-400'
          )}
        >
          {getLabel()}
        </motion.p>
        <p className="text-xs text-muted-foreground">
          {deviceLabels[deviceType]}
        </p>
      </div>
    </div>
  );
};

export default BiometricAuthButton;

/**
 * Permission Activation Modal
 * Shows on sign-in/sign-up to activate all permissions with one click
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, Camera, MapPin, Bell, Shield, Zap, 
  CheckCircle2, Loader2, X, ChevronRight 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  AllPermissionsStatus,
  PermissionType,
  requestAllPermissions,
  hasActivatedPermissions,
  checkAllPermissions,
} from '@/utils/unifiedPermissionManager';

interface PermissionActivationModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  autoShow?: boolean;
  onComplete?: (status: AllPermissionsStatus) => void;
}

const PERMISSION_ITEMS = [
  { type: 'microphone' as PermissionType, icon: Mic, label: 'Voice', color: 'text-green-500' },
  { type: 'camera' as PermissionType, icon: Camera, label: 'Camera', color: 'text-blue-500' },
  { type: 'location' as PermissionType, icon: MapPin, label: 'Location', color: 'text-orange-500' },
  { type: 'notifications' as PermissionType, icon: Bell, label: 'Alerts', color: 'text-purple-500' },
];

export const PermissionActivationModal: React.FC<PermissionActivationModalProps> = ({
  open: controlledOpen,
  onOpenChange,
  autoShow = false,
  onComplete,
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [currentStep, setCurrentStep] = useState<PermissionType | null>(null);
  const [progress, setProgress] = useState(0);
  const [grantedPermissions, setGrantedPermissions] = useState<PermissionType[]>([]);

  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setIsOpen = onOpenChange || setInternalOpen;

  // Auto-show on mount if not already activated
  useEffect(() => {
    if (autoShow && !hasActivatedPermissions()) {
      // Delay to let the page render first
      const timer = setTimeout(() => {
        setInternalOpen(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [autoShow]);

  const handleActivate = async () => {
    setIsActivating(true);
    setProgress(0);
    setGrantedPermissions([]);

    try {
      const result = await requestAllPermissions((type, status) => {
        setCurrentStep(type);
        const types: PermissionType[] = ['microphone', 'camera', 'location', 'notifications', 'motion', 'orientation'];
        const index = types.indexOf(type);
        setProgress(((index + 1) / 6) * 100);
        
        if (status.state === 'granted') {
          setGrantedPermissions(prev => [...prev, type]);
        }
      });

      setIsComplete(true);
      
      // Success feedback
      if (result.grantedCount > 0) {
        toast.success(`${result.grantedCount} permissions activated!`, {
          description: result.allGranted ? 'MMora is fully operational' : 'Some features may be limited',
        });
      }

      onComplete?.(result);

      // Auto-close after success
      setTimeout(() => {
        setIsOpen(false);
        // Reset state after close
        setTimeout(() => {
          setIsComplete(false);
          setIsActivating(false);
          setProgress(0);
        }, 300);
      }, 2000);
    } catch (error) {
      console.error('[PermissionModal] Activation error:', error);
      toast.error('Activation error', { description: 'Please try again' });
      setIsActivating(false);
    }
  };

  const handleSkip = () => {
    setIsOpen(false);
    toast.info('Permissions skipped', {
      description: 'You can enable them later in Settings',
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md bg-card border-primary/20">
        <DialogHeader className="text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mx-auto mb-4 p-4 rounded-full bg-gradient-to-br from-primary/20 to-accent/20"
          >
            {isComplete ? (
              <CheckCircle2 className="w-12 h-12 text-green-500" />
            ) : (
              <Shield className="w-12 h-12 text-primary" />
            )}
          </motion.div>
          
          <DialogTitle className="text-xl">
            {isComplete ? 'All Set!' : 'Enable MMora Features'}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {isComplete 
              ? 'Your permissions are now active'
              : 'Grant permissions to unlock the full experience'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Permission Icons Grid */}
          <div className="flex justify-center gap-4">
            {PERMISSION_ITEMS.map((item, index) => {
              const Icon = item.icon;
              const isGranted = grantedPermissions.includes(item.type);
              const isCurrent = currentStep === item.type;

              return (
                <motion.div
                  key={item.type}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex flex-col items-center gap-1"
                >
                  <div
                    className={cn(
                      "p-3 rounded-full transition-all",
                      isGranted 
                        ? "bg-green-500/20 ring-2 ring-green-500" 
                        : isCurrent 
                          ? "bg-primary/20 ring-2 ring-primary animate-pulse"
                          : "bg-muted"
                    )}
                  >
                    {isGranted ? (
                      <CheckCircle2 className="w-6 h-6 text-green-500" />
                    ) : (
                      <Icon className={cn("w-6 h-6", isCurrent ? "text-primary" : "text-muted-foreground")} />
                    )}
                  </div>
                  <span className={cn(
                    "text-xs",
                    isGranted ? "text-green-500" : "text-muted-foreground"
                  )}>
                    {item.label}
                  </span>
                </motion.div>
              );
            })}
          </div>

          {/* Progress Bar */}
          {isActivating && !isComplete && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-2"
            >
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-center text-muted-foreground">
                Requesting {currentStep}...
              </p>
            </motion.div>
          )}

          {/* Features List */}
          {!isActivating && !isComplete && (
            <div className="space-y-2">
              {[
                { icon: Mic, text: 'Talk to Zoe hands-free' },
                { icon: Camera, text: 'Face ID & AR experiences' },
                { icon: MapPin, text: 'Location-based features' },
                { icon: Bell, text: 'Smart notifications' },
              ].map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + index * 0.1 }}
                  className="flex items-center gap-3 text-sm text-muted-foreground"
                >
                  <feature.icon className="w-4 h-4 text-primary" />
                  <span>{feature.text}</span>
                </motion.div>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          {!isComplete && (
            <div className="flex flex-col gap-2">
              <Button
                onClick={handleActivate}
                disabled={isActivating}
                className="w-full h-12 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
              >
                {isActivating ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Activating...
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5 mr-2" />
                    Enable All Features
                  </>
                )}
              </Button>
              
              {!isActivating && (
                <Button
                  variant="ghost"
                  onClick={handleSkip}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Skip for now
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              )}
            </div>
          )}

          {/* Success State */}
          {isComplete && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <p className="text-sm text-green-500 font-medium">
                {grantedPermissions.length} permissions activated
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Closing automatically...
              </p>
            </motion.div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PermissionActivationModal;

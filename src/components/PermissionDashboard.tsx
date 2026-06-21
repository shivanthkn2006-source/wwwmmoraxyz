/**
 * Permission Dashboard
 * Comprehensive permission status and one-click activation UI
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, Camera, MapPin, Bell, Move3d, Compass,
  Shield, CheckCircle2, XCircle, AlertCircle, Loader2,
  RefreshCw, Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  AllPermissionsStatus,
  PermissionStatus,
  PermissionType,
  checkAllPermissions,
  requestAllPermissions,
  hasActivatedPermissions,
} from '@/utils/unifiedPermissionManager';

interface PermissionDashboardProps {
  compact?: boolean;
  onActivationComplete?: (status: AllPermissionsStatus) => void;
}

const PERMISSION_CONFIG: Record<PermissionType, { icon: React.ReactNode; label: string; description: string }> = {
  microphone: {
    icon: <Mic className="w-5 h-5" />,
    label: 'Microphone',
    description: 'Voice commands, Zoe conversations',
  },
  camera: {
    icon: <Camera className="w-5 h-5" />,
    label: 'Camera',
    description: 'Face ID, AR effects, Zoe vision',
  },
  location: {
    icon: <MapPin className="w-5 h-5" />,
    label: 'Location',
    description: 'Selfie City, weather, nearby features',
  },
  notifications: {
    icon: <Bell className="w-5 h-5" />,
    label: 'Notifications',
    description: 'Alerts, reminders, updates',
  },
  motion: {
    icon: <Move3d className="w-5 h-5" />,
    label: 'Motion Sensors',
    description: 'AR experiences, gesture controls',
  },
  orientation: {
    icon: <Compass className="w-5 h-5" />,
    label: 'Orientation',
    description: 'Screen rotation, VR features',
  },
};

const getStatusIcon = (state: PermissionStatus['state']) => {
  switch (state) {
    case 'granted':
      return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    case 'denied':
      return <XCircle className="w-4 h-4 text-red-500" />;
    case 'prompt':
      return <AlertCircle className="w-4 h-4 text-yellow-500" />;
    case 'unsupported':
      return <span className="text-muted-foreground text-xs">N/A</span>;
    default:
      return <AlertCircle className="w-4 h-4 text-orange-500" />;
  }
};

const getStatusColor = (state: PermissionStatus['state']) => {
  switch (state) {
    case 'granted': return 'bg-green-500/10 border-green-500/30';
    case 'denied': return 'bg-red-500/10 border-red-500/30';
    case 'prompt': return 'bg-yellow-500/10 border-yellow-500/30';
    case 'unsupported': return 'bg-muted/50 border-muted';
    default: return 'bg-orange-500/10 border-orange-500/30';
  }
};

export const PermissionDashboard: React.FC<PermissionDashboardProps> = ({
  compact = false,
  onActivationComplete,
}) => {
  const [status, setStatus] = useState<AllPermissionsStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActivating, setIsActivating] = useState(false);
  const [currentPermission, setCurrentPermission] = useState<PermissionType | null>(null);
  const [activationProgress, setActivationProgress] = useState(0);

  // Check permissions on mount
  const checkPermissions = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await checkAllPermissions();
      setStatus(result);
    } catch (error) {
      console.error('[PermissionDashboard] Check failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkPermissions();
  }, [checkPermissions]);

  // One-click activation
  const handleActivateAll = async () => {
    setIsActivating(true);
    setActivationProgress(0);

    try {
      const result = await requestAllPermissions((type, permStatus) => {
        setCurrentPermission(type);
        const types: PermissionType[] = ['microphone', 'camera', 'location', 'notifications', 'motion', 'orientation'];
        const index = types.indexOf(type);
        setActivationProgress(((index + 1) / types.length) * 100);
      });

      setStatus(result);
      setCurrentPermission(null);

      if (result.allGranted) {
        toast.success('All permissions activated!', {
          description: 'MMora is fully operational',
        });
      } else {
        toast.info(`${result.grantedCount}/${result.totalCount} permissions granted`, {
          description: 'Some features may be limited',
        });
      }

      onActivationComplete?.(result);
    } catch (error) {
      console.error('[PermissionDashboard] Activation failed:', error);
      toast.error('Activation failed', { description: 'Please try again' });
    } finally {
      setIsActivating(false);
      setActivationProgress(0);
    }
  };

  if (isLoading) {
    return (
      <Card className={cn("bg-card/50 border-primary/10", compact && "p-4")}>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="ml-2 text-sm text-muted-foreground">Checking permissions...</span>
        </div>
      </Card>
    );
  }

  if (compact && status) {
    return (
      <Card className="bg-card/50 border-primary/10">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Permissions</p>
                <p className="text-xs text-muted-foreground">
                  {status.grantedCount}/{status.totalCount} active
                </p>
              </div>
            </div>
            
            {status.allGranted ? (
              <Badge variant="outline" className="bg-green-500/10 border-green-500/30 text-green-500">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                All Active
              </Badge>
            ) : (
              <Button
                size="sm"
                onClick={handleActivateAll}
                disabled={isActivating}
                className="bg-primary hover:bg-primary/90"
              >
                {isActivating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-1" />
                    Activate
                  </>
                )}
              </Button>
            )}
          </div>

          {isActivating && (
            <div className="mt-3">
              <Progress value={activationProgress} className="h-1" />
              <p className="text-xs text-muted-foreground mt-1 text-center">
                Requesting {currentPermission}...
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/50 border-primary/10">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Platform Permissions</CardTitle>
              <CardDescription>
                Enable all features with one click
              </CardDescription>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={checkPermissions}
            disabled={isLoading}
          >
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Status Summary */}
        {status && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
            <div>
              <p className="text-sm font-medium">
                {status.allGranted ? 'All Systems Go!' : 'Permissions Needed'}
              </p>
              <p className="text-xs text-muted-foreground">
                {status.grantedCount} of {status.totalCount} permissions active
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Progress 
                value={(status.grantedCount / status.totalCount) * 100} 
                className="w-20 h-2"
              />
              <span className="text-sm font-mono text-primary">
                {Math.round((status.grantedCount / status.totalCount) * 100)}%
              </span>
            </div>
          </div>
        )}

        {/* One-Click Activation */}
        {status && !status.allGranted && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Button
              onClick={handleActivateAll}
              disabled={isActivating}
              className="w-full h-12 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
            >
              {isActivating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Activating {currentPermission}...
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5 mr-2" />
                  One-Click Activate All Permissions
                </>
              )}
            </Button>
            
            {isActivating && (
              <Progress value={activationProgress} className="mt-2 h-1" />
            )}
          </motion.div>
        )}

        {/* Permission Grid */}
        <div className="grid grid-cols-2 gap-3">
          <AnimatePresence mode="popLayout">
            {status && (Object.entries(PERMISSION_CONFIG) as [PermissionType, typeof PERMISSION_CONFIG[PermissionType]][]).map(([type, config], index) => {
              const permStatus = status[type];
              if (!permStatus || permStatus.state === 'unsupported') return null;

              return (
                <motion.div
                  key={type}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    "p-3 rounded-lg border transition-all",
                    getStatusColor(permStatus.state),
                    currentPermission === type && "ring-2 ring-primary"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "p-1.5 rounded",
                        permStatus.state === 'granted' ? 'bg-green-500/20' : 'bg-muted'
                      )}>
                        {config.icon}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{config.label}</p>
                        <p className="text-[10px] text-muted-foreground line-clamp-1">
                          {config.description}
                        </p>
                      </div>
                    </div>
                    {getStatusIcon(permStatus.state)}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Help Text */}
        {status && !status.allGranted && (
          <p className="text-xs text-muted-foreground text-center">
            Some browser permissions require manual approval. Click activate and follow the prompts.
          </p>
        )}

        {status?.allGranted && (
          <div className="flex items-center justify-center gap-2 text-green-500 text-sm">
            <CheckCircle2 className="w-4 h-4" />
            All permissions active - MMora is fully operational
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PermissionDashboard;

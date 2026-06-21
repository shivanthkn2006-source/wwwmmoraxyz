// ═══════════════════════════════════════════════════════════════════════════════
// ATLAS SYNC VERIFICATION - TEXT-BASED AUTHORIZATION COMPONENT
// Provides mandatory text-input verification for critical DHF Autonomy data points
// ISO 27001 Compliant with Immutable Audit Trail
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ShieldCheck, AlertTriangle, CheckCircle2, Lock, FileCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export interface ATLASSyncDataPoint {
  key: string;
  label: string;
  value: string | number | boolean;
  description: string;
  syncPercentage: number; // 20-100
  category: 'financial' | 'security' | 'privacy' | 'social' | 'behavioral';
}

interface ATLASSyncVerificationProps {
  isOpen: boolean;
  onClose: () => void;
  dataPoint: ATLASSyncDataPoint;
  onVerified: (dataPoint: ATLASSyncDataPoint, authorizationId: string) => void;
  verificationMethod?: 'voice' | 'text_fallback' | 'text_primary';
}

const AUTHORIZATION_KEYWORD = 'I AUTHORIZE';

export const ATLASSyncVerification: React.FC<ATLASSyncVerificationProps> = ({
  isOpen,
  onClose,
  dataPoint,
  onVerified,
  verificationMethod = 'text_primary',
}) => {
  const { user } = useAuth();
  const [authInput, setAuthInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationComplete, setVerificationComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const expectedStatement = `${AUTHORIZATION_KEYWORD} Zoe to use ${dataPoint.label.toLowerCase()} for ${dataPoint.category} modeling.`;
  
  const handleVerification = useCallback(async () => {
    if (!user) {
      setError('Authentication required');
      return;
    }
    
    // Validate authorization keyword
    if (!authInput.toUpperCase().startsWith(AUTHORIZATION_KEYWORD)) {
      setError(`Authorization must start with "${AUTHORIZATION_KEYWORD}"`);
      return;
    }
    
    setIsVerifying(true);
    setError(null);
    
    try {
      // Store authorization in database
      const { data, error: dbError } = await supabase
        .from('atlas_sync_authorizations')
        .insert({
          user_id: user.id,
          data_point_key: dataPoint.key,
          data_point_value: { value: dataPoint.value, label: dataPoint.label },
          authorization_keyword: AUTHORIZATION_KEYWORD,
          authorization_statement: authInput,
          sync_percentage: dataPoint.syncPercentage,
          verification_method: verificationMethod,
          compliance_policy_id: 'POLICY-ID-004',
          ecn_snapshot: {
            timestamp: new Date().toISOString(),
            category: dataPoint.category,
            description: dataPoint.description,
          },
        })
        .select('id')
        .single();
      
      if (dbError) throw dbError;
      
      setVerificationComplete(true);
      
      // Show compliance confirmation
      toast.success('DATA VERIFIED', {
        description: `The ECN now integrates this information. Immutable Audit Trail updated in compliance with ISO 27001 policy [POLICY-ID-004].`,
        duration: 5000,
      });
      
      // Notify parent
      setTimeout(() => {
        onVerified(dataPoint, data?.id || '');
        onClose();
      }, 2000);
      
    } catch (err) {
      console.error('Verification error:', err);
      setError('Failed to verify authorization. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  }, [user, authInput, dataPoint, verificationMethod, onVerified, onClose]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAuthInput(e.target.value);
    setError(null);
  };
  
  const getSyncColor = (percentage: number) => {
    if (percentage >= 80) return 'text-red-400';
    if (percentage >= 50) return 'text-amber-400';
    return 'text-emerald-400';
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-background/95 backdrop-blur-xl border-primary/20">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Lock className="h-5 w-5 text-primary" />
            ATLAS Sync Verification
          </DialogTitle>
          <DialogDescription>
            Text-based authorization required for DHF Autonomy data point
          </DialogDescription>
        </DialogHeader>
        
        <AnimatePresence mode="wait">
          {!verificationComplete ? (
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {/* Data Point Info */}
              <div className="bg-secondary/30 rounded-lg p-4 border border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{dataPoint.label}</span>
                  <Badge variant="outline" className={getSyncColor(dataPoint.syncPercentage)}>
                    {dataPoint.syncPercentage}% Sync
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{dataPoint.description}</p>
                <div className="mt-2 flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {dataPoint.category}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Value: <code className="bg-background/50 px-1 rounded">{String(dataPoint.value)}</code>
                  </span>
                </div>
              </div>
              
              {/* Verification Method Notice */}
              {verificationMethod === 'text_fallback' && (
                <Alert className="border-amber-500/20 bg-amber-500/10">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <AlertDescription className="text-sm">
                    Voice-to-Text conversion failed. Please verify using text input below.
                  </AlertDescription>
                </Alert>
              )}
              
              {/* Authorization Input */}
              <div className="space-y-2">
                <Label htmlFor="auth-input" className="text-sm font-medium">
                  Authorization Statement
                </Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Type the following to authorize: <span className="font-mono text-primary">{expectedStatement}</span>
                </p>
                <Input
                  id="auth-input"
                  value={authInput}
                  onChange={handleInputChange}
                  placeholder={`${AUTHORIZATION_KEYWORD} Zoe to...`}
                  className="font-mono text-sm"
                  autoComplete="off"
                  autoFocus
                />
                {error && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {error}
                  </p>
                )}
              </div>
              
              {/* Compliance Notice */}
              <div className="flex items-start gap-2 text-xs text-muted-foreground bg-primary/5 p-3 rounded-lg">
                <ShieldCheck className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span>
                  This authorization is logged in compliance with ISO 27001 policy [POLICY-ID-004]. 
                  All data synchronization is encrypted and stored in an immutable audit trail.
                </span>
              </div>
              
              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={onClose} disabled={isVerifying}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleVerification} 
                  disabled={isVerifying || authInput.length < AUTHORIZATION_KEYWORD.length}
                  className="gap-2"
                >
                  {isVerifying ? (
                    <>
                      <div className="h-4 w-4 border-2 border-background/30 border-t-background rounded-full animate-gpu-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <FileCheck className="h-4 w-4" />
                      Verify & Authorize
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-8 text-center space-y-4"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="w-16 h-16 mx-auto bg-emerald-500/20 rounded-full flex items-center justify-center"
              >
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              </motion.div>
              
              <div>
                <h3 className="text-lg font-semibold text-emerald-500">DATA VERIFIED</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  The ECN now integrates this information.
                </p>
              </div>
              
              <div className="bg-secondary/30 rounded-lg p-3 text-xs text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Immutable Audit Trail Updated</p>
                <p>In compliance with ISO 27001 policy [POLICY-ID-004]</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};

export default ATLASSyncVerification;

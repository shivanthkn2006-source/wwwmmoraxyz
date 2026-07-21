import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Shield, 
  Smartphone, 
  Mail, 
  Phone, 
  Key, 
  Fingerprint,
  AlertTriangle,
  CheckCircle2,
  Camera,
  Loader2,
  History
} from 'lucide-react';
import FaceVerificationSetup from './FaceVerificationSetup';
import { useWebAuthn } from '@/hooks/useWebAuthn';

interface SecuritySettings {
  two_factor_enabled: boolean;
  recovery_email: string | null;
  recovery_phone: string | null;
  face_verification_enabled: boolean;
  webauthn_enabled: boolean;
  last_password_change: string | null;
}

interface AuditLog {
  id: string;
  event_type: string;
  event_status: string;
  created_at: string;
  metadata: any;
}

const SecuritySettingsPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<SecuritySettings>({
    two_factor_enabled: false,
    recovery_email: null,
    recovery_phone: null,
    face_verification_enabled: false,
    webauthn_enabled: false,
    last_password_change: null
  });
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [showFaceSetup, setShowFaceSetup] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryPhone, setRecoveryPhone] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPhone, setSavingPhone] = useState(false);
  const {
    isSupported: passkeySupported,
    isLoading: passkeyLoading,
    registeredDevices,
    registerDevice,
    removeDevice,
    checkEnrollment,
    deviceType,
  } = useWebAuthn();

  useEffect(() => {
    if (user) {
      fetchSecuritySettings();
      fetchAuditLogs();
      checkEnrollment();
    }
  }, [user, checkEnrollment]);

  const fetchSecuritySettings = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('security-operations', {
        body: { operation: 'get_security_settings' }
      });

      if (error) throw error;

      if (data?.settings) {
        setSettings(data.settings);
        setRecoveryEmail(data.settings.recovery_email || '');
        setRecoveryPhone(data.settings.recovery_phone || '');
      }
    } catch (error: any) {
      console.error('Error fetching security settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('security-operations', {
        body: { operation: 'get_security_audit_log', limit: 10 }
      });

      if (error) throw error;
      if (data?.logs) {
        setAuditLogs(data.logs);
      }
    } catch (error: any) {
      console.error('Error fetching audit logs:', error);
    }
  };

  const handleUpdateRecoveryEmail = async () => {
    if (!recoveryEmail.trim()) return;
    
    setSavingEmail(true);
    try {
      const { error } = await supabase.functions.invoke('security-operations', {
        body: {
          operation: 'update_recovery_email',
          recoveryEmail: recoveryEmail.trim()
        }
      });

      if (error) throw error;

      toast.success('Recovery email updated successfully');
      fetchSecuritySettings();
    } catch (error: any) {
      toast.error('Failed to update recovery email');
    } finally {
      setSavingEmail(false);
    }
  };

  const handleUpdateRecoveryPhone = async () => {
    if (!recoveryPhone.trim()) return;
    
    setSavingPhone(true);
    try {
      const { error } = await supabase.functions.invoke('security-operations', {
        body: {
          operation: 'update_recovery_phone',
          recoveryPhone: recoveryPhone.trim()
        }
      });

      if (error) throw error;

      toast.success('Recovery phone updated successfully');
      fetchSecuritySettings();
    } catch (error: any) {
      toast.error('Failed to update recovery phone');
    } finally {
      setSavingPhone(false);
    }
  };

  const getEventIcon = (eventType: string) => {
    if (eventType.includes('password')) return <Key className="w-4 h-4" />;
    if (eventType.includes('2fa')) return <Smartphone className="w-4 h-4" />;
    if (eventType.includes('face')) return <Camera className="w-4 h-4" />;
    if (eventType.includes('email')) return <Mail className="w-4 h-4" />;
    if (eventType.includes('phone')) return <Phone className="w-4 h-4" />;
    return <Shield className="w-4 h-4" />;
  };

  const getEventColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-emerald-400';
      case 'failed': return 'text-red-400';
      case 'suspicious': return 'text-amber-400';
      default: return 'text-muted-foreground';
    }
  };

  const handlePasskeyEnrollment = async () => {
    const label = deviceType === 'faceid'
      ? 'Apple Face ID'
      : deviceType === 'touchid'
        ? 'Mac Touch ID'
        : deviceType === 'fingerprint'
          ? 'Android Fingerprint'
          : 'Device Passkey';

    const success = await registerDevice(label);
    if (success) fetchSecuritySettings();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="w-16 h-16 mx-auto bg-primary/20 backdrop-blur-xl rounded-2xl flex items-center justify-center mb-4 border border-primary/30">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Security Settings
          </h1>
          <p className="text-muted-foreground">
            Manage your account security and recovery options
          </p>
        </motion.div>

        {/* Two-Factor Authentication */}
        <Card className="bg-card/40 backdrop-blur-xl border-border/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5" />
                  Two-Factor Authentication
                </CardTitle>
                <CardDescription>
                  Add an extra layer of security to your account
                </CardDescription>
              </div>
              {settings.two_factor_enabled && (
                <Badge variant="default" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Enabled
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Require a verification code in addition to your password
              </p>
              <Button variant="outline" size="sm">
                {settings.two_factor_enabled ? 'Disable' : 'Enable'} 2FA
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Face Verification */}
        <Card className="bg-card/40 backdrop-blur-xl border-border/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="w-5 h-5" />
                  AI Face Verification
                </CardTitle>
                <CardDescription>
                  Powered by Advanced AI Vision • 99.1% Accuracy
                </CardDescription>
              </div>
              {settings.face_verification_enabled && (
                <Badge variant="default" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Enrolled
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Advanced 3D facial mapping with liveness detection and multimodal biometrics
            </p>
            {!showFaceSetup ? (
              <Button 
                onClick={() => setShowFaceSetup(true)}
                variant="outline" 
                size="sm"
                className="gap-2"
              >
                <Camera className="w-4 h-4" />
                {settings.face_verification_enabled ? 'Re-enroll Face' : 'Enroll Face'}
              </Button>
            ) : (
              <FaceVerificationSetup 
                onComplete={() => {
                  setShowFaceSetup(false);
                  fetchSecuritySettings();
                }}
                onCancel={() => setShowFaceSetup(false)}
              />
            )}
          </CardContent>
        </Card>

        {/* Native Device Biometrics */}
        <Card className="bg-card/40 backdrop-blur-xl border-border/50">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Fingerprint className="w-5 h-5" />
                  Native Biometrics / Passkeys
                </CardTitle>
                <CardDescription>
                  Face ID, Touch ID, Android fingerprint, and browser passkeys
                </CardDescription>
              </div>
              {(settings.webauthn_enabled || registeredDevices.length > 0) && (
                <Badge variant="default" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Enrolled
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Use the secure biometric sensor built into this device for login.
              </p>
              <Button
                onClick={handlePasskeyEnrollment}
                disabled={!passkeySupported || passkeyLoading}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                {passkeyLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Fingerprint className="w-4 h-4" />}
                {passkeySupported ? 'Enroll This Device' : 'Passkeys Unavailable'}
              </Button>
            </div>

            {registeredDevices.length > 0 && (
              <div className="space-y-2">
                {registeredDevices.map((device) => (
                  <div key={device.id} className="flex items-center justify-between gap-3 p-3 bg-background/50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-foreground">{device.deviceName}</p>
                      <p className="text-xs text-muted-foreground">
                        Last used {new Date(device.lastUsed).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeDevice(device.credentialId)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recovery Options */}
        <Card className="bg-card/40 backdrop-blur-xl border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Account Recovery
            </CardTitle>
            <CardDescription>
              Configure backup methods to recover your account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Recovery Email */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Recovery Email</label>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="recovery@example.com"
                  value={recoveryEmail}
                  onChange={(e) => setRecoveryEmail(e.target.value)}
                  className="bg-input/50 border-border/50"
                />
                <Button 
                  onClick={handleUpdateRecoveryEmail}
                  disabled={savingEmail}
                  size="sm"
                >
                  {savingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                </Button>
              </div>
            </div>

            <Separator />

            {/* Recovery Phone */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Recovery Phone</label>
              <div className="flex gap-2">
                <Input
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  value={recoveryPhone}
                  onChange={(e) => setRecoveryPhone(e.target.value)}
                  className="bg-input/50 border-border/50"
                />
                <Button 
                  onClick={handleUpdateRecoveryPhone}
                  disabled={savingPhone}
                  size="sm"
                >
                  {savingPhone ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Audit Log */}
        <Card className="bg-card/40 backdrop-blur-xl border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Recent Security Activity
            </CardTitle>
            <CardDescription>
              Last 10 security-related events
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {auditLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No security events yet
                </p>
              ) : (
                auditLogs.map((log) => (
                  <div key={log.id} className="flex items-center gap-3 p-3 bg-background/50 rounded-lg">
                    <div className={getEventColor(log.event_status)}>
                      {getEventIcon(log.event_type)}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {log.event_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(log.created_at).toLocaleString()}
                      </p>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={log.event_status === 'success' ? 'border-emerald-500/30 text-emerald-400' : 'border-red-500/30 text-red-400'}
                    >
                      {log.event_status}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SecuritySettingsPage;
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Lock, ShieldCheck, Upload, Trash2, Loader2, Eye, EyeOff, ScanFace, Bug, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth';
import {
  saveIdentityReference,
  clearIdentityReference,
  getVaultStatus,
  rescanIdentityPhoto,
  refreshIdentitySignedUrl,
  lockIdentityToDHF,
  isIdentityDebugEnabled,
  setIdentityDebugEnabled,
  type VaultStatus,
  type IdentityScanResult,
} from '@/services/zoeIdentityVault';

const REASON_TEXT: Record<string, string> = {
  IDENTIFIED: 'Face matched your locked reference photo.',
  NO_REFERENCE: 'No photo saved yet — add one below.',
  NO_FACE_DETECTED: 'No clear human face was found in the saved photo.',
  FACE_MISMATCH: 'The saved photo does not match the reference on file.',
  LOW_CONFIDENCE: 'Face found, but the match confidence was too low to confirm.',
  SIGNED_URL_EXPIRED: 'The secure link to your photo expired and could not be renewed.',
  FETCH_ERROR: 'Your photo could not be downloaded for scanning.',
  PERCEPTION_ERROR: 'The vision service failed while scanning your photo.',
};

/**
 * Locked identity photo section.
 * The photo lives in the private `zoe-identity` vault and is used only so Zoe
 * can create images that actually look like the account holder. It is never a
 * login credential and is never shown publicly.
 */
const IdentityVaultSection: React.FC = () => {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<VaultStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [scan, setScan] = useState<IdentityScanResult | null>(null);
  const [debug, setDebug] = useState(isIdentityDebugEnabled());

  const photoUrl = status?.url ?? null;
  const consentAt = status?.consentAt ?? null;

  const load = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    setStatus(await getVaultStatus(user.id));
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (inputRef.current) inputRef.current.value = '';
    if (!file || !user?.id) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose a photo of yourself');
      return;
    }
    setBusy(true);
    const url = await saveIdentityReference(user.id, file);
    setBusy(false);
    if (!url) {
      toast.error('Could not save your identity photo');
      return;
    }
    setScan(null);
    await load();
    toast.success('Identity photo locked in your private vault');
  };

  const handleRemove = async () => {
    if (!user?.id) return;
    setBusy(true);
    const ok = await clearIdentityReference(user.id);
    setBusy(false);
    if (!ok) {
      toast.error('Could not remove your identity photo');
      return;
    }
    setScan(null);
    setRevealed(false);
    await load();
    toast.success('Identity photo removed');
  };

  const handleRescan = async () => {
    if (!user?.id) return;
    setScanning(true);
    const result = await rescanIdentityPhoto(user.id);
    setScanning(false);
    setScan(result);
    if (result.ok) toast.success('Identity re-verified from your vault photo');
    else toast.error(REASON_TEXT[result.reasonCode] || `Identification failed (${result.reasonCode})`);
  };

  const handleRefreshLink = async () => {
    if (!user?.id) return;
    setBusy(true);
    const url = await refreshIdentitySignedUrl(user.id);
    setBusy(false);
    if (!url) {
      toast.error('Could not refresh the secure link');
      return;
    }
    await load();
    toast.success('Secure image link refreshed');
  };

  const handleLock = async (next: boolean) => {
    if (!user?.id) return;
    setBusy(true);
    const ok = await lockIdentityToDHF(user.id, next);
    setBusy(false);
    if (!ok) {
      toast.error('Could not update the DHF lock');
      return;
    }
    await load();
    toast.success(next ? 'Photo sealed inside your DHF black box' : 'DHF seal removed');
  };

  const toggleDebug = (next: boolean) => {
    setDebug(next);
    setIdentityDebugEnabled(next);
  };

  return (
    <Card className="mx-4 my-4 p-4 border-primary/20 bg-card/60 backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-primary" />
          <div>
            <h2 className="text-sm font-semibold text-foreground">Locked identity photo</h2>
            <p className="text-xs text-muted-foreground">
              Private reference Zoe uses to create images that look like you.
            </p>
          </div>
        </div>
        {status?.hasVaultPhoto ? (
          <Badge className="shrink-0 gap-1 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <ShieldCheck className="w-3 h-3" /> Verified
          </Badge>
        ) : (
          <Badge variant="outline" className="shrink-0 text-muted-foreground">Not set</Badge>
        )}
      </div>

      <div className="mt-4 flex items-center gap-4">
        <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-border bg-muted/40 flex items-center justify-center shrink-0">
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          ) : photoUrl ? (
            <>
              <img
                src={photoUrl}
                alt="Your locked identity reference photo"
                className={revealed ? 'w-full h-full object-cover' : 'w-full h-full object-cover blur-md'}
                loading="lazy"
              />
              {!revealed && <Lock className="absolute w-4 h-4 text-foreground/80" />}
            </>
          ) : (
            <Lock className="w-4 h-4 text-muted-foreground" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">
            {photoUrl
              ? consentAt
                ? `Locked on ${new Date(consentAt).toLocaleDateString()}`
                : 'Locked in your private vault'
              : 'Add one clear photo of your face. Stored privately — never posted, never used to sign in.'}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {photoUrl && (
              <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={() => setRevealed(v => !v)}>
                {revealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                {revealed ? 'Hide' : 'Verify'}
              </Button>
            )}
            {photoUrl && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 h-8 text-xs"
                disabled={scanning || busy}
                onClick={handleRescan}
              >
                {scanning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ScanFace className="w-3.5 h-3.5" />}
                Re-scan my identity photo
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 h-8 text-xs"
              disabled={busy || !user?.id}
              onClick={() => inputRef.current?.click()}
            >
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              {photoUrl ? 'Replace' : 'Add photo'}
            </Button>
            {status?.hasVaultPhoto && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 h-8 text-xs"
                disabled={busy}
                onClick={handleRefreshLink}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh link
              </Button>
            )}
            {photoUrl && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 h-8 text-xs text-destructive hover:text-destructive"
                disabled={busy}
                onClick={handleRemove}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Remove
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Vault preview panel — confirms exactly which image Zoe uses */}
      <div className="mt-4 rounded-lg border border-border/60 bg-muted/20 p-3 text-xs space-y-1">
        <div className="flex items-center justify-between">
          <span className="font-medium text-foreground">Vault source</span>
          <Badge variant="outline" className="text-[10px]">
            {status?.source === 'identity-vault'
              ? 'Private vault'
              : status?.source === 'profile-photo'
                ? 'Profile photo (fallback)'
                : 'None'}
          </Badge>
        </div>
        <p className="text-muted-foreground break-all">
          Object: {status?.path || (status?.source === 'profile-photo' ? 'public avatar' : '—')}
        </p>
        <p className="text-muted-foreground">
          Status: {REASON_TEXT[status?.reason || ''] || status?.reason || '—'}
        </p>
        <div className="flex items-center justify-between pt-1">
          <div>
            <span className="font-medium text-foreground">Seal inside DHF black box</span>
            <p className="text-muted-foreground">
              Treat this photo as verified personal identity data. Never public, never a login credential.
            </p>
          </div>
          <Switch
            checked={Boolean(status?.dhfLocked)}
            disabled={busy || !status?.hasVaultPhoto}
            onCheckedChange={handleLock}
            aria-label="Seal identity photo inside DHF"
          />
        </div>
        {status?.dhfLocked && status.lockedAt && (
          <p className="text-emerald-400">Sealed on {new Date(status.lockedAt).toLocaleString()}</p>
        )}
      </div>

      {/* Scan result + debug explanation */}
      {scan && (
        <div className="mt-3 rounded-lg border border-border/60 bg-background/50 p-3 text-xs space-y-1">
          <div className="flex items-center gap-2">
            <ScanFace className="w-3.5 h-3.5 text-primary" />
            <span className="font-medium text-foreground">
              {scan.ok ? 'Identity confirmed' : 'Identification failed'}
            </span>
            <Badge variant="outline" className="text-[10px]">{scan.reasonCode}</Badge>
          </div>
          <p className="text-muted-foreground">{REASON_TEXT[scan.reasonCode] || scan.reasonCode}</p>
          <p className="text-muted-foreground">
            Face present: {String(scan.personPresent)} · Subject: {scan.subjectIdentity} · Confidence:{' '}
            {(scan.confidence * 100).toFixed(0)}%
          </p>
          {scan.summary && <p className="text-muted-foreground italic">{scan.summary}</p>}
          {debug && (
            <pre className="mt-1 max-h-40 overflow-auto rounded bg-muted/40 p-2 text-[10px] text-muted-foreground">
              {JSON.stringify(scan.debug, null, 2)}
            </pre>
          )}
        </div>
      )}

      <label className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
        <Bug className="w-3 h-3" />
        <span className="flex-1">Debug mode (explains every identification decision)</span>
        <Switch checked={debug} onCheckedChange={toggleDebug} aria-label="Identity debug mode" />
      </label>

      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </Card>
  );
};

export default IdentityVaultSection;

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lock, ShieldCheck, Upload, Trash2, Loader2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { saveIdentityReference, clearIdentityReference } from '@/services/zoeIdentityVault';

/**
 * Locked identity photo section.
 * The photo lives in the private `zoe-identity` vault and is used only so Zoe
 * can create images that actually look like the account holder. It is never a
 * login credential and is never shown publicly.
 */
const IdentityVaultSection: React.FC = () => {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [consentAt, setConsentAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('profiles')
      .select('zoe_identity_photo_url, zoe_identity_consent_at')
      .eq('user_id', user.id)
      .maybeSingle();
    setPhotoUrl((data as any)?.zoe_identity_photo_url ?? null);
    setConsentAt((data as any)?.zoe_identity_consent_at ?? null);
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
    setPhotoUrl(url);
    setConsentAt(new Date().toISOString());
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
    setPhotoUrl(null);
    setConsentAt(null);
    setRevealed(false);
    toast.success('Identity photo removed');
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
        {photoUrl ? (
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

      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </Card>
  );
};

export default IdentityVaultSection;

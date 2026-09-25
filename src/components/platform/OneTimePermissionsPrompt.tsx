import React, { useEffect, useState } from 'react';
import PermissionActivationModal from '@/components/PermissionActivationModal';

/**
 * Single universal permission request, shown once per device after sign-in.
 * Browsers only allow mic/camera/location prompts from a real tap, so the user
 * taps one "Activate" button and every permission is requested together.
 * Whether they allow or skip, it is never shown again on this device.
 */
const KEY = 'mmora_universal_permissions_asked_v1';

export default function OneTimePermissionsPrompt() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let asked = false;
    try { asked = localStorage.getItem(KEY) === '1'; } catch { /* ignore */ }
    if (asked) return;
    const t = window.setTimeout(() => setOpen(true), 2500);
    return () => window.clearTimeout(t);
  }, []);

  const markAsked = () => { try { localStorage.setItem(KEY, '1'); } catch { /* ignore */ } };

  return (
    <PermissionActivationModal
      open={open}
      onOpenChange={(next) => { if (!next) markAsked(); setOpen(next); }}
      onComplete={markAsked}
    />
  );
}

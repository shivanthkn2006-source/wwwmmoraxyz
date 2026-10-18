import React, { Suspense } from 'react';
import { AVATAR_CHOICES, useAvatarChoice } from '@/lib/vrAvatarChoice';
import SkirtFemaleAvatar from './SkirtFemaleAvatar';
import type { HeldWeapon } from '@/lib/vrWeaponGrip';
import { UploadedVillageAvatar } from './UploadedVillageAvatar';

class AvatarBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <SkirtFemaleAvatar liveMotion /> : this.props.children; }
}
export function VillageAvatar({ aiming = false, headYaw = 0, heldWeapon = null }: { aiming?: boolean; headYaw?: number; heldWeapon?: HeldWeapon | null }) {
  const choice = useAvatarChoice();
  const selected = AVATAR_CHOICES.find((a) => a.id === choice);
  const fallback = <SkirtFemaleAvatar liveMotion aiming={aiming} headYaw={headYaw} heldWeapon={heldWeapon} />;
  if (!selected?.url) return fallback;
  return <AvatarBoundary key={choice}><Suspense fallback={fallback}>
    <UploadedVillageAvatar url={selected.url} zoe={choice === 'zoe-upload'} aiming={aiming} />
  </Suspense></AvatarBoundary>;
}
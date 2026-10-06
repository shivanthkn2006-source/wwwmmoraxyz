import React from 'react';
import { createRoot } from 'react-dom/client';
import { VRRoomInterior } from '@/components/vr/VRRoomInterior';
import { enterRoom } from '@/lib/vrInterior';
export function mount() {
  const d = document.createElement('div'); document.body.appendChild(d);
  createRoot(d).render(<VRRoomInterior />);
  enterRoom({ id: 'chk', name: 'House', herbId: 'chk:herb', coinId: 'chk:coin', coinAmt: 3 });
}

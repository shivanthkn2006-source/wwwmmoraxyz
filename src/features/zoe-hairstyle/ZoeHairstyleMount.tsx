import React, { useEffect, useState } from 'react';
import { ZoeHairstyleModal } from './ZoeHairstyleModal';
import { ZOE_HAIRSTYLE_OPEN_EVENT, type Gender } from './intent';
import { ZOE_RUN_EVENT, ZOE_END_EVENT } from '@/features/zoe-command-bus';

export function ZoeHairstyleMount() {
  const [open, setOpen] = useState(false);
  const [gender, setGender] = useState<Gender>('any');

  useEffect(() => {
    const openHandler = (e: Event) => {
      const d = (e as CustomEvent).detail ?? {};
      setGender(d.gender ?? 'any');
      setOpen(true);
    };
    const runHandler = (e: Event) => {
      const d = (e as CustomEvent).detail;
      if (d?.feature === 'hairstyle') setOpen(true);
    };
    const endHandler = (e: Event) => {
      const d = (e as CustomEvent).detail;
      if (!d?.feature || d.feature === 'hairstyle') setOpen(false);
    };
    window.addEventListener(ZOE_HAIRSTYLE_OPEN_EVENT, openHandler);
    window.addEventListener(ZOE_RUN_EVENT, runHandler);
    window.addEventListener(ZOE_END_EVENT, endHandler);
    return () => {
      window.removeEventListener(ZOE_HAIRSTYLE_OPEN_EVENT, openHandler);
      window.removeEventListener(ZOE_RUN_EVENT, runHandler);
      window.removeEventListener(ZOE_END_EVENT, endHandler);
    };
  }, []);

  return <ZoeHairstyleModal open={open} initialGender={gender} onClose={() => setOpen(false)} />;
}

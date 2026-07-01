// Mounts the decorator and listens for the open event from anywhere.
import React, { useEffect, useState } from 'react';
import { ZoeDecoratorModal } from './ZoeDecoratorModal';
import { ZOE_DECORATOR_OPEN_EVENT, type ZoeDecoratorOpenDetail } from './intent';
import { ZOE_RUN_EVENT, ZOE_END_EVENT } from '@/features/zoe-command-bus';

export function ZoeDecoratorMount() {
  const [open, setOpen] = useState(false);
  const [initial, setInitial] = useState<ZoeDecoratorOpenDetail | undefined>();

  useEffect(() => {
    const openHandler = (e: Event) => {
      const detail = (e as CustomEvent<ZoeDecoratorOpenDetail>).detail ?? {};
      setInitial(detail); setOpen(true);
    };
    const runHandler = (e: Event) => {
      const d = (e as CustomEvent).detail;
      if (d?.feature === 'decorator') setOpen(true);
    };
    const endHandler = (e: Event) => {
      const d = (e as CustomEvent).detail;
      if (!d?.feature || d.feature === 'decorator') setOpen(false);
    };
    window.addEventListener(ZOE_DECORATOR_OPEN_EVENT, openHandler);
    window.addEventListener(ZOE_RUN_EVENT, runHandler);
    window.addEventListener(ZOE_END_EVENT, endHandler);
    return () => {
      window.removeEventListener(ZOE_DECORATOR_OPEN_EVENT, openHandler);
      window.removeEventListener(ZOE_RUN_EVENT, runHandler);
      window.removeEventListener(ZOE_END_EVENT, endHandler);
    };
  }, []);

  return <ZoeDecoratorModal open={open} initial={initial} onClose={() => setOpen(false)} />;
}

// Mounts the decorator and listens for the open event from anywhere.
// Drop-in: <ZoeDecoratorMount /> — zero coupling to other Zoe code.

import React, { useEffect, useState } from 'react';
import { ZoeDecoratorModal } from './ZoeDecoratorModal';
import { ZOE_DECORATOR_OPEN_EVENT, type ZoeDecoratorOpenDetail } from './intent';

export function ZoeDecoratorMount() {
  const [open, setOpen] = useState(false);
  const [initial, setInitial] = useState<ZoeDecoratorOpenDetail | undefined>();

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<ZoeDecoratorOpenDetail>).detail ?? {};
      setInitial(detail);
      setOpen(true);
    };
    window.addEventListener(ZOE_DECORATOR_OPEN_EVENT, handler);
    return () => window.removeEventListener(ZOE_DECORATOR_OPEN_EVENT, handler);
  }, []);

  return <ZoeDecoratorModal open={open} initial={initial} onClose={() => setOpen(false)} />;
}

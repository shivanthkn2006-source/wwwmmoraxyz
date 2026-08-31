import React, { useMemo } from 'react';
import { Pause, Play, Repeat2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useZoeCardNarration, type NarrationItem } from './ZoeCardNarrationProvider';

interface Props extends NarrationItem { className?: string; }

export const ZoeCardNarrationControls: React.FC<Props> = ({ className, ...item }) => {
  const stableItem = useMemo(() => item, [item.id, item.text, item.kind, item.order]);
  const narration = useZoeCardNarration(stableItem);
  return (
    <div className={cn('flex items-center gap-1', className)} data-card-narration={item.id}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-10 w-10 rounded-full"
        aria-label={narration.active ? (narration.paused ? 'Resume Zoe narration' : 'Pause Zoe narration') : 'Play with Zoe voice'}
        onClick={(event) => {
          event.preventDefault(); event.stopPropagation();
          if (!narration.active) narration.play(); else if (narration.paused) narration.resume(); else narration.pause();
        }}
      >
        {narration.active && !narration.paused ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-10 w-10 rounded-full"
        aria-label="Repeat with Zoe voice"
        onClick={(event) => { event.preventDefault(); event.stopPropagation(); narration.play(); }}
      >
        <Repeat2 className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default ZoeCardNarrationControls;
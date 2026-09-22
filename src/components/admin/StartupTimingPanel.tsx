/**
 * STARTUP TIMING PANEL — shows the exact remaining delay on this device.
 */
import React, { useEffect, useState } from 'react';
import { Timer } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getInteractiveDelayMs, getStartupMarks, PHASE_LABELS, type StartupMark } from '@/lib/startupTiming';

const StartupTimingPanel: React.FC = () => {
  const [marks, setMarks] = useState<StartupMark[]>(() => getStartupMarks());

  useEffect(() => {
    const refresh = () => setMarks(getStartupMarks());
    window.addEventListener('mmora-startup-mark', refresh);
    const timer = window.setInterval(refresh, 1_000);
    return () => {
      window.removeEventListener('mmora-startup-mark', refresh);
      window.clearInterval(timer);
    };
  }, []);

  const interactive = getInteractiveDelayMs();

  return (
    <Card data-startup-timing>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Timer className="h-4 w-4 text-primary" aria-hidden="true" />
          Startup delay on this device
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold text-foreground" data-startup-total>
          {interactive === null ? 'measuring…' : `${(interactive / 1000).toFixed(2)} s`}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Time from opening the app to a usable signed-in screen.
        </p>
        <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
          {marks.map((mark) => (
            <li key={mark.phase} className="flex items-center justify-between gap-3">
              <span>{PHASE_LABELS[mark.phase]}</span>
              <span className="font-mono text-foreground">{(mark.at / 1000).toFixed(2)} s</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};

export default StartupTimingPanel;

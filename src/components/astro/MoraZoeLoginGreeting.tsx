import React from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, X, ArrowRight } from 'lucide-react';
import type { AstroPredictionRecord } from './moraZoeTypes';

interface Props {
  prediction: AstroPredictionRecord;
  onDismiss: () => void;
}

export const MoraZoeLoginGreeting: React.FC<Props> = ({ prediction, onDismiss }) => {
  const overlay = (
    <div className="fixed inset-x-0 bottom-0 z-[9998] flex justify-center px-4 pb-6 pointer-events-none">
      <div className="pointer-events-auto w-full max-w-md rounded-2xl border border-border bg-card/95 p-4 shadow-lg backdrop-blur animate-fade-in">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-full border border-border p-2">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Daily alignment</p>
            <p className="truncate text-sm font-medium text-foreground">{prediction.prediction_headline}</p>
            <p className="mt-2 text-xs italic text-muted-foreground">
              &ldquo;{prediction.motivational_quote}&rdquo;
            </p>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss daily alignment"
            className="rounded-full p-1 text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Swiss ephemeris</span>
          <button
            type="button"
            onClick={onDismiss}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary"
          >
            Enter app <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document === 'undefined' ? overlay : createPortal(overlay, document.body);
};

export default MoraZoeLoginGreeting;

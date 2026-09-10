import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAudioRouter } from '@/hooks/useAudioRouter';
import { resolveHeadsetState } from '@/services/AudioRouterService';

interface Props {
  onNavigateToAudioSettings?: () => void;
  className?: string;
  /**
   * Compact = a single small round icon, nothing else. Used for the global
   * floating chip so it never spreads across the Home screen or sits over
   * other content; the full label version is for settings pages.
   */
  compact?: boolean;
}

export const AudioQuickConnectButton: React.FC<Props> = ({ onNavigateToAudioSettings, className, compact }) => {
  const navigate = useNavigate();
  const { devices, activeOutput } = useAudioRouter();

  // Truthful indicator: lit only when a real external/Bluetooth output is the
  // one Zoe is playing through. No label (no mic permission yet) = unlit.
  const headset = React.useMemo(
    () => resolveHeadsetState(devices.outputs, activeOutput),
    [devices.outputs, activeOutput],
  );

  return (
    <button
      onClick={() => (onNavigateToAudioSettings ? onNavigateToAudioSettings() : navigate('/zoe-audio'))}
      className={`relative flex items-center transition-opacity text-sm text-foreground hover:opacity-70 ${
        compact ? 'gap-1 h-9 w-9 justify-center p-0' : 'gap-2 px-3 py-1.5'
      } ${className || ''}`}
      title={headset.connected ? `Connected: ${headset.label}` : 'Zoe Audio & Bluetooth Device Center'}
      aria-label={
        headset.connected
          ? `Zoe audio centre, connected to ${headset.label}`
          : 'Zoe audio and Bluetooth device centre, no headset connected'
      }
      data-headset-connected={headset.connected ? 'true' : 'false'}
      data-testid="audio-quick-connect"
    >
      {/* Bluetooth / Headset icon */}
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
        <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
      </svg>

      {headset.connected && (
        <span
          data-testid="audio-connected-led"
          className="pointer-events-none absolute right-0.5 top-0.5 h-2 w-2 rounded-full bg-primary shadow-[0_0_6px_hsl(var(--primary))] animate-pulse"
          aria-hidden="true"
        />
      )}
      <span className="sr-only">{headset.connected ? `Connected to ${headset.label}` : 'No headset connected'}</span>
    </button>
  );
};

export default AudioQuickConnectButton;

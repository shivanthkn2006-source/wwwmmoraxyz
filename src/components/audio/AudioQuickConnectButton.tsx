import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAudioRouter } from '@/hooks/useAudioRouter';

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
  const { status, audioLevel } = useAudioRouter();
  const navigate = useNavigate();

  const getStatusColor = () => {
    switch (status) {
      case 'connected':
        return 'hsl(var(--primary))';
      case 'fallback':
        return 'hsl(var(--muted-foreground))';
      case 'connecting':
        return 'hsl(var(--muted-foreground))';
      case 'error':
        return 'hsl(var(--destructive))';
      default:
        return 'hsl(var(--border))';
    }
  };

  return (
    <button
      onClick={() => (onNavigateToAudioSettings ? onNavigateToAudioSettings() : navigate('/zoe-audio'))}
      className={`relative flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-background/80 hover:bg-muted transition-all text-sm text-foreground ${className || ''}`}
      title="Zoe Audio & Bluetooth Device Center"
      aria-label="Zoe audio and Bluetooth device centre"
    >
      {/* Bluetooth / Headset icon */}
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
        <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
      </svg>

      <span className="font-medium hidden sm:inline">Zoe Audio</span>

      {/* Real-time VU meter tick if connected */}
      {status === 'connected' && (
        <div className="w-8 h-2 bg-muted rounded-full overflow-hidden flex items-center">
          <div className="h-full bg-foreground transition-all duration-75" style={{ width: `${audioLevel}%` }} />
        </div>
      )}

      {/* Connectivity status indicator dot */}
      <span className="w-2 h-2 rounded-full ring-2 ring-background" style={{ backgroundColor: getStatusColor() }} />
    </button>
  );
};

export default AudioQuickConnectButton;

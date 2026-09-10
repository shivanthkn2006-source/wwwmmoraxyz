import React from 'react';
import { useNavigate } from 'react-router-dom';

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

  return (
    <button
      onClick={() => (onNavigateToAudioSettings ? onNavigateToAudioSettings() : navigate('/zoe-audio'))}
      className={`relative flex items-center transition-opacity text-sm text-foreground hover:opacity-70 ${
        compact ? 'gap-1 h-9 w-9 justify-center p-0' : 'gap-2 px-3 py-1.5'
      } ${className || ''}`}
      title="Zoe Audio & Bluetooth Device Center"
      aria-label="Zoe audio and Bluetooth device centre"
    >
      {/* Bluetooth / Headset icon */}
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
        <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
      </svg>

    </button>
  );
};

export default AudioQuickConnectButton;

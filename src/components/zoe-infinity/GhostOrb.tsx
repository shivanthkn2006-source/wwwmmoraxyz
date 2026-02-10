import { memo } from 'react';

interface GhostOrbProps {
  isProcessing?: boolean;
  mood?: 'neutral' | 'cyan' | 'gold';
}

export const GhostOrb = memo(function GhostOrb({ 
  isProcessing = false, 
  mood = 'neutral' 
}: GhostOrbProps) {
  const getMoodColor = () => {
    switch (mood) {
      case 'cyan': return 'rgba(0, 255, 255, 0.6)';
      case 'gold': return 'rgba(255, 215, 0, 0.6)';
      default: return 'rgba(255, 255, 255, 0.4)';
    }
  };

  return (
    <div className="absolute top-8 left-1/2 -translate-x-1/2 z-10">
      <div 
        className={`
          w-16 h-16 rounded-full
          ${isProcessing ? 'animate-pulse' : ''}
        `}
        style={{
          background: `radial-gradient(circle at center, ${getMoodColor()} 0%, transparent 70%)`,
          filter: 'blur(8px)',
          animation: isProcessing 
            ? 'breathe 1.5s ease-in-out infinite' 
            : 'breathe 3s ease-in-out infinite',
        }}
      />
      <style>{`
        @keyframes breathe {
          0%, 100% { 
            transform: scale(1); 
            opacity: 0.6; 
          }
          50% { 
            transform: scale(1.3); 
            opacity: 1; 
          }
        }
      `}</style>
    </div>
  );
});

export default GhostOrb;

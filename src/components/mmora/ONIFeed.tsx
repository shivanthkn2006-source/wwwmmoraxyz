import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Brain, Target, Radio } from 'lucide-react';
import { useMmoraAudio } from '@/hooks/useMmoraAudio';

interface ONIFeedProps {
  isVisible: boolean;
  onShardClick?: (shardId: string) => void;
}

const shards = [
  { 
    id: 'bio-status', 
    label: 'BIO-STATUS', 
    icon: Activity,
    position: { top: '20%', left: '10%' },
    rotation: -15,
    content: 'Sleeve integrity: 98.7%'
  },
  { 
    id: 'memory-log', 
    label: 'MEMORY LOG', 
    icon: Brain,
    position: { top: '20%', right: '10%' },
    rotation: 15,
    content: 'Cortical backup: Active'
  },
  { 
    id: 'directives', 
    label: 'DIRECTIVES', 
    icon: Target,
    position: { bottom: '30%', left: '10%' },
    rotation: -10,
    content: 'Priority: User command'
  },
  { 
    id: 'comm-link', 
    label: 'COMM LINK', 
    icon: Radio,
    position: { bottom: '30%', right: '10%' },
    rotation: 10,
    content: 'Needlecast: Online'
  },
];

export default function ONIFeed({ isVisible, onShardClick }: ONIFeedProps) {
  const { playShardOpen, playHoverClick } = useMmoraAudio();

  const handleShardClick = (shardId: string) => {
    playShardOpen();
    onShardClick?.(shardId);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed inset-0 z-30 pointer-events-none">
          {shards.map((shard, index) => {
            const Icon = shard.icon;
            return (
              <motion.div
                key={shard.id}
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 20 }}
                transition={{ 
                  delay: index * 0.1,
                  type: 'spring',
                  stiffness: 300,
                  damping: 25
                }}
                style={{
                  position: 'absolute',
                  ...shard.position,
                  transform: `rotate(${shard.rotation}deg)`
                }}
                className="pointer-events-auto"
              >
                <motion.button
                  whileHover={{ scale: 1.05, rotate: shard.rotation + 2 }}
                  whileTap={{ scale: 0.95 }}
                  onHoverStart={() => playHoverClick()}
                  onClick={() => handleShardClick(shard.id)}
                  className="relative group"
                  style={{
                    clipPath: 'polygon(10% 0%, 100% 0%, 90% 100%, 0% 100%)'
                  }}
                >
                  {/* Glass Shard */}
                  <div className="w-40 h-24 bg-cyan-500/10 backdrop-blur-xl border border-cyan-500/30 p-4 flex flex-col justify-between">
                    {/* Header */}
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-cyan-400" />
                      <span className="text-xs font-mono text-cyan-400 tracking-wider">
                        {shard.label}
                      </span>
                    </div>

                    {/* Content */}
                    <p className="text-[10px] font-mono text-white/60">
                      {shard.content}
                    </p>

                    {/* Pulse indicator */}
                    <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-cyan-400 animate-gpu-status-primary" />
                  </div>

                  {/* Glow on hover */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    whileHover={{ opacity: 1 }}
                    className="absolute inset-0 bg-cyan-400/10 blur-md pointer-events-none"
                    style={{
                      clipPath: 'polygon(10% 0%, 100% 0%, 90% 100%, 0% 100%)'
                    }}
                  />
                </motion.button>
              </motion.div>
            );
          })}

          {/* Center instruction */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.5 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 mt-32"
          >
            <p className="text-xs font-mono text-white/30 text-center">
              TAP SHARD TO EXPAND • TAP ORB TO DISMISS
            </p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

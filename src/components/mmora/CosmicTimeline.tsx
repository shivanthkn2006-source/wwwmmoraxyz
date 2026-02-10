import { motion } from 'framer-motion';
import { Sparkles, Circle, Sun, Atom, Globe, Rocket, Cpu } from 'lucide-react';

const timelineEvents = [
  { id: 'bigbang', label: 'Big Bang', year: '-13.8B', icon: Sparkles, color: '#FF0099' },
  { id: 'darkera', label: 'Dark Era', year: '-13.7B', icon: Circle, color: '#4a0066' },
  { id: 'stars', label: 'First Stars', year: '-13.6B', icon: Sun, color: '#FFD700' },
  { id: 'atoms', label: 'Heavy Elements', year: '-10B', icon: Atom, color: '#00F0FF' },
  { id: 'earth', label: 'Earth Forms', year: '-4.5B', icon: Globe, color: '#00AA66' },
  { id: 'now', label: 'Present', year: '2025', icon: Rocket, color: '#00F0FF', active: true },
  { id: 'future', label: 'Future 2120', year: '2120', icon: Cpu, color: '#FF0099' },
];

export default function CosmicTimeline() {
  return (
    <div className="w-full overflow-x-auto scrollbar-hide py-4">
      <div className="flex items-center gap-1 min-w-max px-4">
        {timelineEvents.map((event, index) => {
          const Icon = event.icon;
          return (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center"
            >
              {/* Event Node */}
              <div className="flex flex-col items-center">
                <motion.div
                  whileHover={{ scale: 1.2 }}
                  className={`relative w-12 h-12 rounded-full flex items-center justify-center ${
                    event.active 
                      ? 'bg-cyan-500/30 ring-2 ring-cyan-400' 
                      : 'bg-white/5'
                  }`}
                  style={{ boxShadow: `0 0 20px ${event.color}40` }}
                >
                  <Icon 
                    className="w-5 h-5" 
                    style={{ color: event.color }}
                  />
                  {event.active && (
                    <div className="absolute inset-0 rounded-full border-2 border-cyan-400 animate-gpu-ring-expand" />
                  )}
                </motion.div>
                
                {/* Label */}
                <span className="mt-2 text-xs font-mono text-white/70 whitespace-nowrap">
                  {event.label}
                </span>
                <span className="text-[10px] font-mono text-white/40">
                  {event.year}
                </span>
              </div>
              
              {/* Connector Line */}
              {index < timelineEvents.length - 1 && (
                <div className="w-8 h-px bg-gradient-to-r from-white/20 to-white/5 mx-1" />
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import TypewriterText from './TypewriterText';
import ImageShareActions from './ImageShareActions';

interface ResultCardProps {
  isOpen: boolean;
  content: string;
  mood?: string;
  onClose: () => void;
  children?: React.ReactNode;
  imageUrl?: string | null;
  imagePrompt?: string | null;
}

const moodColors: Record<string, string> = {
  analytical: 'border-cyan-500/50',
  curious: 'border-amber-500/50',
  excited: 'border-pink-500/50',
  empathetic: 'border-violet-500/50',
  warn: 'border-red-500/50',
  melancholic: 'border-indigo-500/50',
  defiant: 'border-orange-500/50',
  serene: 'border-emerald-500/50',
  default: 'border-white/10'
};

export default function ResultCard({ isOpen, content, mood = 'default', onClose, children, imageUrl, imagePrompt }: ResultCardProps) {
  const borderColor = moodColors[mood.toLowerCase()] || moodColors.default;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 100, height: 0 }}
          animate={{ 
            opacity: 1, 
            y: 0, 
            height: 'auto',
            transition: {
              type: 'spring',
              stiffness: 300,
              damping: 30
            }
          }}
          exit={{ 
            opacity: 0, 
            y: 50, 
            height: 0,
            transition: { duration: 0.3 }
          }}
          className="fixed bottom-28 left-0 right-0 z-40 px-4 w-full flex justify-center"
        >
          <div 
            className="relative w-full max-w-2xl rounded-2xl bg-background/60 backdrop-blur-2xl shadow-2xl overflow-hidden"
          >
            {/* Close Button */}
            <motion.button
              onClick={onClose}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="absolute top-4 right-4 p-2 rounded-full bg-foreground/5 text-foreground/60 hover:text-foreground/90 transition-colors z-10"
            >
              <X className="w-4 h-4" />
            </motion.button>

            {/* Content */}
            <div className="p-6 pt-12 max-h-[60vh] overflow-y-auto">
              {/* Generated Image */}
              {imageUrl && (
                <div className="mb-4">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="rounded-lg overflow-hidden border border-cyan-500/30"
                  >
                    <img 
                      src={imageUrl} 
                      alt="Generated visualization" 
                      className="w-full h-auto max-h-64 object-contain bg-background/50"
                      onError={(e) => {
                        console.warn('[ResultCard] Image failed to load');
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </motion.div>
                  
                  {/* Download & Share Actions */}
                  <ImageShareActions imageUrl={imageUrl} prompt={imagePrompt || undefined} />
                </div>
              )}
              
              {content && (
                <div 
                  className="text-foreground/90 font-mono text-sm leading-relaxed"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  <TypewriterText text={content} speed={20} />
                </div>
              )}
              
              {/* Custom Content (Maps, Timeline, etc.) */}
              {children && (
                <div className="mt-4">
                  {children}
                </div>
              )}

              {/* Mood Indicator */}
              {mood && mood !== 'default' && (
                <div className="mt-4 flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${borderColor.replace('border-', 'bg-').replace('/50', '')}`} />
                  <span className="text-xs font-mono text-foreground/40 uppercase tracking-wider">
                    {mood}
                  </span>
                </div>
              )}
            </div>

            {/* Glow */}
            <div className="absolute inset-0 -z-10 bg-gradient-to-t from-cyan-500/5 to-transparent pointer-events-none" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

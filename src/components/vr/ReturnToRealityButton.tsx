import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, GripVertical, ChevronUp, ChevronDown, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ReturnToRealityButtonProps {
  onReturn: () => void;
}

export const ReturnToRealityButton: React.FC<ReturnToRealityButtonProps> = ({ onReturn }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <motion.div
      drag
      dragMomentum={false}
      dragElastic={0.1}
      whileDrag={{ scale: 1.05, cursor: 'grabbing' }}
      className="fixed bottom-32 left-1/2 -translate-x-1/2 z-30 cursor-grab active:cursor-grabbing"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 2 }}
    >
      {!isExpanded ? (
        /* Compact collapsed view */
        <motion.button
          onClick={() => setIsExpanded(true)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2 px-3 py-2 bg-black/80 backdrop-blur-xl border border-purple-400/30 
                     rounded-full text-purple-300 hover:bg-black/90 hover:border-purple-400/50 transition-all shadow-lg"
        >
          <GripVertical className="w-3 h-3 text-white/40" />
          <LogOut className="w-4 h-4 text-purple-400" />
          <span className="text-[10px] sm:text-xs font-semibold">Exit</span>
          <ChevronUp className="w-3 h-3 text-white/60" />
        </motion.button>
      ) : (
        /* Expanded view */
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-2 bg-black/80 backdrop-blur-xl border border-purple-500/30 
                     rounded-xl p-2 shadow-lg"
        >
          <GripVertical className="w-3.5 h-3.5 text-white/40" />
          
          <Button
            onClick={(e) => { e.stopPropagation(); onReturn(); }}
            variant="outline"
            className="bg-black/60 backdrop-blur-xl border-purple-500/30 text-purple-300 
                       hover:bg-purple-900/30 hover:border-purple-400/50 px-4 py-1.5 rounded-full text-xs sm:text-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
            Return to Reality
          </Button>
          
          <button
            onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }}
            className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
          >
            <ChevronDown className="w-3.5 h-3.5 text-white/60 hover:text-white" />
          </button>
        </motion.div>
      )}
    </motion.div>
  );
};

export default ReturnToRealityButton;
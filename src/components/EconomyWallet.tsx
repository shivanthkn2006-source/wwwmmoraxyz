// ═══════════════════════════════════════════════════════════════════════════════
// ECONOMY WALLET - Social Karma ↔ Zoe Coins Converter
// Real-to-Virtual Economy Bridge with Easter Egg Rewards
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { 
  Wallet, 
  Coins, 
  Heart, 
  ArrowRight, 
  Sparkles, 
  X,
  Flame,
  Gift,
  GripVertical
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCorticalStack } from '@/contexts/CorticalStackContext';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';

// ═══════════════════════════════════════════════════════════════════════════════
// CONVERTER MODAL
// ═══════════════════════════════════════════════════════════════════════════════

const ConverterModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  socialKarma: number;
  zoeCoins: number;
  onConvert: (amount: number) => boolean;
}> = ({ isOpen, onClose, socialKarma, zoeCoins, onConvert }) => {
  const [convertAmount, setConvertAmount] = useState(10);
  const [isConverting, setIsConverting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const dragControls = useDragControls();

  const startDrag = (e: React.PointerEvent) => {
    e.stopPropagation();
    dragControls.start(e);
  };
  
  const maxConvert = Math.min(socialKarma, 1000);
  const coinsToReceive = Math.floor(convertAmount / 10);

  const handleConvert = async () => {
    if (convertAmount > socialKarma || convertAmount < 10) {
      toast.error('Invalid amount');
      return;
    }
    
    setIsConverting(true);
    
    // Simulate conversion animation
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const success = onConvert(convertAmount);
    
    if (success) {
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setIsConverting(false);
        onClose();
      }, 1500);
    } else {
      setIsConverting(false);
      toast.error('Conversion failed');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Overlay */}
          <button
            type="button"
            aria-label="Close Karma Forge"
            onClick={onClose}
            className="absolute inset-0 bg-black/80"
          />

          {/* Draggable panel */}
          <motion.div
            drag
            dragControls={dragControls}
            dragListener={false}
            dragMomentum={false}
            dragElastic={0.08}
            whileDrag={{ scale: 1.01, cursor: 'grabbing' }}
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            className="relative w-full max-w-md overflow-hidden rounded-xl border border-purple-500/30 bg-black/90 backdrop-blur-xl shadow-2xl"
            style={{ touchAction: 'none' }}
          >
            {/* Header / Drag handle */}
            <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-white/10 bg-gradient-to-r from-purple-500/15 to-cyan-500/10">
              <div
                className="flex items-center gap-2 cursor-grab select-none"
                onPointerDown={startDrag}
                title="Drag"
              >
                <GripVertical className="w-4 h-4 text-white/40" />
                <Flame className="w-5 h-5 text-orange-400" />
                <span className="text-purple-200 font-mono text-sm font-semibold">KARMA FORGE</span>
              </div>
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={onClose}
                className="rounded-md p-1 hover:bg-white/10 transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4 text-white/80" />
              </button>
            </div>

            <div className="relative p-4" onPointerDown={(e) => e.stopPropagation()}>
              {/* Converting Animation Overlay */}
              <AnimatePresence>
                {isConverting && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-10 flex items-center justify-center bg-black/80 rounded-lg"
                  >
                    {showSuccess ? (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="text-center"
                      >
                        <Sparkles className="w-16 h-16 text-yellow-400 mx-auto mb-2" />
                        <p className="text-green-400 font-mono text-lg">MINTED!</p>
                        <p className="text-yellow-400 font-mono">+{coinsToReceive} Zoe Coins</p>
                      </motion.div>
                    ) : (
                      <div className="text-center">
                        {/* Burning animation - CSS */}
                        <div className="relative animate-gpu-shake-fast">
                          <Heart className="w-16 h-16 text-pink-500" />
                          <div className="absolute inset-0 blur-md bg-orange-500/50 animate-gpu-pulse-opacity" />
                        </div>
                        <p className="text-orange-400 font-mono mt-4 animate-pulse">
                          BURNING KARMA...
                        </p>
                        
                        {/* Flame particles - CSS */}
                        {[...Array(8)].map((_, i) => (
                          <div
                            key={i}
                            className="absolute top-1/2 left-1/2 w-2 h-2 bg-orange-400 rounded-full animate-gpu-float-up"
                            style={{
                              animationDelay: `${i * 100}ms`,
                              left: `calc(50% + ${(i - 4) * 10}px)`
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
              
              {/* Balance Display */}
              <div className="flex justify-between mb-6">
                <div className="text-center flex-1">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <Heart className="w-4 h-4 text-pink-500" />
                    <span className="text-xs text-white/50 font-mono">SOCIAL KARMA</span>
                  </div>
                  <p className="text-2xl font-bold text-pink-400 font-mono">
                    {socialKarma.toLocaleString()}
                  </p>
                </div>
                
                <ArrowRight className="w-6 h-6 text-white/30 self-center" />
                
                <div className="text-center flex-1">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <Coins className="w-4 h-4 text-yellow-500" />
                    <span className="text-xs text-white/50 font-mono">ZOE COINS</span>
                  </div>
                  <p className="text-2xl font-bold text-yellow-400 font-mono">
                    {zoeCoins.toLocaleString()}
                  </p>
                </div>
              </div>
              
              {/* Conversion Slider */}
              <div className="mb-6">
                <div className="flex justify-between text-xs text-white/50 mb-2">
                  <span>Burn Amount</span>
                  <span className="text-pink-400">{convertAmount} Karma</span>
                </div>
                <Slider
                  value={[convertAmount]}
                  onValueChange={([val]) => setConvertAmount(val)}
                  min={10}
                  max={maxConvert}
                  step={10}
                  className="mb-4"
                />
                <div className="text-center">
                  <span className="text-xs text-white/50">You will receive: </span>
                  <span className="text-yellow-400 font-mono font-bold">
                    {coinsToReceive} Zoe Coins
                  </span>
                </div>
                <p className="text-[10px] text-white/30 text-center mt-2">
                  Exchange rate: 10 Karma = 1 Zoe Coin
                </p>
              </div>
              
              {/* Convert Button */}
              <Button
                onClick={handleConvert}
                disabled={isConverting || convertAmount > socialKarma || convertAmount < 10}
                className={cn(
                  "w-full py-6 font-mono text-lg",
                  "bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500",
                  "hover:from-orange-600 hover:via-pink-600 hover:to-purple-600",
                  "border-0 shadow-lg shadow-pink-500/30"
                )}
              >
                <Flame className="w-5 h-5 mr-2" />
                FORGE COINS
                <Flame className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN WALLET COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export const EconomyWallet: React.FC<{ className?: string }> = ({ className }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showConverter, setShowConverter] = useState(false);

  const walletDragControls = useDragControls();
  const startWalletDrag = (e: React.PointerEvent) => {
    e.stopPropagation();
    walletDragControls.start(e);
  };
  
  const { 
    socialKarma, 
    zoeCoins, 
    convertKarmaToCoins,
    discoveredEasterEggs 
  } = useCorticalStack();

  const handleConvert = useCallback((amount: number) => {
    return convertKarmaToCoins(amount);
  }, [convertKarmaToCoins]);

  // Listen for voice commands to open/close wallet
  useEffect(() => {
    const handleOpenKarmaForge = () => {
      setShowConverter(true);
      setIsExpanded(true);
    };
    
    const handleCloseKarmaForge = () => {
      setShowConverter(false);
    };
    
    const handleToggleKarmaForge = () => {
      setShowConverter(prev => !prev);
      if (!showConverter) setIsExpanded(true);
    };

    window.addEventListener('open-karma-forge', handleOpenKarmaForge);
    window.addEventListener('close-karma-forge', handleCloseKarmaForge);
    window.addEventListener('toggle-karma-forge', handleToggleKarmaForge);
    
    return () => {
      window.removeEventListener('open-karma-forge', handleOpenKarmaForge);
      window.removeEventListener('close-karma-forge', handleCloseKarmaForge);
      window.removeEventListener('toggle-karma-forge', handleToggleKarmaForge);
    };
  }, [showConverter]);

  return (
    <>
      <motion.div
        drag
        dragControls={walletDragControls}
        dragListener={false}
        dragMomentum={false}
        dragElastic={0.1}
        whileDrag={{ scale: 1.01, cursor: 'grabbing' }}
        className={cn(
          "fixed top-4 right-4 z-50",
          className
        )}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        style={{ touchAction: 'none' }}
      >
        {/* Wallet Button/Widget */}
        <motion.button
          onClick={() => setIsExpanded(!isExpanded)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={cn(
            "relative rounded-2xl overflow-hidden",
            "bg-black/60 backdrop-blur-xl",
            "border border-purple-500/30",
            "shadow-lg shadow-purple-500/20",
            "transition-all duration-300",
            isExpanded ? "p-4" : "p-3"
          )}
        >
          {/* Glow effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-cyan-500/10" />
          
          <div className="relative flex items-center gap-3">
            <span
              onPointerDown={startWalletDrag}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex cursor-grab select-none"
              title="Drag"
            >
              <GripVertical className="w-4 h-4 text-white/40" />
            </span>
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-purple-400" />
            </div>
            
            <AnimatePresence>
              {isExpanded ? (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 'auto', opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  className="flex items-center gap-4 overflow-hidden"
                >
                  {/* Social Karma */}
                  <div className="flex items-center gap-1.5">
                    <Heart className="w-4 h-4 text-pink-500" />
                    <span className="text-pink-400 font-mono text-sm font-bold">
                      {socialKarma.toLocaleString()}
                    </span>
                  </div>
                  
                  <div className="w-px h-4 bg-white/20" />
                  
                  {/* Zoe Coins */}
                  <div className="flex items-center gap-1.5">
                    <Coins className="w-4 h-4 text-yellow-500" />
                    <span className="text-yellow-400 font-mono text-sm font-bold">
                      {zoeCoins.toLocaleString()}
                    </span>
                  </div>
                  
                  {/* Easter Eggs Count */}
                  {discoveredEasterEggs.length > 0 && (
                    <>
                      <div className="w-px h-4 bg-white/20" />
                      <div className="flex items-center gap-1.5">
                        <Gift className="w-4 h-4 text-green-500" />
                        <span className="text-green-400 font-mono text-xs">
                          {discoveredEasterEggs.length}
                        </span>
                      </div>
                    </>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-2"
                >
                  <span className="text-yellow-400 font-mono text-sm font-bold">
                    {zoeCoins}
                  </span>
                  <Coins className="w-4 h-4 text-yellow-500" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.button>
        
        {/* Expanded Actions */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="mt-2"
            >
              <Button
                onClick={() => setShowConverter(true)}
                variant="outline"
                size="sm"
                className={cn(
                  "w-full bg-gradient-to-r from-pink-500/20 to-purple-500/20",
                  "border-pink-500/30 hover:border-pink-500/50",
                  "text-pink-300 font-mono text-xs"
                )}
              >
                <Flame className="w-3 h-3 mr-1" />
                Convert Karma
                <ArrowRight className="w-3 h-3 mx-1" />
                <Coins className="w-3 h-3" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      
      {/* Converter Modal */}
      <ConverterModal
        isOpen={showConverter}
        onClose={() => setShowConverter(false)}
        socialKarma={socialKarma}
        zoeCoins={zoeCoins}
        onConvert={handleConvert}
      />
    </>
  );
};

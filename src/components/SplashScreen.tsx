import React, { useEffect, useState, memo } from 'react';
import { motion } from 'framer-motion';

interface SplashScreenProps {
  onFinish: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = memo(({ onFinish }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Detect low-end device and skip splash entirely
    const isLowEnd = navigator.hardwareConcurrency <= 2 || 
                     (navigator as any).deviceMemory <= 2 ||
                     /Android [4-6]/.test(navigator.userAgent);
    
    if (isLowEnd) {
      onFinish();
      return;
    }

    // ULTRA-OPTIMIZED: 200ms splash for fast devices, instant skip for low-end
    const timer = setTimeout(() => {
      setIsVisible(false);
      requestAnimationFrame(onFinish);
    }, 200);

    return () => clearTimeout(timer);
  }, [onFinish]);

  // Skip render entirely for low-end devices
  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: isVisible ? 1 : 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 bg-background flex items-center justify-center z-50"
    >
      <div className="text-center">
        <div className="w-20 h-20 mx-auto bg-white rounded-3xl flex items-center justify-center shadow-lg">
          <span className="text-3xl font-bold text-black">M</span>
        </div>
        <h1 className="text-2xl font-bold text-foreground mt-3">MMora</h1>
        <p className="text-sm text-muted-foreground mt-1">powered by Zoe</p>
      </div>
    </motion.div>
  );
});

SplashScreen.displayName = 'SplashScreen';

export default SplashScreen;

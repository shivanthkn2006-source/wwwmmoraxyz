/**
 * VR Sensor Overlay - Shows sensor status and provides haptic controls
 * Integrates device sensors into the VR world experience
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Smartphone, 
  Battery, 
  Sun, 
  Vibrate, 
  Compass, 
  Activity,
  Zap,
  Move,
  RotateCcw,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useVRSensorIntegration } from '@/hooks/useVRSensorIntegration';

interface VRSensorOverlayProps {
  onShake?: () => void;
  className?: string;
}

const VRSensorOverlay: React.FC<VRSensorOverlayProps> = ({ onShake, className }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);

  const {
    sensorState,
    isReady,
    hasMotion,
    hasHaptics,
    haptics,
    orientation,
    requestSensorPermissions,
    permissionGranted,
    capabilities,
    batteryLevel,
    isLowPower,
    isShaking,
    registerShakeHandler,
    getPerformanceScale,
    getAdaptiveBrightness,
  } = useVRSensorIntegration();

  // Register shake handler
  useEffect(() => {
    if (onShake) {
      return registerShakeHandler(onShake);
    }
  }, [onShake, registerShakeHandler]);

  // Show permission prompt on iOS
  useEffect(() => {
    if (!permissionGranted && capabilities.deviceMotion) {
      setShowPermissionPrompt(true);
    }
  }, [permissionGranted, capabilities.deviceMotion]);

  const handleRequestPermission = async () => {
    const granted = await requestSensorPermissions();
    if (granted) {
      setShowPermissionPrompt(false);
      haptics.onSuccess();
    }
  };

  const testHaptic = (type: keyof typeof haptics) => {
    if (typeof haptics[type] === 'function') {
      (haptics[type] as () => void)();
    }
  };

  return (
    <>
      {/* Permission Prompt */}
      <AnimatePresence>
        {showPermissionPrompt && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-x-4 bottom-20 z-50 bg-black/90 backdrop-blur-xl rounded-xl border border-white/20 p-4"
          >
            <div className="flex items-center gap-3 mb-3">
              <Smartphone className="w-6 h-6 text-purple-400" />
              <div>
                <p className="text-white font-semibold text-sm">Enable Motion Sensors</p>
                <p className="text-white/60 text-xs">For immersive VR head tracking</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowPermissionPrompt(false)}
                className="flex-1 py-2 px-3 bg-white/10 rounded-lg text-white/70 text-sm hover:bg-white/20"
              >
                Skip
              </button>
              <button
                onClick={handleRequestPermission}
                className="flex-1 py-2 px-3 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-lg text-white text-sm font-semibold hover:from-purple-500 hover:to-cyan-500"
              >
                Enable
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sensor Status Overlay */}
      <motion.div className={cn('fixed right-3 bottom-20 z-40 pointer-events-auto', className)}>
        <motion.div layout className="bg-black/80 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden">
          {/* Header */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 px-3 py-2 w-full hover:bg-white/5 transition-colors"
          >
            <Activity className={cn('w-4 h-4', isReady ? 'text-green-400' : 'text-yellow-400')} />
            <span className="text-xs text-white/80 font-medium">Sensors</span>
            {isLowPower && <Zap className="w-3 h-3 text-amber-400 animate-pulse" />}
            {isExpanded ? <ChevronDown className="w-3 h-3 text-white/40 ml-auto" /> : <ChevronUp className="w-3 h-3 text-white/40 ml-auto" />}
          </button>

          {/* Expanded Content */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-t border-white/10"
              >
                <div className="p-3 space-y-3">
                  {/* Status Grid */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-white/5 rounded-lg p-2 text-center">
                      <Move className={cn('w-4 h-4 mx-auto mb-1', hasMotion ? 'text-green-400' : 'text-white/30')} />
                      <span className="text-[9px] text-white/50 block">Motion</span>
                    </div>
                    <div className="bg-white/5 rounded-lg p-2 text-center">
                      <Compass 
                        className="w-4 h-4 mx-auto mb-1 text-cyan-400"
                        style={{ transform: orientation.alpha ? `rotate(${-orientation.alpha}deg)` : 'none' }}
                      />
                      <span className="text-[9px] text-white/50 block">{orientation.alpha?.toFixed(0) ?? '--'}°</span>
                    </div>
                    <div className="bg-white/5 rounded-lg p-2 text-center">
                      <Vibrate className={cn('w-4 h-4 mx-auto mb-1', hasHaptics ? 'text-purple-400' : 'text-white/30')} />
                      <span className="text-[9px] text-white/50 block">Haptic</span>
                    </div>
                  </div>

                  {/* Battery & Light */}
                  <div className="flex items-center gap-3 text-[10px]">
                    <div className="flex items-center gap-1">
                      <Battery className={cn('w-3 h-3', batteryLevel > 0.5 ? 'text-green-400' : batteryLevel > 0.2 ? 'text-yellow-400' : 'text-red-400')} />
                      <span className="text-white/60">{Math.round(batteryLevel * 100)}%</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Sun className="w-3 h-3 text-amber-400" />
                      <span className="text-white/60">{Math.round(getAdaptiveBrightness() * 100)}%</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Zap className="w-3 h-3 text-cyan-400" />
                      <span className="text-white/60">{Math.round(getPerformanceScale() * 100)}%</span>
                    </div>
                  </div>

                  {/* Orientation Display */}
                  {hasMotion && (
                    <div className="bg-white/5 rounded-lg p-2">
                      <div className="flex items-center justify-between text-[9px] text-white/50 mb-1">
                        <span>Tilt</span>
                        <span className="font-mono">β:{orientation.beta?.toFixed(0) ?? '--'}° γ:{orientation.gamma?.toFixed(0) ?? '--'}°</span>
                      </div>
                      <div className="relative h-4 bg-white/10 rounded overflow-hidden">
                        <motion.div
                          className="absolute inset-y-0 w-2 bg-gradient-to-r from-purple-500 to-cyan-500 rounded"
                          animate={{ left: `${50 + (orientation.gamma ?? 0) / 2}%` }}
                          transition={{ type: 'spring', damping: 15 }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Shake Status */}
                  <AnimatePresence>
                    {isShaking && (
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        className="bg-gradient-to-r from-purple-600/30 to-cyan-600/30 rounded-lg p-2 flex items-center gap-2"
                      >
                        <RotateCcw className="w-4 h-4 text-white animate-spin" />
                        <span className="text-xs text-white font-medium">Shake Detected!</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Haptic Test Buttons */}
                  {hasHaptics && (
                    <div className="space-y-1">
                      <span className="text-[9px] text-white/40 block">Test Haptics</span>
                      <div className="flex flex-wrap gap-1">
                        {(['onSelect', 'onImpact', 'onZoeResponse', 'onAlert'] as const).map(type => (
                          <button
                            key={type}
                            onClick={() => testHaptic(type)}
                            className="px-2 py-1 bg-white/10 rounded text-[9px] text-white/70 hover:bg-white/20 transition-colors"
                          >
                            {type.replace('on', '')}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </>
  );
};

export default VRSensorOverlay;

// ═══════════════════════════════════════════════════════════════════════════════
// VR TEST SUITE - Debug Panel for Testing VR Across Devices
// Shows device capabilities, testing modes, and diagnostic info
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Monitor, 
  Smartphone, 
  Tablet, 
  Glasses, 
  Wifi, 
  WifiOff,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RotateCcw,
  Compass,
  Move3D,
  Hand,
  Cpu,
  Eye,
  ChevronDown,
  ChevronUp,
  Play,
  Maximize2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useVRCapabilities } from '@/hooks/useVRCapabilities';

interface VRTestSuiteProps {
  onModeSelect?: (mode: string) => void;
  className?: string;
}

export const VRTestSuite: React.FC<VRTestSuiteProps> = ({ 
  onModeSelect,
  className 
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const capabilities = useVRCapabilities();

  const StatusIcon = ({ supported }: { supported: boolean | string }) => {
    if (supported === true || supported === 'granted') {
      return <CheckCircle2 className="w-4 h-4 text-green-400" />;
    }
    if (supported === 'prompt') {
      return <AlertCircle className="w-4 h-4 text-yellow-400" />;
    }
    return <XCircle className="w-4 h-4 text-red-400/50" />;
  };

  const PlatformIcon = () => {
    switch (capabilities.platform) {
      case 'mobile': return <Smartphone className="w-5 h-5" />;
      case 'tablet': return <Tablet className="w-5 h-5" />;
      case 'vr-headset': return <Glasses className="w-5 h-5" />;
      default: return <Monitor className="w-5 h-5" />;
    }
  };

  const getModeLabel = (mode: string) => {
    switch (mode) {
      case 'desktop-3d': return 'Desktop 3D (Mouse/Keyboard)';
      case 'mobile-gyro': return 'Mobile Gyro (Tilt to Look)';
      case 'cardboard-vr': return 'Cardboard VR (Stereoscopic)';
      case 'webxr-vr': return 'WebXR VR (Immersive)';
      case 'webxr-ar': return 'WebXR AR (Augmented)';
      default: return mode;
    }
  };

  return (
    <motion.div 
      className={cn(
        "glass-holo-panel p-4 text-white max-w-sm",
        className
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Header */}
      <div 
        className="flex items-center justify-between cursor-pointer mb-3"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-omega-cyan/20 to-omega-purple/20">
            <Move3D className="w-5 h-5 text-omega-cyan" />
          </div>
          <div>
            <h3 className="font-orbitron text-sm font-bold text-omega-cyan">VR TEST SUITE</h3>
            <p className="text-xs text-white/50">Device Capabilities</p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-white/50" />
        ) : (
          <ChevronDown className="w-5 h-5 text-white/50" />
        )}
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="space-y-4"
          >
            {/* Platform Detection */}
            <div className="p-3 rounded-lg bg-black/30 border border-omega-cyan/10">
              <div className="flex items-center gap-3 mb-2">
                <PlatformIcon />
                <div>
                  <div className="text-sm font-medium capitalize">{capabilities.platform}</div>
                  <div className="text-xs text-white/50">
                    {capabilities.os} • {capabilities.browser}
                  </div>
                </div>
              </div>
              <div className="text-xs text-white/40">
                {capabilities.screenWidth}×{capabilities.screenHeight} @ {capabilities.pixelRatio.toFixed(1)}x
                {capabilities.isLandscape ? ' (Landscape)' : ' (Portrait)'}
              </div>
            </div>

            {/* Capabilities Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2 p-2 rounded bg-black/20">
                <StatusIcon supported={capabilities.webglSupported} />
                <span>WebGL</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded bg-black/20">
                <StatusIcon supported={capabilities.webgl2Supported} />
                <span>WebGL 2</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded bg-black/20">
                <StatusIcon supported={capabilities.webxrSupported} />
                <span>WebXR</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded bg-black/20">
                <StatusIcon supported={capabilities.webxrImmersiveVR} />
                <span>Immersive VR</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded bg-black/20">
                <StatusIcon supported={capabilities.deviceOrientationSupported} />
                <span>Gyroscope</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded bg-black/20">
                <StatusIcon supported={capabilities.isTouchDevice} />
                <span>Touch ({capabilities.maxTouchPoints}pt)</span>
              </div>
            </div>

            {/* WebXR Emulator Detection */}
            {capabilities.isWebXREmulator && (
              <div className="p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-xs">
                <div className="flex items-center gap-2 text-yellow-400">
                  <AlertCircle className="w-4 h-4" />
                  <span className="font-medium">WebXR Emulator Detected</span>
                </div>
                <p className="mt-1 text-yellow-400/70">
                  Browser extension is simulating VR hardware
                </p>
              </div>
            )}

            {/* GPU Info */}
            {capabilities.gpuRenderer !== 'unknown' && (
              <div className="p-2 rounded bg-black/20 text-xs">
                <div className="flex items-center gap-2 text-white/60">
                  <Cpu className="w-3 h-3" />
                  <span className="truncate">{capabilities.gpuRenderer}</span>
                </div>
              </div>
            )}

            {/* Recommended Mode */}
            <div className="p-3 rounded-lg bg-gradient-to-r from-omega-cyan/10 to-omega-purple/10 border border-omega-cyan/20">
              <div className="text-xs text-white/50 mb-1">RECOMMENDED MODE</div>
              <div className="font-medium text-omega-cyan">
                {getModeLabel(capabilities.recommendedMode)}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              {/* Request Orientation Permission (iOS) */}
              {capabilities.deviceOrientationPermission === 'prompt' && (
                <Button
                  size="sm"
                  onClick={capabilities.requestOrientationPermission}
                  className="w-full bg-omega-cyan/20 hover:bg-omega-cyan/30 text-omega-cyan border border-omega-cyan/30"
                >
                  <Compass className="w-4 h-4 mr-2" />
                  Enable Gyroscope
                </Button>
              )}

              {/* Cardboard Mode Toggle */}
              {capabilities.platform === 'mobile' && (
                <Button
                  size="sm"
                  onClick={capabilities.isCardboardMode ? capabilities.exitCardboardMode : capabilities.enterCardboardMode}
                  className={cn(
                    "w-full border",
                    capabilities.isCardboardMode 
                      ? "bg-omega-pink/20 hover:bg-omega-pink/30 text-omega-pink border-omega-pink/30"
                      : "bg-omega-purple/20 hover:bg-omega-purple/30 text-omega-purple border-omega-purple/30"
                  )}
                >
                  {capabilities.isCardboardMode ? (
                    <>
                      <Eye className="w-4 h-4 mr-2" />
                      Exit Cardboard VR
                    </>
                  ) : (
                    <>
                      <Glasses className="w-4 h-4 mr-2" />
                      Enter Cardboard VR
                    </>
                  )}
                </Button>
              )}

              {/* Refresh Capabilities */}
              <Button
                size="sm"
                variant="ghost"
                onClick={capabilities.refreshCapabilities}
                disabled={capabilities.isLoading}
                className="w-full text-white/50 hover:text-white hover:bg-white/5"
              >
                <RotateCcw className={cn("w-4 h-4 mr-2", capabilities.isLoading && "animate-spin")} />
                Refresh Detection
              </Button>
            </div>

            {/* Testing Tips */}
            <div className="pt-3 border-t border-white/10">
              <div className="text-xs text-white/40 space-y-1">
                <p>💡 <strong>PC:</strong> Install WebXR Emulator extension</p>
                <p>📱 <strong>Mobile:</strong> Use Chrome/Safari for gyroscope</p>
                <p>🥽 <strong>VR:</strong> $10 Cardboard + any smartphone</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default VRTestSuite;

/**
 * Advanced Controller Panel - VR OMEGA WORLD Enterprise
 * Visual UI for connected controllers with real-time state display
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gamepad2, Settings, Vibrate, Volume2, Target, Gauge, Car, Plane, MonitorSpeaker } from 'lucide-react';
import { 
  useAdvancedGamepadController, 
  getControllerIcon, 
  getControllerDisplayName,
  type ControllerState,
  type GamepadConfig 
} from '@/hooks/useAdvancedGamepadController';

interface ControllerPanelProps {
  onControllerInput?: (action: string, value: number) => void;
  showDebug?: boolean;
}

export const AdvancedControllerPanel: React.FC<ControllerPanelProps> = ({
  onControllerInput,
  showDebug = false,
}) => {
  const [showPanel, setShowPanel] = useState(false);
  const [config, setConfig] = useState<Partial<GamepadConfig>>({
    deadzone: 0.1,
    sensitivity: 1.0,
    invertY: false,
    vibrationEnabled: true,
  });
  
  const {
    controllers,
    primaryController,
    hapticPresets,
    isConnected,
    controllerCount,
    registerButtonPress,
  } = useAdvancedGamepadController(config);
  
  // Register button handlers
  useEffect(() => {
    registerButtonPress((button, controller) => {
      console.log(`[Controller] Button pressed: ${button} on ${controller.type}`);
      onControllerInput?.(button, 1);
      
      // Haptic feedback on button press
      hapticPresets.pulse();
    });
  }, [registerButtonPress, onControllerInput, hapticPresets]);
  
  // Auto-show panel when controller connects
  useEffect(() => {
    if (isConnected && !showPanel) {
      setShowPanel(true);
      setTimeout(() => setShowPanel(false), 5000); // Auto-hide after 5s
    }
  }, [isConnected]);
  
  const renderControllerVisual = (controller: ControllerState) => {
    const { type, leftStick, rightStick, leftTrigger, rightTrigger } = controller;
    
    return (
      <div className="relative w-full h-32 bg-black/30 rounded-xl border border-white/10 overflow-hidden">
        {/* Controller Type Icon */}
        <div className="absolute top-2 left-2 text-2xl">{getControllerIcon(type)}</div>
        <div className="absolute top-2 left-10 text-xs text-white/70">{getControllerDisplayName(type)}</div>
        
        {/* Left Stick Visualization */}
        <div className="absolute left-6 bottom-4 w-16 h-16 rounded-full border-2 border-white/20 bg-black/40">
          <div 
            className="absolute w-4 h-4 rounded-full bg-primary shadow-lg shadow-primary/50"
            style={{
              left: `calc(50% + ${leftStick.x * 24}px - 8px)`,
              top: `calc(50% + ${leftStick.y * 24}px - 8px)`,
              transition: 'all 0.05s ease-out',
            }}
          />
          <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[8px] text-white/50">L</span>
        </div>
        
        {/* Right Stick Visualization */}
        <div className="absolute right-6 bottom-4 w-16 h-16 rounded-full border-2 border-white/20 bg-black/40">
          <div 
            className="absolute w-4 h-4 rounded-full bg-accent shadow-lg shadow-accent/50"
            style={{
              left: `calc(50% + ${rightStick.x * 24}px - 8px)`,
              top: `calc(50% + ${rightStick.y * 24}px - 8px)`,
              transition: 'all 0.05s ease-out',
            }}
          />
          <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[8px] text-white/50">R</span>
        </div>
        
        {/* Trigger Bars */}
        <div className="absolute left-1/2 -translate-x-1/2 bottom-4 flex gap-4">
          {/* L2 */}
          <div className="flex flex-col items-center gap-1">
            <div className="w-8 h-2 bg-black/50 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-400"
                style={{ width: `${leftTrigger * 100}%` }}
              />
            </div>
            <span className="text-[8px] text-white/50">L2</span>
          </div>
          
          {/* R2 */}
          <div className="flex flex-col items-center gap-1">
            <div className="w-8 h-2 bg-black/50 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-red-500 to-orange-400"
                style={{ width: `${rightTrigger * 100}%` }}
              />
            </div>
            <span className="text-[8px] text-white/50">R2</span>
          </div>
        </div>
        
        {/* Button States (Small indicators) */}
        <div className="absolute top-2 right-2 grid grid-cols-4 gap-1">
          {[controller.cross, controller.circle, controller.square, controller.triangle].map((btn, i) => (
            <div 
              key={i}
              className={`w-3 h-3 rounded-full border ${
                btn.pressed ? 'bg-primary border-primary' : 'border-white/20'
              }`}
            />
          ))}
        </div>
        
        {/* Steering Wheel Mode */}
        {type === 'steering_wheel' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <Car className="w-8 h-8 text-white/60 mx-auto mb-1" />
              <div className="flex gap-4 text-[10px] text-white/70">
                <span>Steer: {((controller.steeringAngle ?? 0) * 100).toFixed(0)}%</span>
                <span>Gas: {((controller.throttle ?? 0) * 100).toFixed(0)}%</span>
                <span>Brake: {((controller.brake ?? 0) * 100).toFixed(0)}%</span>
              </div>
            </div>
          </div>
        )}
        
        {/* Flight Stick Mode */}
        {(type === 'flight_stick' || type === 'hotas') && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <Plane className="w-8 h-8 text-white/60 mx-auto mb-1" />
              <div className="flex gap-4 text-[10px] text-white/70">
                <span>Pitch: {((controller.pitch ?? 0) * 100).toFixed(0)}%</span>
                <span>Roll: {((controller.roll ?? 0) * 100).toFixed(0)}%</span>
                <span>Throttle: {((controller.throttleAxis ?? 0) * 100).toFixed(0)}%</span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };
  
  return (
    <>
      {/* Floating Controller Indicator */}
      <AnimatePresence>
        {isConnected && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="fixed bottom-20 right-4 z-50"
          >
            <button
              onClick={() => setShowPanel(!showPanel)}
              className="flex items-center gap-2 px-4 py-2 bg-black/60 backdrop-blur-md rounded-full border border-white/20 hover:border-primary/50 transition-colors"
            >
              <Gamepad2 className="w-5 h-5 text-primary" />
              <span className="text-sm text-white">{controllerCount} Controller{controllerCount > 1 ? 's' : ''}</span>
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Full Controller Panel */}
      <AnimatePresence>
        {showPanel && (
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className="fixed right-4 top-1/2 -translate-y-1/2 w-80 bg-black/80 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl z-[100] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Gamepad2 className="w-5 h-5 text-primary" />
                <span className="text-white font-semibold">Controllers</span>
              </div>
              <button
                onClick={() => setShowPanel(false)}
                className="text-white/50 hover:text-white"
              >
                ✕
              </button>
            </div>
            
            {/* Controllers List */}
            <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
              {controllers.map((controller, i) => (
                <div key={i} className="space-y-2">
                  {renderControllerVisual(controller)}
                </div>
              ))}
              
              {controllers.length === 0 && (
                <div className="text-center text-white/50 py-8">
                  <Gamepad2 className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p>No controllers detected</p>
                  <p className="text-xs mt-1">Connect a controller to get started</p>
                </div>
              )}
            </div>
            
            {/* Settings */}
            <div className="p-4 border-t border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-white/70">
                  <Target className="w-4 h-4" />
                  <span>Deadzone</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="0.3"
                  step="0.01"
                  value={config.deadzone}
                  onChange={(e) => setConfig(c => ({ ...c, deadzone: parseFloat(e.target.value) }))}
                  className="w-20 accent-primary"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-white/70">
                  <Gauge className="w-4 h-4" />
                  <span>Sensitivity</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={config.sensitivity}
                  onChange={(e) => setConfig(c => ({ ...c, sensitivity: parseFloat(e.target.value) }))}
                  className="w-20 accent-primary"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-white/70">
                  <Vibrate className="w-4 h-4" />
                  <span>Vibration</span>
                </div>
                <button
                  onClick={() => {
                    setConfig(c => ({ ...c, vibrationEnabled: !c.vibrationEnabled }));
                    hapticPresets.medium();
                  }}
                  className={`w-10 h-5 rounded-full transition-colors ${
                    config.vibrationEnabled ? 'bg-primary' : 'bg-white/20'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${
                    config.vibrationEnabled ? 'translate-x-5' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-white/70">
                  <MonitorSpeaker className="w-4 h-4" />
                  <span>Invert Y-Axis</span>
                </div>
                <button
                  onClick={() => setConfig(c => ({ ...c, invertY: !c.invertY }))}
                  className={`w-10 h-5 rounded-full transition-colors ${
                    config.invertY ? 'bg-primary' : 'bg-white/20'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${
                    config.invertY ? 'translate-x-5' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>
            </div>
            
            {/* Quick Test Buttons */}
            <div className="p-4 border-t border-white/10">
              <p className="text-xs text-white/50 mb-2">Test Haptics:</p>
              <div className="flex gap-2">
                <button 
                  onClick={hapticPresets.light}
                  className="flex-1 py-1.5 text-xs bg-white/10 rounded hover:bg-white/20"
                >
                  Light
                </button>
                <button 
                  onClick={hapticPresets.medium}
                  className="flex-1 py-1.5 text-xs bg-white/10 rounded hover:bg-white/20"
                >
                  Medium
                </button>
                <button 
                  onClick={hapticPresets.heavy}
                  className="flex-1 py-1.5 text-xs bg-white/10 rounded hover:bg-white/20"
                >
                  Heavy
                </button>
                <button 
                  onClick={hapticPresets.collision}
                  className="flex-1 py-1.5 text-xs bg-red-500/30 rounded hover:bg-red-500/50"
                >
                  Collision
                </button>
              </div>
            </div>
            
            {/* Debug Info */}
            {showDebug && primaryController && (
              <div className="p-4 border-t border-white/10 bg-black/40">
                <pre className="text-[8px] text-white/50 font-mono overflow-auto max-h-32">
                  {JSON.stringify(primaryController, null, 2)}
                </pre>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AdvancedControllerPanel;

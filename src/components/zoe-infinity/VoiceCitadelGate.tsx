// ═══════════════════════════════════════════════════════════════════════════════
// VOICE CITADEL GATE - Security Lock Screen for Zoe Infinity
// Biometric Passphrase + PIN Fallback
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Lock, Unlock, Shield, AlertTriangle, Volume2 } from 'lucide-react';
import { useVoiceCitadel, CitadelState } from '@/hooks/useVoiceCitadel';

interface VoiceCitadelGateProps {
  onUnlock: () => void;
  children: React.ReactNode;
}

export function VoiceCitadelGate({ onUnlock, children }: VoiceCitadelGateProps) {
  const {
    state,
    isUnlocked,
    attempts,
    lastMatch,
    startListening,
    stopListening,
    verifyPin,
    isListening,
    isEnrolled,
    error,
  } = useVoiceCitadel();

  const [pin, setPin] = useState('');
  const [showHelp, setShowHelp] = useState(false);

  // Notify parent when unlocked
  useEffect(() => {
    if (isUnlocked) {
      onUnlock();
    }
  }, [isUnlocked, onUnlock]);

  // If unlocked, render children
  if (isUnlocked) {
    return <>{children}</>;
  }

  const handlePinSubmit = () => {
    if (pin.length >= 4) {
      verifyPin(pin);
      setPin('');
    }
  };

  const getStateColor = (): string => {
    switch (state) {
      case 'listening': return 'hsl(180, 100%, 50%)';    // Cyan
      case 'analyzing': return 'hsl(45, 100%, 50%)';     // Gold
      case 'unlocked': return 'hsl(120, 100%, 50%)';     // Green
      case 'denied': return 'hsl(0, 100%, 50%)';         // Red
      case 'pin_required': return 'hsl(280, 100%, 50%)'; // Purple
      default: return 'hsl(0, 0%, 50%)';                 // Gray
    }
  };

  const getStateMessage = (): string => {
    switch (state) {
      case 'locked': return 'Say "Access Protocol Alpha"';
      case 'listening': return 'Listening...';
      case 'analyzing': return 'Analyzing voice signature...';
      case 'pin_required': return 'Enter PIN to continue';
      case 'denied': return 'Access Denied';
      default: return '';
    }
  };

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center overflow-hidden"
      style={{ backgroundColor: '#000000' }}
    >
      {/* Animated background grid */}
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(${getStateColor()}22 1px, transparent 1px),
            linear-gradient(90deg, ${getStateColor()}22 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }}
      />

      {/* Central Lock Interface */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative z-10 flex flex-col items-center gap-8"
      >
        {/* Shield Icon with Pulse */}
        <motion.div
          className="relative"
          animate={{
            scale: isListening ? [1, 1.1, 1] : 1,
          }}
          transition={{
            duration: 1.5,
            repeat: isListening ? Infinity : 0,
          }}
        >
          {/* Outer glow rings */}
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background: `radial-gradient(circle, ${getStateColor()}40 0%, transparent 70%)`,
              transform: 'scale(2.5)',
            }}
            animate={{
              opacity: isListening ? [0.3, 0.6, 0.3] : 0.2,
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
            }}
          />

          {/* Main shield */}
          <div
            className="relative w-32 h-32 rounded-full flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${getStateColor()}20, transparent)`,
              border: `2px solid ${getStateColor()}60`,
              boxShadow: `0 0 60px ${getStateColor()}40`,
            }}
          >
            <AnimatePresence mode="wait">
              {state === 'listening' ? (
                <motion.div
                  key="mic"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                >
                  <Mic className="w-12 h-12" style={{ color: getStateColor() }} />
                </motion.div>
              ) : state === 'analyzing' ? (
                <motion.div
                  key="analyzing"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1, rotate: 360 }}
                  transition={{ rotate: { duration: 2, repeat: Infinity, ease: 'linear' } }}
                >
                  <Shield className="w-12 h-12" style={{ color: getStateColor() }} />
                </motion.div>
              ) : state === 'pin_required' ? (
                <motion.div
                  key="pin"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                >
                  <Lock className="w-12 h-12" style={{ color: getStateColor() }} />
                </motion.div>
              ) : (
                <motion.div
                  key="lock"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                >
                  <Lock className="w-12 h-12 text-white/50" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Voice wave visualization when listening */}
          {isListening && (
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex gap-1">
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={i}
                  className="w-1 bg-cyan-400 rounded-full"
                  animate={{
                    height: [8, 24, 8],
                  }}
                  transition={{
                    duration: 0.5,
                    repeat: Infinity,
                    delay: i * 0.1,
                  }}
                />
              ))}
            </div>
          )}
        </motion.div>

        {/* Title */}
        <div className="text-center">
          <h1 
            className="text-2xl font-bold tracking-wider"
            style={{ 
              fontFamily: "'Orbitron', sans-serif",
              color: getStateColor(),
            }}
          >
            VOICE CITADEL
          </h1>
          <p className="text-white/50 text-sm mt-2">
            {getStateMessage()}
          </p>
        </div>

        {/* Error message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 text-red-400 text-sm"
          >
            <AlertTriangle className="w-4 h-4" />
            {error}
          </motion.div>
        )}

        {/* Match confidence display */}
        {lastMatch && !lastMatch.isMatch && (
          <div className="text-center text-sm">
            <div className="text-white/40">Voice Match: {lastMatch.similarity.toFixed(1)}%</div>
            <div className="text-red-400/60">Threshold: 65%</div>
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-col items-center gap-4">
          {state !== 'pin_required' ? (
            <>
              {/* Voice Auth Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={isListening ? stopListening : startListening}
                disabled={state === 'analyzing'}
                className="px-8 py-4 rounded-xl font-medium tracking-wide transition-all"
                style={{
                  background: isListening 
                    ? `linear-gradient(135deg, ${getStateColor()}40, ${getStateColor()}20)`
                    : 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))',
                  border: `1px solid ${isListening ? getStateColor() : 'rgba(255,255,255,0.2)'}`,
                  color: isListening ? getStateColor() : 'white',
                  fontFamily: "'Orbitron', sans-serif",
                }}
              >
                {isListening ? 'Cancel' : 'Speak Passphrase'}
              </motion.button>

              {/* Attempts remaining */}
              {attempts > 0 && (
                <div className="text-white/40 text-sm">
                  Attempts: {attempts} / 3
                </div>
              )}

              {/* Skip to PIN */}
              <button
                onClick={() => verifyPin('')}
                className="text-white/30 text-sm hover:text-white/50 transition-colors"
              >
                Use PIN instead
              </button>
            </>
          ) : (
            <>
              {/* PIN Entry */}
              <div className="flex gap-2">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="w-12 h-14 rounded-lg flex items-center justify-center text-2xl font-bold"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      color: pin[i] ? getStateColor() : 'transparent',
                    }}
                  >
                    {pin[i] ? '●' : '○'}
                  </div>
                ))}
              </div>

              {/* PIN Keypad */}
              <div className="grid grid-cols-3 gap-2 mt-4">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, 'del'].map((key, i) => (
                  <motion.button
                    key={i}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => {
                      if (key === 'del') {
                        setPin(p => p.slice(0, -1));
                      } else if (key !== null && pin.length < 4) {
                        const newPin = pin + key;
                        setPin(newPin);
                        if (newPin.length === 4) {
                          setTimeout(() => {
                            verifyPin(newPin);
                            setPin('');
                          }, 200);
                        }
                      }
                    }}
                    disabled={key === null}
                    className="w-14 h-14 rounded-xl flex items-center justify-center text-xl font-bold transition-all"
                    style={{
                      background: key === null ? 'transparent' : 'rgba(255,255,255,0.05)',
                      border: key === null ? 'none' : '1px solid rgba(255,255,255,0.2)',
                      color: 'white',
                      visibility: key === null ? 'hidden' : 'visible',
                    }}
                  >
                    {key === 'del' ? '←' : key}
                  </motion.button>
                ))}
              </div>

              {/* Back to voice */}
              <button
                onClick={() => startListening()}
                className="text-cyan-400/60 text-sm hover:text-cyan-400 transition-colors mt-4"
              >
                Try voice again
              </button>
            </>
          )}
        </div>

        {/* Help toggle */}
        <button
          onClick={() => setShowHelp(!showHelp)}
          className="text-white/20 text-xs hover:text-white/40 transition-colors mt-8"
        >
          {showHelp ? 'Hide Help' : 'Need Help?'}
        </button>

        {/* Help panel */}
        <AnimatePresence>
          {showHelp && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="text-center text-white/40 text-sm max-w-xs"
            >
              <p className="mb-2">
                <Volume2 className="w-4 h-4 inline mr-1" />
                Say <span className="text-cyan-400">"Access Protocol Alpha"</span> clearly.
              </p>
              <p className="mb-2">
                {isEnrolled 
                  ? 'Your voice is enrolled. Speak naturally.'
                  : 'First time? Your voice will be enrolled automatically.'
                }
              </p>
              <p>
                After 3 failed attempts, PIN entry will be required.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

export default VoiceCitadelGate;

/**
 * LIVING ATMOSPHERE WRAPPER
 * Dynamically reacts to user's ECN emotional state
 * Creates immersive, mood-responsive environment
 * Integrates with HapticSymbiosis for tactile feedback
 * 
 * MOBILE OPTIMIZED: Respects device tier to prevent battery drain
 */

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useZoeIntelligence } from '@/hooks/useZoeIntelligence';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { hapticSymbiosis } from '@/services/HapticSymbiosis';
import { useDeviceTierContext } from '@/contexts/DeviceTierContext';
import { zeroThermalProtocol, useZeroThermalProtocol } from '@/services/ZeroThermalProtocol';
import { usePhantomVisible } from '@/stores/usePhantomStore'; // PROTOCOL PHANTOM

interface AtmosphereMode {
  glow: string;
  particleSpeed: number;
  particleColor: string;
  ambientSound: string;
  overlayEffect: 'none' | 'rain' | 'energy' | 'calm';
  intensity: number;
}

const ATMOSPHERE_MODES: Record<string, AtmosphereMode> = {
  stressed: {
    glow: 'hsl(185, 100%, 50%)', // Deep Cyan
    particleSpeed: 0.3,
    particleColor: 'rgba(0, 255, 255, 0.4)',
    ambientSound: 'calm',
    overlayEffect: 'calm',
    intensity: 0.6
  },
  energetic: {
    glow: 'hsl(30, 100%, 55%)', // Electric Orange
    particleSpeed: 2.5,
    particleColor: 'rgba(255, 140, 0, 0.5)',
    ambientSound: 'hyped',
    overlayEffect: 'energy',
    intensity: 0.9
  },
  sad: {
    glow: 'hsl(280, 80%, 60%)', // Warm Violet
    particleSpeed: 0.5,
    particleColor: 'rgba(180, 100, 255, 0.3)',
    ambientSound: 'empathy',
    overlayEffect: 'rain',
    intensity: 0.5
  },
  joy: {
    glow: 'hsl(45, 100%, 60%)', // Gold
    particleSpeed: 1.5,
    particleColor: 'rgba(255, 215, 0, 0.5)',
    ambientSound: 'uplifting',
    overlayEffect: 'energy',
    intensity: 0.85
  },
  calm: {
    glow: 'hsl(200, 70%, 55%)', // Serene Blue
    particleSpeed: 0.4,
    particleColor: 'rgba(100, 200, 255, 0.3)',
    ambientSound: 'ambient',
    overlayEffect: 'none',
    intensity: 0.4
  },
  neutral: {
    glow: 'hsl(260, 60%, 55%)', // Purple
    particleSpeed: 0.8,
    particleColor: 'rgba(160, 100, 255, 0.3)',
    ambientSound: 'neutral',
    overlayEffect: 'none',
    intensity: 0.5
  }
};

// Neural network starfield particle
interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  speed: number;
  angle: number;
}

export const LivingAtmosphereWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { emotionalIntelligence } = useZoeIntelligence();
  
  // MOBILE OPTIMIZATION: Get device tier to disable heavy effects on low-power devices
  const deviceTier = useDeviceTierContext();
  const thermalProtocol = useZeroThermalProtocol();
  
  // PROTOCOL ZERO-THERMAL: LAW #2 - THE PARTICLE BAN
  const isLowPowerDevice = deviceTier?.isLowPowerDevice || deviceTier?.tier === 'C' || deviceTier?.tier === 'B';
  const particlesBanned = thermalProtocol.areParticlesBanned();
  
  // PROTOCOL PHANTOM: Check if in Ghost Mode
  const isPhantomVisible = usePhantomVisible();
  const enableParticles = isPhantomVisible && !particlesBanned && (deviceTier?.enableParticles ?? !isLowPowerDevice);
  
  const [currentMood, setCurrentMood] = useState<string>('neutral');
  const [atmosphere, setAtmosphere] = useState<AtmosphereMode>(ATMOSPHERE_MODES.neutral);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const isPausedRef = useRef(false);

  // Fetch ECN state on mount and subscribe to changes
  useEffect(() => {
    if (!user?.id) return;

    const fetchECNState = async () => {
      const { data: ecnData } = await supabase
        .from('ecn_history')
        .select('primary_emotion, stress_level, valence')
        .eq('user_id', user.id)
        .order('recorded_at', { ascending: false })
        .limit(1);
      
      const data = ecnData?.[0];

      if (data) {
        const emotion = data.primary_emotion?.toLowerCase() || 'neutral';
        const stressLevel = data.stress_level || 0;
        
        // Determine mood based on emotion and stress
        let mood = 'neutral';
        if (stressLevel > 0.7) mood = 'stressed';
        else if (['joy', 'excitement', 'happiness'].includes(emotion)) mood = 'joy';
        else if (['sad', 'sadness', 'grief'].includes(emotion)) mood = 'sad';
        else if (['energetic', 'excited', 'hyped'].includes(emotion)) mood = 'energetic';
        else if (['calm', 'peaceful', 'relaxed'].includes(emotion)) mood = 'calm';
        else if (emotion in ATMOSPHERE_MODES) mood = emotion;
        
        transitionToMood(mood);
      }
    };

    fetchECNState();

    // Real-time subscription
    const channel = supabase
      .channel('ecn-atmosphere')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'ecn_history',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        const emotion = (payload.new as any).primary_emotion?.toLowerCase() || 'neutral';
        const stressLevel = (payload.new as any).stress_level || 0;
        
        let mood = 'neutral';
        if (stressLevel > 0.7) mood = 'stressed';
        else if (['joy', 'excitement', 'happiness'].includes(emotion)) mood = 'joy';
        else if (['sad', 'sadness', 'grief'].includes(emotion)) mood = 'sad';
        else if (['energetic', 'excited', 'hyped'].includes(emotion)) mood = 'energetic';
        else if (['calm', 'peaceful', 'relaxed'].includes(emotion)) mood = 'calm';
        
        transitionToMood(mood);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const transitionToMood = (newMood: string) => {
    if (newMood === currentMood) return;
    
    setIsTransitioning(true);
    setCurrentMood(newMood);
    setAtmosphere(ATMOSPHERE_MODES[newMood] || ATMOSPHERE_MODES.neutral);
    
    // Trigger haptic feedback for emotional response
    // "Zoe touches you" - silent communication through vibration
    hapticSymbiosis.triggerForEmotion(newMood);
    
    // Dispatch event for other systems to react
    window.dispatchEvent(new CustomEvent('ecn-emotion-change', {
      detail: { emotion: newMood, timestamp: Date.now() }
    }));

    // Dispatch mood-adaptive-ui-change for Living UI (Upgrade #4)
    // Maps atmosphere mood → UI mode for navigation adaptation
    const moodToUIMode: Record<string, string> = {
      stressed: 'calm', calm: 'calm',
      joy: 'creative', energetic: 'creative',
      sad: 'supportive',
      neutral: 'default',
    };
    window.dispatchEvent(new CustomEvent('mood-adaptive-ui-change', {
      detail: { uiMode: moodToUIMode[newMood] || 'default', emotion: newMood, stressLevel: 0 }
    }));
    
    setTimeout(() => setIsTransitioning(false), 2000);
  };

  // Initialize particles - MOBILE OPTIMIZED: Reduce count on low-power devices
  useEffect(() => {
    // Skip particle generation entirely on low-power devices
    if (!enableParticles) {
      setParticles([]);
      return;
    }
    
    const generateParticles = () => {
      // Reduce particle count based on device tier
      const count = isLowPowerDevice ? 0 : (deviceTier?.particleCount || 20);
      const newParticles: Particle[] = [];
      
      for (let i = 0; i < count; i++) {
        newParticles.push({
          id: i,
          x: Math.random() * 100,
          y: Math.random() * 100,
          size: Math.random() * 2 + 0.5,
          opacity: Math.random() * 0.6 + 0.2,
          speed: Math.random() * 0.5 + 0.1,
          angle: Math.random() * Math.PI * 2
        });
      }
      
      setParticles(newParticles);
    };

    generateParticles();
  }, [enableParticles, isLowPowerDevice, deviceTier?.particleCount]);

  // Animate particles based on mood - PROTOCOL ZERO-THERMAL ENFORCED
  useEffect(() => {
    // Skip animation entirely on low-power devices to save battery
    if (!enableParticles || particles.length === 0) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    let localParticles = particles.map(p => ({ ...p }));
    
    // PROTOCOL ZERO-THERMAL: LAW #1 - THE 30 FPS CAP
    const frameInterval = zeroThermalProtocol.getFrameInterval();
    let lastFrameTime = 0;

    // Register with Zero-Thermal for Idle Sleep (LAW #3)
    const unregister = zeroThermalProtocol.registerAnimation({
      id: 'living-atmosphere-particles',
      type: 'canvas',
      pause: () => { isPausedRef.current = true; },
      resume: () => { isPausedRef.current = false; },
      isActive: true,
    });

    const animate = (currentTime: number) => {
      // LAW #3: Skip if paused by Idle Sleep
      if (isPausedRef.current) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }
      
      // LAW #1: Throttle to 30 FPS on low-power devices
      if (zeroThermalProtocol.shouldSkipFrame()) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }
      
      if (currentTime - lastFrameTime < frameInterval) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }
      lastFrameTime = currentTime;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw neural network connections
      ctx.strokeStyle = atmosphere.particleColor.replace('0.', '0.1');
      ctx.lineWidth = 0.5;

      localParticles.forEach((p, i) => {
        // Update position
        p.x += Math.cos(p.angle) * p.speed * atmosphere.particleSpeed * 0.05;
        p.y += Math.sin(p.angle) * p.speed * atmosphere.particleSpeed * 0.05;
        
        // Wrap around
        if (p.x < 0) p.x = 100;
        if (p.x > 100) p.x = 0;
        if (p.y < 0) p.y = 100;
        if (p.y > 100) p.y = 0;
        
        // Draw particle
        const px = (p.x / 100) * canvas.width;
        const py = (p.y / 100) * canvas.height;
        
        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        ctx.fillStyle = atmosphere.particleColor;
        ctx.fill();

        // PROTOCOL ZERO-THERMAL: Skip neural network connections on low particle counts
        if (localParticles.length > 30) return;
        
        // Connect nearby particles (neural network effect)
        for (let j = i + 1; j < localParticles.length; j++) {
          const p2 = localParticles[j];
          const p2x = (p2.x / 100) * canvas.width;
          const p2y = (p2.y / 100) * canvas.height;
          const dist = Math.hypot(px - p2x, py - p2y);
          
          if (dist < 100) {
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(p2x, p2y);
            ctx.stroke();
          }
        }
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationRef.current);
      unregister();
    };
  }, [atmosphere, particles, enableParticles]);

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Void Black Background */}
      <div 
        className="fixed inset-0 bg-black transition-all duration-2000"
        style={{
          background: `radial-gradient(ellipse at 50% 50%, ${atmosphere.glow}10 0%, transparent 70%), #000000`
        }}
      />

      {/* PROTOCOL ZERO-THERMAL: LAW #2 - CSS Gradient Fallback when Particles Banned */}
      {particlesBanned && (
        <div 
          className="fixed inset-0 pointer-events-none z-[1]"
          style={{ 
            background: thermalProtocol.getAlternativeBackground(),
            opacity: 0.6 
          }}
        />
      )}

      {/* Neural Network Starfield Canvas - Only when particles enabled */}
      {!particlesBanned && (
        <canvas 
          ref={canvasRef}
          className="fixed inset-0 pointer-events-none z-[1]"
          style={{ opacity: 0.8 }}
        />
      )}

      {/* Dynamic Glow Overlay */}
      <motion.div
        className="fixed inset-0 pointer-events-none z-[2]"
        animate={{
          boxShadow: `inset 0 0 200px ${atmosphere.glow}30`
        }}
        transition={{ duration: 2 }}
      />

      {/* Rain Overlay Effect (Empathy Mode) */}
      <AnimatePresence>
        {atmosphere.overlayEffect === 'rain' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 pointer-events-none z-[3]"
            style={{
              background: 'linear-gradient(180deg, transparent, rgba(180, 100, 255, 0.05))',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cline x1='50' y1='0' x2='50' y2='10' stroke='rgba(180,100,255,0.3)' stroke-width='0.5'/%3E%3C/svg%3E")`,
              backgroundSize: '20px 20px',
              animation: 'rain-fall 1s linear infinite'
            }}
          />
        )}
      </AnimatePresence>

      {/* Energy Overlay Effect */}
      <AnimatePresence>
        {atmosphere.overlayEffect === 'energy' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.15 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 pointer-events-none z-[3]"
            style={{
              background: `radial-gradient(circle at 30% 30%, ${atmosphere.glow}20 0%, transparent 50%), radial-gradient(circle at 70% 70%, ${atmosphere.glow}15 0%, transparent 50%)`
            }}
          />
        )}
      </AnimatePresence>

      {/* Calm Wave Overlay */}
      <AnimatePresence>
        {atmosphere.overlayEffect === 'calm' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.2 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 pointer-events-none z-[3]"
            style={{
              background: `linear-gradient(180deg, transparent 0%, ${atmosphere.glow}10 50%, transparent 100%)`,
              animation: 'calm-wave 8s ease-in-out infinite'
            }}
          />
        )}
      </AnimatePresence>

      {/* Transition Flash */}
      <AnimatePresence>
        {isTransitioning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 pointer-events-none z-[4]"
            style={{ backgroundColor: atmosphere.glow }}
          />
        )}
      </AnimatePresence>

      {/* Content Layer */}
      <div className="relative z-[10]">
        {children}
      </div>

      {/* CSS for custom animations */}
      <style>{`
        @keyframes rain-fall {
          0% { background-position: 0 0; }
          100% { background-position: 0 20px; }
        }
        @keyframes calm-wave {
          0%, 100% { transform: translateY(0); opacity: 0.1; }
          50% { transform: translateY(-20px); opacity: 0.25; }
        }
      `}</style>
    </div>
  );
};

export default LivingAtmosphereWrapper;

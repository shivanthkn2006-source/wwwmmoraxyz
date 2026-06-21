/**
 * Deferred Component Loader
 * Loads heavy global components after initial page render
 * Improves First Contentful Paint and Time to Interactive
 * Includes Zoe Self-Healer, Platform Voice Notifications, Entity Activation Protocol,
 * Feature Scanner, and Zero-Friction Freemium tier system for billion-user growth
 * 
 * OPTIMIZED: Uses requestIdleCallback for non-blocking loading
 */

import React, { useState, useEffect, lazy, Suspense, useRef, useCallback } from 'react';
import { useZoeSelfHealer } from '@/hooks/useZoeSelfHealer';
import { usePlatformVoiceNotifications } from '@/hooks/usePlatformVoiceNotifications';
import { useZoeActivationSequence } from '@/hooks/useZoeActivationSequence';
import { useZeroFrictionFreemium } from '@/hooks/useZeroFrictionFreemium';
import { useViralContentEngine } from '@/hooks/useViralContentEngine';
import { useFeatureScanner } from '@/hooks/useFeatureScanner';
import { useVelvetRopeOptional } from '@/contexts/VelvetRopeContext';

// requestIdleCallback polyfill for Safari
const scheduleIdle = (cb: () => void, timeout = 1000): void => {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    window.requestIdleCallback(cb, { timeout });
  } else {
    setTimeout(cb, 1);
  }
};

// Lazy load heavy global components
const GlobalZoeAssistant = lazy(() => 
  import('@/components/GlobalZoeAssistant').then(module => ({ default: module.GlobalZoeAssistant }))
);

const PlatformHealthMonitor = lazy(() => 
  import('@/components/PlatformHealthMonitor').then(module => ({ default: module.PlatformHealthMonitor }))
);

const FeatureScannerPanel = lazy(() => 
  import('@/components/FeatureScannerPanel').then(module => ({ default: module.FeatureScannerPanel }))
);

interface DeferredComponentLoaderProps {
  children?: React.ReactNode;
}

// Inner component that uses the self-healer hook
const SelfHealerProvider: React.FC = () => {
  useZoeSelfHealer();
  return null;
};

// Platform voice notifications provider
const VoiceNotificationsProvider: React.FC = () => {
  usePlatformVoiceNotifications();
  return null;
};

// Entity Activation Protocol provider
const EntityActivationProvider: React.FC = () => {
  const { isActivated } = useZoeActivationSequence();
  
  // Log activation state for debugging
  useEffect(() => {
    if (isActivated) {
      console.log('[EAP] Zoe Entity fully activated');
    }
  }, [isActivated]);
  
  return null;
};

// Zero-Friction Freemium Provider for growth tier system
const FreemiumTierProvider: React.FC = () => {
  const freemium = useZeroFrictionFreemium();
  
  useEffect(() => {
    console.log('[Freemium] Tier system initialized:', freemium.currentTier);
  }, [freemium.currentTier]);
  
  return null;
};

// Viral Content Engine Provider for growth tracking
const ViralEngineProvider: React.FC = () => {
  useViralContentEngine();
  
  useEffect(() => {
    console.log('[ViralEngine] Content engine ready');
  }, []);
  
  return null;
};

// Feature Scanner Provider - connects scanner to voice commands
const FeatureScannerProvider: React.FC<{ onOpenScanner: () => void }> = ({ onOpenScanner }) => {
  const scanner = useFeatureScanner();
  
  // Store stable references to avoid infinite re-renders
  const onOpenScannerRef = useRef(onOpenScanner);
  const scannerRef = useRef(scanner);
  
  useEffect(() => {
    onOpenScannerRef.current = onOpenScanner;
    scannerRef.current = scanner;
  }, [onOpenScanner, scanner]);
  
  // Listen for voice/text commands to open scanner
  useEffect(() => {
    const handleOpenScanner = () => onOpenScannerRef.current();
    const handleScannerCommand = (event: CustomEvent) => {
      const { action } = event.detail || {};
      if (action) {
        onOpenScannerRef.current();
        // Let the scanner hook handle the action via its own event listener
      }
    };
    
    window.addEventListener('open-feature-scanner', handleOpenScanner);
    window.addEventListener('zoe-scanner-command', handleScannerCommand as EventListener);
    
    return () => {
      window.removeEventListener('open-feature-scanner', handleOpenScanner);
      window.removeEventListener('zoe-scanner-command', handleScannerCommand as EventListener);
    };
  }, []); // Empty deps - uses refs for stable references
  
  // Separate effect for auto-scanning with proper interval management
  useEffect(() => {
    const autoScanInterval = setInterval(() => {
      const currentScanner = scannerRef.current;
      if (currentScanner.autoScanEnabled && !currentScanner.isScanning) {
        currentScanner.runScan('quick', { speak: false });
      }
    }, 10 * 60 * 1000); // Every 10 minutes
    
    return () => {
      clearInterval(autoScanInterval);
    };
  }, []); // Empty deps - uses refs for stable references
  
  return null;
};

export const DeferredComponentLoader: React.FC<DeferredComponentLoaderProps> = ({ children }) => {
  const [phase, setPhase] = useState(0);
  const [scannerOpen, setScannerOpen] = useState(false);
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // VELVET ROPE: Intent-based module loading optimization
  // Only load components if they match the user's selected planetary intent
  // ═══════════════════════════════════════════════════════════════════════════════
  useVelvetRopeOptional(); // Initialize velvet rope context
  
  // Use requestIdleCallback for non-blocking phase transitions
  const schedulePhase = useCallback((phaseNum: number, delay: number) => {
    return setTimeout(() => {
      scheduleIdle(() => setPhase(phaseNum));
    }, delay);
  }, []);
  
  useEffect(() => {
    // OPTIMIZED: Faster phase transitions for quicker feature availability
    // Phase 1: Load after initial paint (1s - using idle callback)
    const timer1 = schedulePhase(1, 1000);
    
    // Phase 2: Load additional components (3s)
    const timer2 = schedulePhase(2, 3000);
    
    // Phase 3: Load all remaining (5s)
    const timer3 = schedulePhase(3, 5000);
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [schedulePhase]);

  return (
    <>
      {children}
      
      {/* Phase 1: Core systems - Self-healer, voice notifications, and Entity Activation */}
      {/* These always load regardless of intent (core functionality) */}
      {phase >= 1 && (
        <>
          <SelfHealerProvider />
          <VoiceNotificationsProvider />
          <EntityActivationProvider />
          <FreemiumTierProvider />
        </>
      )}
      
      {/* Phase 1: Core Zoe assistant - always loads (core functionality) */}
      {phase >= 1 && (
        <Suspense fallback={null}>
          <GlobalZoeAssistant />
        </Suspense>
      )}
      
      {/* Phase 2: Viral Content Engine for growth + Feature Scanner */}
      {phase >= 2 && (
        <>
          <ViralEngineProvider />
          <FeatureScannerProvider onOpenScanner={() => setScannerOpen(true)} />
        </>
      )}
      
      {/* Phase 3: Health monitoring (lowest priority) */}
      {phase >= 3 && (
        <Suspense fallback={null}>
          <PlatformHealthMonitor />
        </Suspense>
      )}
      
      {/* Feature Scanner Panel - always available after phase 2 */}
      {phase >= 2 && (
        <Suspense fallback={null}>
          <FeatureScannerPanel 
            isOpen={scannerOpen} 
            onClose={() => setScannerOpen(false)} 
          />
        </Suspense>
      )}
    </>
  );
};

export default DeferredComponentLoader;

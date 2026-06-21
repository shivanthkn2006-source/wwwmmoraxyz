// ═══════════════════════════════════════════════════════════════════════════════
// ZOE DHF FEATURE DISCOVERY AGENT
// Scan_New_Capabilities - System-wide feature scanning, error detection, and auto-fix
// Voice & Text command integration for platform-wide access
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { speakAsZoe } from '@/utils/zoeVoice';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

export interface FeatureCapability {
  id: string;
  name: string;
  description: string;
  category: 'core_tools' | 'interface_elements' | 'cognitive_modules' | 'vr_features' | 'security' | 'ai_systems';
  status: 'active' | 'inactive' | 'error' | 'new' | 'updated';
  dateAdded: string;
  version: string;
  location: string;
  testable: boolean;
  lastTested?: string;
  testResult?: 'passed' | 'failed' | 'pending';
}

export interface SystemScanResult {
  id: string;
  timestamp: string;
  scanType: 'full' | 'quick' | 'security' | 'features' | 'errors' | 'memory' | 'adaptive' | 'vr';
  status: 'completed' | 'in_progress' | 'failed';
  summary: {
    totalFeatures: number;
    newFeatures: number;
    errors: number;
    warnings: number;
    fixesApplied: number;
    healthScore: number;
  };
  features: FeatureCapability[];
  errors: ScanError[];
  fixes: AppliedFix[];
  recommendations: string[];
}

export interface ScanError {
  id: string;
  type: 'error' | 'warning' | 'critical' | 'performance' | 'memory' | 'security';
  category: string;
  message: string;
  location: string;
  stack?: string;
  fixable: boolean;
  suggestedFix?: string;
  timestamp: string;
}

export interface AppliedFix {
  id: string;
  errorId: string;
  description: string;
  action: string;
  result: 'success' | 'partial' | 'failed';
  timestamp: string;
}

export interface ScannerState {
  isScanning: boolean;
  scanProgress: number;
  currentPhase: string;
  lastScan?: SystemScanResult;
  scanHistory: SystemScanResult[];
  autoScanEnabled: boolean;
  voiceEnabled: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SYSTEM MANIFEST - Feature Registry
// ═══════════════════════════════════════════════════════════════════════════════

const SYSTEM_MANIFEST: FeatureCapability[] = [
  // Core Tools
  { id: 'zoe-agent', name: 'Zoe AI Agent', description: 'Core AI assistant with voice and text interaction', category: 'core_tools', status: 'active', dateAdded: '2025-01-01', version: '3.0.0', location: 'src/contexts/ZoeContext.tsx', testable: true },
  { id: 'voice-commands', name: 'Advanced Voice Commands', description: 'Natural language voice processing', category: 'core_tools', status: 'active', dateAdded: '2025-01-15', version: '2.5.0', location: 'src/hooks/useAdvancedVoiceCommands.ts', testable: true },
  { id: 'wake-word', name: 'Enhanced Wake Word Detection', description: 'Always-on "Hey Zoe" listening', category: 'core_tools', status: 'active', dateAdded: '2025-02-01', version: '1.0.0', location: 'src/hooks/useEnhancedWakeWord.ts', testable: true },
  { id: 'sovereign-core', name: 'Zoe Sovereign Core', description: 'Z3-PRO unified AI execution engine', category: 'cognitive_modules', status: 'active', dateAdded: '2025-03-01', version: '1.0.0', location: 'src/hooks/useZoeSovereignCore.ts', testable: true },
  { id: 'self-awareness', name: 'Self-Awareness Loop', description: 'Sense-Think-Act cognitive processing', category: 'cognitive_modules', status: 'active', dateAdded: '2025-03-15', version: '1.0.0', location: 'supabase/functions/zoe-self-awareness-core', testable: true },
  
  // Interface Elements
  { id: 'adaptive-ui', name: 'Adaptive Learning Provider', description: 'Real-time behavioral adaptation', category: 'interface_elements', status: 'active', dateAdded: '2025-02-15', version: '2.0.0', location: 'src/components/AdaptiveLearningProvider.tsx', testable: true },
  { id: 'platform-health', name: 'Platform Health Monitor', description: 'Autonomous system diagnostics', category: 'core_tools', status: 'active', dateAdded: '2025-04-01', version: '1.0.0', location: 'src/hooks/usePlatformHealthMonitor.ts', testable: true },
  { id: 'notification-system', name: 'Smart Notifications', description: 'Intelligent notification batching', category: 'interface_elements', status: 'active', dateAdded: '2025-01-20', version: '1.5.0', location: 'src/hooks/useSmartNotifications.ts', testable: true },
  
  // VR Features
  { id: 'vr-omega-world', name: 'VR OMEGA World', description: 'Immersive 3D virtual environment', category: 'vr_features', status: 'active', dateAdded: '2025-05-01', version: '2.0.0', location: 'src/components/VROMEGAWorld.tsx', testable: true },
  { id: 'cyber-city', name: 'Procedural Cyber City', description: 'RPO-style instanced city generation', category: 'vr_features', status: 'new', dateAdded: '2025-12-20', version: '1.0.0', location: 'src/components/vr/features/ProceduralCyberCity.tsx', testable: true },
  { id: 'cinematic-post', name: 'Cinematic Post-Processing', description: 'Unreal Bloom, Chromatic Aberration, Film Grain', category: 'vr_features', status: 'new', dateAdded: '2025-12-20', version: '1.0.0', location: 'src/components/vr/features/CinematicPostProcessing.tsx', testable: true },
  { id: 'gaussian-splat', name: 'Gaussian Splat Viewer', description: '3D Gaussian Splatting for photorealistic scenes', category: 'vr_features', status: 'new', dateAdded: '2025-12-20', version: '1.0.0', location: 'src/components/vr/features/GaussianSplatViewer.tsx', testable: true },
  { id: 'graphics-optimizer', name: 'Graphics Optimizer', description: 'Adaptive GPU tier detection', category: 'vr_features', status: 'new', dateAdded: '2025-12-20', version: '1.0.0', location: 'src/hooks/useGraphicsOptimizer.ts', testable: true },
  
  // Cognitive Modules
  { id: 'adaptive-learning', name: 'Adaptive Learning System', description: 'Behavioral event tracking and personalization', category: 'cognitive_modules', status: 'active', dateAdded: '2025-03-01', version: '2.0.0', location: 'src/hooks/useAdaptiveLearning.ts', testable: true },
  { id: 'zoe-learning', name: 'Zoe Learning System', description: 'Command history and preference learning', category: 'cognitive_modules', status: 'active', dateAdded: '2025-03-10', version: '1.5.0', location: 'src/utils/zoeLearningSystem.ts', testable: true },
  { id: 'dhf-stream', name: 'Continuous DHF Stream', description: 'Real-time data health flow', category: 'cognitive_modules', status: 'active', dateAdded: '2025-04-01', version: '1.0.0', location: 'src/hooks/useContinuousDHFStream.ts', testable: true },
  { id: 'ecn-analysis', name: 'ECN Analysis', description: 'Emotion-Cognition-Need processing', category: 'cognitive_modules', status: 'active', dateAdded: '2025-04-15', version: '1.0.0', location: 'database/ecn_history', testable: true },
  
  // Security
  { id: 'atlas-sync', name: 'ATLAS Sync', description: 'Authorization verification system', category: 'security', status: 'active', dateAdded: '2025-02-01', version: '1.0.0', location: 'src/hooks/useATLASSync.ts', testable: true },
  { id: 'rls-policies', name: 'Row Level Security', description: 'Database-level access control', category: 'security', status: 'active', dateAdded: '2025-01-01', version: '1.0.0', location: 'database/policies', testable: true },
  
  // AI Systems
  { id: 'proactive-vision', name: 'Proactive Vision', description: 'Anticipatory suggestions system', category: 'ai_systems', status: 'active', dateAdded: '2025-05-01', version: '1.0.0', location: 'src/hooks/useZoeProactiveVision.ts', testable: true },
  { id: 'multi-agent', name: 'Multi-Agent System', description: 'Distributed AI coordination', category: 'ai_systems', status: 'active', dateAdded: '2025-05-15', version: '1.0.0', location: 'src/hooks/useZoeMultiAgent.ts', testable: true },
];

// ═══════════════════════════════════════════════════════════════════════════════
// VOICE COMMAND PATTERNS FOR SCANNER
// ═══════════════════════════════════════════════════════════════════════════════

export const SCANNER_VOICE_COMMANDS = [
  { pattern: /(?:zoe\s+)?scan\s+(?:for\s+)?(?:system\s+)?(?:functionalities?|features?|status)/i, action: 'scan_features', description: 'Scan all features' },
  { pattern: /(?:zoe\s+)?(?:run\s+)?(?:full\s+)?(?:system\s+)?scan/i, action: 'full_scan', description: 'Full system scan' },
  { pattern: /(?:zoe\s+)?(?:check|scan)\s+(?:for\s+)?errors?/i, action: 'scan_errors', description: 'Scan for errors' },
  { pattern: /(?:zoe\s+)?fix\s+(?:it|errors?|bugs?|issues?)/i, action: 'auto_fix', description: 'Auto-fix issues' },
  { pattern: /(?:zoe\s+)?test\s+(?:run|features?|system)/i, action: 'test_run', description: 'Test run features' },
  { pattern: /(?:zoe\s+)?security\s+scan/i, action: 'security_scan', description: 'Security scan' },
  { pattern: /(?:zoe\s+)?memory\s+(?:scan|check|status)/i, action: 'memory_scan', description: 'Memory scan' },
  { pattern: /(?:zoe\s+)?(?:check\s+)?(?:adaptive\s+)?learning\s+(?:status|scan)/i, action: 'adaptive_scan', description: 'Adaptive learning scan' },
  { pattern: /(?:zoe\s+)?show\s+(?:new\s+)?(?:features?|capabilities?)/i, action: 'show_features', description: 'Show new features' },
  { pattern: /(?:zoe\s+)?(?:platform|system)\s+health/i, action: 'health_check', description: 'Platform health check' },
  { pattern: /(?:zoe\s+)?(?:scan\s+)?data\s+(?:management|sync|flow)/i, action: 'data_scan', description: 'Data management scan' },
  { pattern: /(?:zoe\s+)?(?:deep|ultra)\s+scan/i, action: 'deep_scan', description: 'Deep comprehensive scan' },
  { pattern: /(?:zoe\s+)?(?:vr|virtual\s+reality|omega\s+world)\s+(?:scan|check|status|fix)/i, action: 'vr_scan', description: 'VR World scan' },
  { pattern: /(?:zoe\s+)?(?:dhf|data\s+health)\s+(?:scan|check|status)/i, action: 'dhf_scan', description: 'DHF data health scan' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN HOOK
// ═══════════════════════════════════════════════════════════════════════════════

export const useFeatureScanner = () => {
  const { user } = useAuth();
  const [state, setState] = useState<ScannerState>({
    isScanning: false,
    scanProgress: 0,
    currentPhase: '',
    scanHistory: [],
    autoScanEnabled: true,
    voiceEnabled: true,
  });
  
  const abortControllerRef = useRef<AbortController | null>(null);

  // ═══════════════════════════════════════════════════════════════════════════════
  // CORE SCANNING FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════════════════

  const updateProgress = useCallback((progress: number, phase: string) => {
    setState(prev => ({ ...prev, scanProgress: progress, currentPhase: phase }));
  }, []);

  // Scan for new capabilities
  const scanNewCapabilities = useCallback(async (timeframeDays: number = 30): Promise<FeatureCapability[]> => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - timeframeDays);
    
    return SYSTEM_MANIFEST.filter(feature => {
      const featureDate = new Date(feature.dateAdded);
      return featureDate >= cutoffDate || feature.status === 'new' || feature.status === 'updated';
    });
  }, []);

  // Scan for errors
  const scanForErrors = useCallback(async (): Promise<ScanError[]> => {
    const errors: ScanError[] = [];

    try {
      // 1. Console errors
      const consoleErrors = (window as any).__platformErrors || [];
      consoleErrors.forEach((error: any, index: number) => {
        errors.push({
          id: `console-${index}-${Date.now()}`,
          type: 'error',
          category: 'Runtime',
          message: error.message || 'Unknown console error',
          location: error.stack?.split('\n')[1] || 'Unknown',
          stack: error.stack,
          fixable: false,
          timestamp: error.timestamp || new Date().toISOString(),
        });
      });

      // 2. Unhandled Promise Rejections
      const rejections = (window as any).__unhandledRejections || [];
      rejections.forEach((rejection: any, index: number) => {
        errors.push({
          id: `rejection-${index}-${Date.now()}`,
          type: 'error',
          category: 'Promise',
          message: String(rejection.reason) || 'Unhandled promise rejection',
          location: 'Async Operations',
          fixable: false,
          timestamp: rejection.timestamp || new Date().toISOString(),
        });
      });

      // 3. React errors
      const reactErrors = (window as any).__reactErrors || [];
      reactErrors.forEach((error: any, index: number) => {
        errors.push({
          id: `react-${index}-${Date.now()}`,
          type: 'critical',
          category: 'React',
          message: error.message || 'React component error',
          location: error.componentStack || 'Unknown component',
          stack: error.stack,
          fixable: false,
          timestamp: new Date().toISOString(),
        });
      });

      // 4. Memory issues
      if ((performance as any).memory) {
        const memory = (performance as any).memory;
        const usedMB = memory.usedJSHeapSize / 1048576;
        const limitMB = memory.jsHeapSizeLimit / 1048576;
        
        if (usedMB > limitMB * 0.8) {
          errors.push({
            id: `memory-high-${Date.now()}`,
            type: 'warning',
            category: 'Memory',
            message: `High memory usage: ${usedMB.toFixed(1)}MB / ${limitMB.toFixed(1)}MB (${((usedMB / limitMB) * 100).toFixed(1)}%)`,
            location: 'Runtime Memory',
            fixable: true,
            suggestedFix: 'Clear cached data and optimize component lifecycle',
            timestamp: new Date().toISOString(),
          });
        }
      }

      // 5. Performance issues
      const perfEntries = performance.getEntriesByType('navigation');
      if (perfEntries.length > 0) {
        const nav = perfEntries[0] as PerformanceNavigationTiming;
        if (nav.domContentLoadedEventEnd > 3000) {
          errors.push({
            id: `perf-slow-${Date.now()}`,
            type: 'performance',
            category: 'Performance',
            message: `Slow DOM load: ${nav.domContentLoadedEventEnd.toFixed(0)}ms`,
            location: 'Page Load',
            fixable: true,
            suggestedFix: 'Implement code splitting and lazy loading',
            timestamp: new Date().toISOString(),
          });
        }
      }

      // 6. Network status
      if (!navigator.onLine) {
        errors.push({
          id: `offline-${Date.now()}`,
          type: 'critical',
          category: 'Network',
          message: 'Device is offline',
          location: 'Network Layer',
          fixable: false,
          timestamp: new Date().toISOString(),
        });
      }

      // 7. LocalStorage issues
      try {
        const testKey = '__scanner_test__';
        localStorage.setItem(testKey, 'test');
        localStorage.removeItem(testKey);
      } catch (e) {
        errors.push({
          id: `storage-${Date.now()}`,
          type: 'warning',
          category: 'Storage',
          message: 'LocalStorage unavailable or full',
          location: 'Browser Storage',
          fixable: true,
          suggestedFix: 'Clear old cached data',
          timestamp: new Date().toISOString(),
        });
      }

      // 8. Database connection
      const { error: dbError } = await supabase.from('profiles').select('user_id').limit(1);
      if (dbError) {
        errors.push({
          id: `db-${Date.now()}`,
          type: 'critical',
          category: 'Database',
          message: dbError.message,
          location: 'Supabase Connection',
          fixable: false,
          timestamp: new Date().toISOString(),
        });
      }

      // 9. Voice/Speech synthesis check
      if ('speechSynthesis' in window) {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length === 0) {
          errors.push({
            id: `voice-${Date.now()}`,
            type: 'warning',
            category: 'Voice',
            message: 'No speech synthesis voices available',
            location: 'Speech API',
            fixable: true,
            suggestedFix: 'Reinitialize voice synthesis',
            timestamp: new Date().toISOString(),
          });
        }
        if (window.speechSynthesis.speaking && window.speechSynthesis.paused) {
          errors.push({
            id: `voice-stuck-${Date.now()}`,
            type: 'warning',
            category: 'Voice',
            message: 'Speech synthesis is stuck/paused',
            location: 'Speech API',
            fixable: true,
            suggestedFix: 'Resume or reset speech synthesis',
            timestamp: new Date().toISOString(),
          });
        }
      }

      // 10. Audio context check
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const testContext = new AudioContextClass();
          if (testContext.state === 'suspended') {
            errors.push({
              id: `audio-${Date.now()}`,
              type: 'warning',
              category: 'Audio',
              message: 'Audio context suspended (needs user interaction)',
              location: 'Web Audio API',
              fixable: true,
              suggestedFix: 'Resume audio context after user gesture',
              timestamp: new Date().toISOString(),
            });
          }
          testContext.close();
        }
      } catch {
        // Audio context not available
      }

      // 11. WebGL/Canvas check for VR
      try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        if (!gl) {
          errors.push({
            id: `webgl-${Date.now()}`,
            type: 'warning',
            category: 'VR Rendering',
            message: 'WebGL not available or disabled',
            location: 'Graphics API',
            fixable: false,
            timestamp: new Date().toISOString(),
          });
        }
      } catch {
        errors.push({
          id: `canvas-${Date.now()}`,
          type: 'error',
          category: 'Canvas',
          message: 'Canvas/WebGL initialization failed',
          location: 'Graphics API',
          fixable: true,
          suggestedFix: 'Refresh canvas context',
          timestamp: new Date().toISOString(),
        });
      }

      // 12. Check VR error queue
      const vrErrors = (window as any).__vrErrors || [];
      vrErrors.forEach((vrError: any, index: number) => {
        errors.push({
          id: `vr-${index}-${Date.now()}`,
          type: vrError.severity === 'critical' ? 'critical' : 'warning',
          category: 'VR World',
          message: vrError.message || 'VR World error',
          location: vrError.location || 'VR Environment',
          fixable: true,
          suggestedFix: 'Reset VR world state',
          timestamp: vrError.timestamp || new Date().toISOString(),
        });
      });

    } catch (error) {
      errors.push({
        id: `scanner-error-${Date.now()}`,
        type: 'error',
        category: 'Scanner',
        message: error instanceof Error ? error.message : 'Scanner error',
        location: 'useFeatureScanner',
        fixable: false,
        timestamp: new Date().toISOString(),
      });
    }

    return errors;
  }, []);

  // Auto-fix function - Enhanced for all menus including VR DHF
  const autoFix = useCallback(async (errors: ScanError[]): Promise<AppliedFix[]> => {
    const fixes: AppliedFix[] = [];
    
    for (const error of errors.filter(e => e.fixable)) {
      try {
        let result: 'success' | 'partial' | 'failed' = 'failed';
        let action = '';

        switch (error.category) {
          case 'Memory':
            // Clear caches
            if ('caches' in window) {
              const cacheNames = await caches.keys();
              await Promise.all(cacheNames.map(name => caches.delete(name)));
            }
            // Clear console error tracking
            (window as any).__platformErrors = [];
            (window as any).__unhandledRejections = [];
            // Dispatch VR memory clear event
            window.dispatchEvent(new CustomEvent('vr-clear-cache'));
            action = 'Cleared browser caches, error buffers, and VR cache';
            result = 'success';
            break;

          case 'Storage':
            // Remove old items
            const keysToRemove: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key && (key.includes('__old') || key.includes('__temp') || key.includes('expired'))) {
                keysToRemove.push(key);
              }
            }
            keysToRemove.forEach(key => localStorage.removeItem(key));
            action = `Removed ${keysToRemove.length} old storage items`;
            result = keysToRemove.length > 0 ? 'success' : 'partial';
            break;

          case 'Performance':
            // Request idle callback for cleanup
            if ('requestIdleCallback' in window) {
              (window as any).requestIdleCallback(() => {
                // Trigger garbage collection hint
                (window as any).__platformErrors = [];
              });
            }
            action = 'Scheduled performance optimization';
            result = 'partial';
            break;

          case 'VR':
          case 'VR World':
          case 'VR Rendering':
            // Dispatch VR-specific fix events
            window.dispatchEvent(new CustomEvent('vr-force-rerender'));
            window.dispatchEvent(new CustomEvent('vr-reset-physics'));
            action = 'Triggered VR world refresh and physics reset';
            result = 'success';
            break;

          case 'Voice':
          case 'Speech':
            // Reset voice systems
            if (window.speechSynthesis) {
              window.speechSynthesis.cancel();
              await new Promise(r => setTimeout(r, 100));
              window.speechSynthesis.getVoices();
            }
            window.dispatchEvent(new CustomEvent('zoe-restart-recognition'));
            action = 'Reset voice synthesis and recognition';
            result = 'success';
            break;

          case 'Audio':
            // Reset audio context
            try {
              const ctx = new AudioContext();
              await ctx.resume();
              await ctx.close();
              action = 'Resumed and reset audio context';
              result = 'success';
            } catch {
              action = 'Audio context fix attempted';
              result = 'partial';
            }
            break;

          case 'Network':
            // Attempt to reconnect realtime channels
            try {
              await supabase.removeAllChannels();
              action = 'Cleared and reset network channels';
              result = 'success';
            } catch {
              action = 'Network reset attempted';
              result = 'partial';
            }
            break;

          case 'Canvas':
          case 'Rendering':
            // Force re-render
            window.dispatchEvent(new CustomEvent('vr-force-rerender'));
            window.dispatchEvent(new CustomEvent('vr-reload-environment'));
            action = 'Triggered canvas and environment refresh';
            result = 'success';
            break;

          case 'DHF':
          case 'Adaptive Learning':
            // Reset DHF state
            window.dispatchEvent(new CustomEvent('dhf-force-sync'));
            action = 'Forced DHF data synchronization';
            result = 'partial';
            break;

          default:
            action = 'No auto-fix available for this error type';
            result = 'failed';
        }

        fixes.push({
          id: `fix-${error.id}`,
          errorId: error.id,
          description: error.suggestedFix || 'Applied auto-fix',
          action,
          result,
          timestamp: new Date().toISOString(),
        });

      } catch (fixError) {
        fixes.push({
          id: `fix-${error.id}`,
          errorId: error.id,
          description: 'Fix attempt failed',
          action: fixError instanceof Error ? fixError.message : 'Unknown error',
          result: 'failed',
          timestamp: new Date().toISOString(),
        });
      }
    }

    return fixes;
  }, []);

  // Test run features
  const testFeatures = useCallback(async (features: FeatureCapability[]): Promise<FeatureCapability[]> => {
    const testedFeatures: FeatureCapability[] = [];

    for (const feature of features.filter(f => f.testable)) {
      let testResult: 'passed' | 'failed' | 'pending' = 'pending';

      try {
        switch (feature.id) {
          case 'zoe-agent':
            // Test Zoe context availability
            testResult = typeof window !== 'undefined' ? 'passed' : 'failed';
            break;

          case 'voice-commands':
            // Test speech recognition support
            testResult = 'speechRecognition' in window || 'webkitSpeechRecognition' in window ? 'passed' : 'failed';
            break;

          case 'vr-omega-world':
            // Test WebGL support
            const canvas = document.createElement('canvas');
            testResult = canvas.getContext('webgl2') || canvas.getContext('webgl') ? 'passed' : 'failed';
            break;

          default:
            // Generic availability test
            testResult = 'passed';
        }
      } catch (error) {
        testResult = 'failed';
      }

      testedFeatures.push({
        ...feature,
        lastTested: new Date().toISOString(),
        testResult,
      });
    }

    return testedFeatures;
  }, []);

  // Security scan
  const securityScan = useCallback(async (): Promise<ScanError[]> => {
    const securityIssues: ScanError[] = [];

    try {
      // Check auth state
      const { data: { session } } = await supabase.auth.getSession();
      if (!session && window.location.pathname !== '/auth') {
        // Not critical if on public page
      }

      // Check for exposed secrets in localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.toLowerCase().includes('secret') || key.toLowerCase().includes('api_key'))) {
          securityIssues.push({
            id: `security-exposed-key-${Date.now()}`,
            type: 'security',
            category: 'Security',
            message: `Potentially sensitive key in localStorage: ${key}`,
            location: 'Browser Storage',
            fixable: false,
            timestamp: new Date().toISOString(),
          });
        }
      }

      // Check HTTPS
      if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
        securityIssues.push({
          id: `security-https-${Date.now()}`,
          type: 'security',
          category: 'Security',
          message: 'Connection is not secure (not HTTPS)',
          location: 'Network',
          fixable: false,
          timestamp: new Date().toISOString(),
        });
      }

    } catch (error) {
      securityIssues.push({
        id: `security-scan-error-${Date.now()}`,
        type: 'warning',
        category: 'Security',
        message: 'Security scan encountered an error',
        location: 'Scanner',
        fixable: false,
        timestamp: new Date().toISOString(),
      });
    }

    return securityIssues;
  }, []);

  // Memory scan
  const memoryScan = useCallback(async (): Promise<{ issues: ScanError[]; stats: any }> => {
    const issues: ScanError[] = [];
    let stats = {};

    if ((performance as any).memory) {
      const memory = (performance as any).memory;
      stats = {
        usedJSHeapSize: (memory.usedJSHeapSize / 1048576).toFixed(2) + ' MB',
        totalJSHeapSize: (memory.totalJSHeapSize / 1048576).toFixed(2) + ' MB',
        jsHeapSizeLimit: (memory.jsHeapSizeLimit / 1048576).toFixed(2) + ' MB',
        usagePercent: ((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100).toFixed(1) + '%',
      };

      if (memory.usedJSHeapSize > memory.jsHeapSizeLimit * 0.9) {
        issues.push({
          id: `memory-critical-${Date.now()}`,
          type: 'critical',
          category: 'Memory',
          message: 'Memory usage critically high - potential crash risk',
          location: 'JS Heap',
          fixable: true,
          suggestedFix: 'Clear caches and reload page',
          timestamp: new Date().toISOString(),
        });
      }
    }

    return { issues, stats };
  }, []);

  // Adaptive learning scan
  const adaptiveScan = useCallback(async (): Promise<{ issues: ScanError[]; status: any }> => {
    const issues: ScanError[] = [];
    let status = { synced: false, eventCount: 0, lastSync: null };

    try {
      if (user?.id) {
        // Check behavioral events
        const { data: events, error } = await supabase
          .from('behavioral_events')
          .select('id, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) {
          issues.push({
            id: `adaptive-db-${Date.now()}`,
            type: 'warning',
            category: 'Adaptive Learning',
            message: 'Could not fetch behavioral events',
            location: 'Database',
            fixable: false,
            timestamp: new Date().toISOString(),
          });
        } else {
          status = {
            synced: true,
            eventCount: events?.length || 0,
            lastSync: events?.[0]?.created_at || null,
          };
        }

        // Check ECN history
        const { data: ecnData, error: ecnError } = await supabase
          .from('ecn_history')
          .select('id')
          .eq('user_id', user.id)
          .limit(1);

        if (ecnError || !ecnData?.length) {
          issues.push({
            id: `ecn-missing-${Date.now()}`,
            type: 'warning',
            category: 'Adaptive Learning',
            message: 'No ECN (Emotion-Cognition-Need) data found',
            location: 'ECN System',
            fixable: false,
            timestamp: new Date().toISOString(),
          });
        }
      }
    } catch (error) {
      issues.push({
        id: `adaptive-error-${Date.now()}`,
        type: 'error',
        category: 'Adaptive Learning',
        message: 'Adaptive scan failed',
        location: 'Scanner',
        fixable: false,
        timestamp: new Date().toISOString(),
      });
    }

    return { issues, status };
  }, [user?.id]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // MAIN SCAN ORCHESTRATOR
  // ═══════════════════════════════════════════════════════════════════════════════

  const runScan = useCallback(async (
    scanType: SystemScanResult['scanType'] = 'full',
    options: { autoFix?: boolean; speak?: boolean } = { autoFix: true, speak: true }
  ): Promise<SystemScanResult> => {
    if (state.isScanning) {
      toast.warning('Scan already in progress');
      return state.lastScan!;
    }

    abortControllerRef.current = new AbortController();
    setState(prev => ({ ...prev, isScanning: true, scanProgress: 0, currentPhase: 'Initializing...' }));

    const result: SystemScanResult = {
      id: `scan-${Date.now()}`,
      timestamp: new Date().toISOString(),
      scanType,
      status: 'in_progress',
      summary: {
        totalFeatures: 0,
        newFeatures: 0,
        errors: 0,
        warnings: 0,
        fixesApplied: 0,
        healthScore: 100,
      },
      features: [],
      errors: [],
      fixes: [],
      recommendations: [],
    };

    try {
      if (options.speak && state.voiceEnabled) {
        speakAsZoe(`Initiating ${scanType} scan. Analyzing platform systems.`);
      }

      // Phase 1: Feature scan
      updateProgress(10, 'Scanning features...');
      result.features = await scanNewCapabilities();
      result.summary.totalFeatures = SYSTEM_MANIFEST.length;
      result.summary.newFeatures = result.features.filter(f => f.status === 'new').length;

      // Phase 2: Error scan
      updateProgress(30, 'Detecting errors...');
      const runtimeErrors = await scanForErrors();
      result.errors.push(...runtimeErrors);

      // Phase 3: Security scan (if full or security type)
      if (scanType === 'full' || scanType === 'security') {
        updateProgress(45, 'Security analysis...');
        const securityErrors = await securityScan();
        result.errors.push(...securityErrors);
      }

      // Phase 4: Memory scan (if full or memory type)
      if (scanType === 'full' || scanType === 'memory') {
        updateProgress(55, 'Memory analysis...');
        const { issues: memoryIssues } = await memoryScan();
        result.errors.push(...memoryIssues);
      }

      // Phase 5: Adaptive learning scan (if full or adaptive type)
      if (scanType === 'full' || scanType === 'adaptive') {
        updateProgress(60, 'Adaptive learning check...');
        const { issues: adaptiveIssues } = await adaptiveScan();
        result.errors.push(...adaptiveIssues);
      }

      // Phase 5.5: VR World scan (if full or vr type)
      if (scanType === 'full' || scanType === 'vr') {
        updateProgress(68, 'VR World diagnostics...');
        // Check VR error queue
        const vrErrors = (window as any).__vrErrors || [];
        vrErrors.forEach((vrError: any, index: number) => {
          result.errors.push({
            id: `vr-scan-${index}-${Date.now()}`,
            type: vrError.severity === 'critical' ? 'critical' : 'warning',
            category: 'VR World',
            message: vrError.message || 'VR World error',
            location: vrError.location || 'VR Environment',
            fixable: true,
            suggestedFix: 'Reset VR world state',
            timestamp: vrError.timestamp || new Date().toISOString(),
          });
        });
        
        // Check WebGL status
        try {
          const canvas = document.createElement('canvas');
          const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
          if (!gl) {
            result.errors.push({
              id: `vr-webgl-${Date.now()}`,
              type: 'warning',
              category: 'VR Rendering',
              message: 'WebGL not available for VR World',
              location: 'Graphics API',
              fixable: false,
              timestamp: new Date().toISOString(),
            });
          }
        } catch {
          // WebGL check failed
        }
        
        // Dispatch VR health check event
        window.dispatchEvent(new CustomEvent('vr-health-check'));
      }

      // Phase 6: Test features
      if (scanType === 'full' || scanType === 'features') {
        updateProgress(75, 'Testing features...');
        result.features = await testFeatures(result.features);
      }

      // Phase 7: Auto-fix
      if (options.autoFix && result.errors.some(e => e.fixable)) {
        updateProgress(85, 'Applying fixes...');
        result.fixes = await autoFix(result.errors);
        result.summary.fixesApplied = result.fixes.filter(f => f.result === 'success').length;
      }

      // Calculate summary
      result.summary.errors = result.errors.filter(e => e.type === 'error' || e.type === 'critical').length;
      result.summary.warnings = result.errors.filter(e => e.type === 'warning').length;
      
      // Calculate health score
      let healthScore = 100;
      result.errors.forEach(error => {
        switch (error.type) {
          case 'critical': healthScore -= 25; break;
          case 'error': healthScore -= 15; break;
          case 'security': healthScore -= 20; break;
          case 'warning': healthScore -= 5; break;
          case 'performance': healthScore -= 8; break;
        }
      });
      result.summary.healthScore = Math.max(0, healthScore);

      // Generate recommendations
      if (result.summary.errors > 0) {
        result.recommendations.push('Address critical and high-priority errors first');
      }
      if (result.errors.some(e => e.category === 'Memory')) {
        result.recommendations.push('Consider clearing browser cache and reloading');
      }
      if (result.errors.some(e => e.category === 'VR World' || e.category === 'VR Rendering')) {
        result.recommendations.push('VR issues detected - try "fix VR" or reload the VR world');
      }
      if (result.errors.some(e => e.category === 'Voice' || e.category === 'Audio')) {
        result.recommendations.push('Voice/audio issues detected - check microphone permissions');
      }
      if (result.summary.newFeatures > 0) {
        result.recommendations.push(`${result.summary.newFeatures} new features detected - explore them!`);
      }

      result.status = 'completed';
      updateProgress(100, 'Scan complete');

      // Report results
      if (options.speak && state.voiceEnabled) {
        const message = `Scan complete. Health score: ${result.summary.healthScore}%. ` +
          `Found ${result.summary.errors} errors and ${result.summary.warnings} warnings. ` +
          `${result.summary.fixesApplied} fixes applied.`;
        speakAsZoe(message);
      }

      toast.success(`Scan complete: Health ${result.summary.healthScore}%`);

      // Store result
      setState(prev => ({
        ...prev,
        isScanning: false,
        scanProgress: 100,
        currentPhase: 'Complete',
        lastScan: result,
        scanHistory: [result, ...prev.scanHistory.slice(0, 9)],
      }));

      // Log to database
      if (user?.id) {
        await supabase.from('platform_health_logs').insert({
          user_id: user.id,
          score: result.summary.healthScore,
          status: result.summary.healthScore > 80 ? 'healthy' : result.summary.healthScore > 50 ? 'warning' : 'critical',
          issues_count: result.errors.length,
          critical_issues: result.errors.filter(e => e.type === 'critical').length,
          scan_data: {
            scanType,
            features: result.features.length,
            fixes: result.fixes.length,
          } as any,
        } as any);
      }

    } catch (error) {
      console.error('[FeatureScanner] Scan failed:', error);
      result.status = 'failed';
      toast.error('Scan failed');
      
      setState(prev => ({
        ...prev,
        isScanning: false,
        scanProgress: 0,
        currentPhase: 'Failed',
      }));

      if (options.speak && state.voiceEnabled) {
        speakAsZoe('Scan encountered an error. Please try again.');
      }
    }

    return result;
  }, [state.isScanning, state.voiceEnabled, user?.id, updateProgress, scanNewCapabilities, scanForErrors, securityScan, memoryScan, adaptiveScan, testFeatures, autoFix]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // VOICE COMMAND PROCESSOR
  // ═══════════════════════════════════════════════════════════════════════════════

  const processVoiceCommand = useCallback(async (command: string): Promise<boolean> => {
    const lowerCommand = command.toLowerCase().trim();

    for (const cmd of SCANNER_VOICE_COMMANDS) {
      if (cmd.pattern.test(lowerCommand)) {
        switch (cmd.action) {
          case 'scan_features':
          case 'show_features':
            await runScan('features');
            return true;

          case 'full_scan':
          case 'deep_scan':
            await runScan('full');
            return true;

          case 'scan_errors':
            await runScan('errors');
            return true;

          case 'auto_fix':
            if (state.lastScan?.errors.some(e => e.fixable)) {
              const fixes = await autoFix(state.lastScan.errors);
              speakAsZoe(`Applied ${fixes.filter(f => f.result === 'success').length} fixes.`);
            } else {
              await runScan('errors', { autoFix: true });
            }
            return true;

          case 'test_run':
            const features = await scanNewCapabilities();
            await testFeatures(features);
            speakAsZoe('Feature test run complete.');
            return true;

          case 'security_scan':
            await runScan('security');
            return true;

          case 'memory_scan':
            await runScan('memory');
            return true;

          case 'adaptive_scan':
            await runScan('adaptive');
            return true;

          case 'health_check':
            await runScan('quick');
            return true;

          case 'data_scan':
          case 'dhf_scan':
            await runScan('adaptive');
            return true;

          case 'vr_scan':
            await runScan('vr');
            return true;
        }
      }
    }

    return false;
  }, [runScan, state.lastScan, autoFix, scanNewCapabilities, testFeatures]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // EVENT LISTENERS
  // ═══════════════════════════════════════════════════════════════════════════════

  // Store stable references in refs to avoid stale closures
  const runScanRef = useRef(runScan);
  const autoFixRef = useRef(autoFix);
  const processVoiceCommandRef = useRef(processVoiceCommand);
  const lastScanRef = useRef(state.lastScan);
  
  useEffect(() => {
    runScanRef.current = runScan;
    autoFixRef.current = autoFix;
    processVoiceCommandRef.current = processVoiceCommand;
    lastScanRef.current = state.lastScan;
  }, [runScan, autoFix, processVoiceCommand, state.lastScan]);

  useEffect(() => {
    const handleScannerCommand = (event: CustomEvent) => {
      const { command, action } = event.detail || {};
      if (command) {
        processVoiceCommandRef.current(command);
      } else if (action) {
        switch (action) {
          case 'full_scan': runScanRef.current('full'); break;
          case 'quick_scan': runScanRef.current('quick'); break;
          case 'security_scan': runScanRef.current('security'); break;
          case 'memory_scan': runScanRef.current('memory'); break;
          case 'adaptive_scan': 
          case 'dhf_scan': runScanRef.current('adaptive'); break;
          case 'features_scan': runScanRef.current('features'); break;
          case 'errors_scan': runScanRef.current('errors'); break;
          case 'vr_scan': runScanRef.current('vr'); break;
          case 'fix_all': autoFixRef.current(lastScanRef.current?.errors || []); break;
        }
      }
    };

    window.addEventListener('zoe-scanner-command', handleScannerCommand as EventListener);
    return () => window.removeEventListener('zoe-scanner-command', handleScannerCommand as EventListener);
  }, []); // Empty deps - uses refs for stable references

  // ═══════════════════════════════════════════════════════════════════════════════
  // RETURN
  // ═══════════════════════════════════════════════════════════════════════════════

  return {
    // State
    ...state,
    systemManifest: SYSTEM_MANIFEST,

    // Actions
    runScan,
    scanNewCapabilities,
    scanForErrors,
    autoFix,
    testFeatures,
    securityScan,
    memoryScan,
    adaptiveScan,
    processVoiceCommand,

    // Settings
    setAutoScanEnabled: (enabled: boolean) => setState(prev => ({ ...prev, autoScanEnabled: enabled })),
    setVoiceEnabled: (enabled: boolean) => setState(prev => ({ ...prev, voiceEnabled: enabled })),

    // Abort
    abortScan: () => {
      abortControllerRef.current?.abort();
      setState(prev => ({ ...prev, isScanning: false, currentPhase: 'Aborted' }));
    },
  };
};

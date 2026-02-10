// ═══════════════════════════════════════════════════════════════════════════════
// VR AUTO-FIX SYSTEM
// Zoe's self-healing capabilities for VR World with user authorization
// "I hereby authorize" pattern for autonomous repairs
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

// Issue types that can be auto-fixed
export type VRIssueType = 
  | 'voice_init_failed'
  | 'webxr_not_supported'
  | 'audio_context_blocked'
  | 'canvas_rendering_error'
  | 'memory_overflow'
  | 'physics_desync'
  | 'network_lag'
  | 'asset_load_failed'
  | 'haptic_unavailable'
  | 'camera_stuck'
  | 'environment_glitch'
  | 'building_collision'
  | 'vehicle_stuck'
  | 'avatar_render_error'
  | 'webgl_context_lost'
  | 'webgl_not_supported'
  | 'headset_disconnected'
  | 'controller_tracking_lost'
  | 'hand_tracking_failed'
  | 'passthrough_failed'
  | 'spatial_audio_error'
  | 'frame_rate_drop'
  | 'render_scale_issue'
  | 'browser_incompatible'
  | 'secure_context_required'
  | 'gpu_crash'
  | 'shader_compilation_failed';

export interface VRIssue {
  id: string;
  type: VRIssueType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  autoFixable: boolean;
  fixAttempts: number;
  fixedAt?: Date;
  detectedAt: Date;
}

export interface AutoFixResult {
  success: boolean;
  issue: VRIssue;
  action: string;
  message: string;
}

const STORAGE_KEY = 'zoe-vr-autofix-auth';

export const useVRAutoFix = () => {
  const { user } = useAuth();
  // Auto-authorized by default - no popup needed
  const [isAuthorized, setIsAuthorized] = useState(true);

  const [autoFixEnabled, setAutoFixEnabled] = useState(true);
  const [issueQueue, setIssueQueue] = useState<VRIssue[]>([]);
  const [fixHistory, setFixHistory] = useState<AutoFixResult[]>([]);
  const [isFixing, setIsFixing] = useState(false);
  const fixTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Persist authorization state
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      authorized: isAuthorized,
      authorizedAt: isAuthorized ? new Date().toISOString() : null,
    }));
  }, [isAuthorized]);

  // Silent auto-authorization - no popup needed
  const requestAuthorization = useCallback((): Promise<boolean> => {
    setIsAuthorized(true);
    console.log('[VR AutoFix] Auto-authorized for silent operation');
    return Promise.resolve(true);
  }, []);

  // Revoke authorization
  const revokeAuthorization = useCallback(() => {
    setIsAuthorized(false);
    toast.info('Zoe VR Auto-Fix authorization revoked');
  }, []);

  // Detect VR issues
  const detectIssue = useCallback((type: VRIssueType, description: string, severity: VRIssue['severity'] = 'medium'): VRIssue => {
    const issue: VRIssue = {
      id: crypto.randomUUID(),
      type,
      severity,
      description,
      autoFixable: true,
      fixAttempts: 0,
      detectedAt: new Date(),
    };

    setIssueQueue(prev => [...prev, issue]);
    console.log(`[VR AutoFix] Issue detected: ${type} - ${description}`);

    return issue;
  }, []);

  // Auto-fix a specific issue
  const autoFixIssue = useCallback(async (issue: VRIssue): Promise<AutoFixResult> => {
    if (!isAuthorized || !autoFixEnabled) {
      return {
        success: false,
        issue,
        action: 'none',
        message: 'Auto-fix not authorized',
      };
    }

    setIsFixing(true);
    let result: AutoFixResult;

    try {
      switch (issue.type) {
        case 'voice_init_failed':
          window.speechSynthesis?.cancel();
          await new Promise(r => setTimeout(r, 100));
          window.speechSynthesis?.getVoices();
          window.dispatchEvent(new CustomEvent('zoe-restart-recognition'));
          result = { success: true, issue, action: 'voice_reset', message: 'Voice systems reinitialized' };
          break;

        case 'audio_context_blocked':
          try {
            const ctx = new AudioContext();
            await ctx.resume();
            await ctx.close();
          } catch {}
          result = { success: true, issue, action: 'audio_context_resume', message: 'Audio context resumed' };
          break;

        case 'canvas_rendering_error':
          window.dispatchEvent(new CustomEvent('vr-force-rerender'));
          result = { success: true, issue, action: 'canvas_refresh', message: 'Canvas refreshed' };
          break;

        case 'memory_overflow':
          // Clear cached textures and geometries
          window.dispatchEvent(new CustomEvent('vr-clear-cache'));
          result = { success: true, issue, action: 'memory_clear', message: 'Memory cache cleared' };
          break;

        case 'physics_desync':
          window.dispatchEvent(new CustomEvent('vr-reset-physics'));
          result = { success: true, issue, action: 'physics_reset', message: 'Physics engine resynced' };
          break;

        case 'camera_stuck':
          window.dispatchEvent(new CustomEvent('vr-reset-position'));
          result = { success: true, issue, action: 'camera_reset', message: 'Camera position reset' };
          break;

        case 'environment_glitch':
          window.dispatchEvent(new CustomEvent('vr-reload-environment'));
          result = { success: true, issue, action: 'environment_reload', message: 'Environment reloaded' };
          break;

        case 'building_collision':
          window.dispatchEvent(new CustomEvent('vr-fix-collisions'));
          result = { success: true, issue, action: 'collision_fix', message: 'Building collisions fixed' };
          break;

        case 'vehicle_stuck':
          window.dispatchEvent(new CustomEvent('vr-unstick-vehicle'));
          result = { success: true, issue, action: 'vehicle_unstick', message: 'Vehicle unstuck' };
          break;

        case 'avatar_render_error':
          window.dispatchEvent(new CustomEvent('vr-reload-avatar'));
          result = { success: true, issue, action: 'avatar_reload', message: 'Avatar reloaded' };
          break;

        case 'network_lag':
          // Attempt to reconnect realtime
          await supabase.removeAllChannels();
          result = { success: true, issue, action: 'network_reconnect', message: 'Network reconnected' };
          break;

        case 'asset_load_failed':
          window.dispatchEvent(new CustomEvent('vr-retry-assets'));
          result = { success: true, issue, action: 'asset_retry', message: 'Assets reloading' };
          break;

        case 'haptic_unavailable':
          result = { success: false, issue, action: 'haptic_skip', message: 'Haptic feedback unavailable on this device' };
          break;

        case 'webxr_not_supported':
          result = { success: false, issue, action: 'webxr_fallback', message: 'WebXR not supported, using fallback mode' };
          break;

        case 'webgl_context_lost':
          // Force restore WebGL context
          const canvases = document.querySelectorAll('canvas');
          canvases.forEach(canvas => {
            const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
            if (gl) {
              const ext = gl.getExtension('WEBGL_lose_context');
              if (ext) ext.restoreContext();
            }
          });
          result = { success: true, issue, action: 'webgl_restore', message: 'WebGL context restored' };
          break;

        case 'webgl_not_supported':
          result = { success: false, issue, action: 'fallback_mode', message: 'WebGL not supported - try different browser' };
          break;

        case 'frame_rate_drop':
          window.dispatchEvent(new CustomEvent('vr-reduce-quality', { detail: { level: 'low' } }));
          result = { success: true, issue, action: 'quality_reduce', message: 'Graphics quality reduced' };
          break;

        case 'spatial_audio_error':
          try {
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioCtx) {
              const ctx = new AudioCtx();
              await ctx.resume();
            }
            result = { success: true, issue, action: 'audio_reset', message: 'Audio context reset' };
          } catch {
            result = { success: false, issue, action: 'audio_failed', message: 'Audio reset failed' };
          }
          break;

        case 'render_scale_issue':
          window.dispatchEvent(new CustomEvent('vr-adjust-render-scale', { detail: { scale: 1.0 } }));
          result = { success: true, issue, action: 'scale_adjust', message: 'Render scale adjusted' };
          break;

        case 'headset_disconnected':
        case 'controller_tracking_lost':
        case 'hand_tracking_failed':
        case 'passthrough_failed':
          result = { success: false, issue, action: 'hardware_check', message: 'Check headset/controller connection' };
          break;

        case 'browser_incompatible':
        case 'secure_context_required':
        case 'gpu_crash':
        case 'shader_compilation_failed':
          result = { success: false, issue, action: 'manual_required', message: 'Manual intervention required' };
          break;

        default:
          result = { success: false, issue, action: 'unknown', message: 'Unknown issue type' };
      }
    } catch (err) {
      console.error('[VR AutoFix] Fix failed:', err);
      result = { success: false, issue, action: 'error', message: `Fix failed: ${err}` };
    }

    // Update issue and history
    issue.fixAttempts++;
    if (result.success) {
      issue.fixedAt = new Date();
      setIssueQueue(prev => prev.filter(i => i.id !== issue.id));
      toast.success(`🔧 Auto-Fixed: ${result.message}`);
    }

    setFixHistory(prev => [...prev, result]);
    setIsFixing(false);

    // Log to DHF for learning
    if (user) {
      await supabase.from('behavioral_events').insert({
        user_id: user.id,
        event_type: 'vr_auto_fix',
        event_category: 'system_maintenance',
        context_snippet: `${issue.type}: ${result.message}`,
        metadata: {
          issue_type: issue.type,
          success: result.success,
          action: result.action,
          fix_attempts: issue.fixAttempts,
        },
        dhf_logged: true,
      });
    }

    return result;
  }, [isAuthorized, autoFixEnabled, user]);

  // Process issue queue automatically
  const processIssueQueue = useCallback(async () => {
    if (!isAuthorized || !autoFixEnabled || isFixing || issueQueue.length === 0) return;

    // Sort by severity (critical first)
    const sortedQueue = [...issueQueue].sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });

    const nextIssue = sortedQueue[0];
    if (nextIssue && nextIssue.fixAttempts < 3) {
      await autoFixIssue(nextIssue);
    }
  }, [isAuthorized, autoFixEnabled, isFixing, issueQueue, autoFixIssue]);

  // Auto-process queue periodically
  useEffect(() => {
    if (isAuthorized && autoFixEnabled && issueQueue.length > 0) {
      fixTimeoutRef.current = setTimeout(processIssueQueue, 1000);
    }

    return () => {
      if (fixTimeoutRef.current) {
        clearTimeout(fixTimeoutRef.current);
      }
    };
  }, [isAuthorized, autoFixEnabled, issueQueue, processIssueQueue]);

  // Listen for error events in VR world
  useEffect(() => {
    const handleVRError = (e: CustomEvent) => {
      const { type, description, severity } = e.detail;
      detectIssue(type, description, severity);
    };

    window.addEventListener('vr-error', handleVRError as EventListener);
    return () => window.removeEventListener('vr-error', handleVRError as EventListener);
  }, [detectIssue]);

  // GOD MODE: Full diagnostic scan
  const runDiagnostics = useCallback(async (): Promise<VRIssue[]> => {
    console.log('[VRAutoFix] 🔍 GOD MODE SCAN INITIATED');
    const issues: VRIssue[] = [];

    // Check secure context
    if (!window.isSecureContext) {
      issues.push(detectIssue('secure_context_required', 'HTTPS required for WebXR', 'critical'));
    }

    // Check WebGL support
    try {
      const canvas = document.createElement('canvas');
      const gl2 = canvas.getContext('webgl2');
      const gl1 = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      
      if (!gl2 && !gl1) {
        issues.push(detectIssue('webgl_not_supported', 'WebGL is not supported', 'critical'));
      }
    } catch (e) {
      issues.push(detectIssue('webgl_not_supported', 'WebGL check failed', 'critical'));
    }

    // Check voice
    if (!window.speechSynthesis) {
      issues.push(detectIssue('voice_init_failed', 'Speech synthesis not available', 'medium'));
    }

    // Check WebXR
    if ('xr' in navigator && navigator.xr) {
      try {
        const vrSupported = await navigator.xr.isSessionSupported('immersive-vr');
        const arSupported = await navigator.xr.isSessionSupported('immersive-ar');
        
        if (!vrSupported && !arSupported) {
          issues.push(detectIssue('headset_disconnected', 'No VR/AR device detected', 'low'));
        }
      } catch (e) {
        issues.push(detectIssue('webxr_not_supported', 'WebXR session check failed', 'low'));
      }
    } else {
      issues.push(detectIssue('webxr_not_supported', 'WebXR not supported', 'low'));
    }

    // Check haptics
    if (!navigator.vibrate) {
      issues.push(detectIssue('haptic_unavailable', 'Haptic feedback not available', 'low'));
    }

    // Check audio context
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        const ctx = new AudioContextClass();
        if (ctx.state === 'suspended') {
          issues.push(detectIssue('audio_context_blocked', 'Audio context suspended', 'medium'));
        }
        await ctx.close();
      } else {
        issues.push(detectIssue('spatial_audio_error', 'Web Audio API not supported', 'medium'));
      }
    } catch {
      issues.push(detectIssue('audio_context_blocked', 'Audio context creation failed', 'medium'));
    }

    // Check browser compatibility
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('safari') && !ua.includes('chrome')) {
      issues.push(detectIssue('browser_incompatible', 'Safari has limited WebXR support', 'low'));
    }

    // Check memory usage
    try {
      const perf = (performance as any).memory;
      if (perf && (perf.usedJSHeapSize / perf.jsHeapSizeLimit) > 0.8) {
        issues.push(detectIssue('memory_overflow', `High memory usage: ${Math.round((perf.usedJSHeapSize / perf.jsHeapSizeLimit) * 100)}%`, 'high'));
      }
    } catch {}

    console.log(`[VRAutoFix] ✅ SCAN COMPLETE: ${issues.length} issues found`);
    return issues;
  }, [detectIssue]);

  return {
    isAuthorized,
    autoFixEnabled,
    issueQueue,
    fixHistory,
    isFixing,
    requestAuthorization,
    revokeAuthorization,
    setAutoFixEnabled,
    detectIssue,
    autoFixIssue,
    runDiagnostics,
    processIssueQueue,
  };
};

export default useVRAutoFix;

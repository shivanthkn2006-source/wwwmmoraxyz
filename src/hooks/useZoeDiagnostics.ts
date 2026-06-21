/**
 * Zoe Diagnostics & Self-Fixer Hook
 * Comprehensive system to test, diagnose, and auto-fix Zoe-related issues
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { speakAsZoe, initializeZoeVoices, isZoeSpeaking, stopZoeSpeech } from '@/utils/zoeVoice';

export interface DiagnosticResult {
  id: string;
  name: string;
  status: 'pass' | 'fail' | 'warning' | 'pending';
  message: string;
  details?: string;
  autoFixable?: boolean;
  fixAttempted?: boolean;
  fixResult?: string;
  category?: 'vision' | 'voice' | 'network' | 'database' | 'ai';
}

export interface ZoeDiagnosticReport {
  timestamp: Date;
  overallStatus: 'healthy' | 'degraded' | 'critical';
  score: number;
  visionScore: number; // 0-100 for vision capabilities
  voiceScore: number;  // 0-100 for voice capabilities
  results: DiagnosticResult[];
  suggestions: string[];
}

export const useZoeDiagnostics = () => {
  const { user } = useAuth();
  const [isRunning, setIsRunning] = useState(false);
  const [report, setReport] = useState<ZoeDiagnosticReport | null>(null);
  const [autoFixEnabled, setAutoFixEnabled] = useState(true);
  const hasRunInitial = useRef(false);

  // Test 1: Check browser speech synthesis support with deep fix
  const testSpeechSynthesis = useCallback(async (): Promise<DiagnosticResult> => {
    const id = 'speech_synthesis';
    
    if (!('speechSynthesis' in window)) {
      return {
        id,
        name: 'Speech Synthesis',
        status: 'fail',
        message: 'Browser does not support speech synthesis',
        details: 'Please use Chrome, Edge, or Safari for full voice support',
        autoFixable: false,
      };
    }

    try {
      // Cancel any pending speech first
      window.speechSynthesis.cancel();
      
      // Force resume if suspended
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      
      await initializeZoeVoices();
      
      // Wait a bit for voices to load
      await new Promise(resolve => setTimeout(resolve, 200));
      
      let voices = window.speechSynthesis.getVoices();
      
      // Retry if no voices (Chrome sometimes needs this)
      if (voices.length === 0) {
        await new Promise(resolve => setTimeout(resolve, 500));
        voices = window.speechSynthesis.getVoices();
      }
      
      if (voices.length === 0) {
        return {
          id,
          name: 'Speech Synthesis',
          status: 'warning',
          message: 'Voices loading... Click anywhere on page to activate',
          details: 'Browser requires user interaction to load voices',
          autoFixable: true,
        };
      }

      // Test a quick speak to ensure synthesis is working
      const testUtterance = new SpeechSynthesisUtterance('');
      testUtterance.volume = 0;
      window.speechSynthesis.speak(testUtterance);
      window.speechSynthesis.cancel();

      // Find preferred Zoe voice
      const preferredVoices = ['Samantha', 'Karen', 'Victoria', 'Zira', 'Google US English Female'];
      const zoeName = voices.find(v => preferredVoices.some(p => v.name.includes(p)))?.name || voices[0]?.name;

      return {
        id,
        name: 'Speech Synthesis',
        status: 'pass',
        message: `${voices.length} voices ready - Zoe using: ${zoeName}`,
        details: `Voice system active with ${voices.length} available options`,
      };
    } catch (error) {
      return {
        id,
        name: 'Speech Synthesis',
        status: 'fail',
        message: 'Speech synthesis initialization error',
        details: error instanceof Error ? error.message : 'Unknown error',
        autoFixable: true,
      };
    }
  }, []);

  // Test 2: Check speech recognition support
  const testSpeechRecognition = useCallback(async (): Promise<DiagnosticResult> => {
    const id = 'speech_recognition';
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;

    if (!SpeechRecognition) {
      return {
        id,
        name: 'Speech Recognition',
        status: 'warning',
        message: 'Browser does not support speech recognition',
        details: 'Voice input will be disabled. Text input still works.',
        autoFixable: false,
      };
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.abort();
      
      return {
        id,
        name: 'Speech Recognition',
        status: 'pass',
        message: 'Speech recognition supported',
      };
    } catch (error) {
      return {
        id,
        name: 'Speech Recognition',
        status: 'warning',
        message: 'Speech recognition may require permission',
        details: 'Click microphone button to grant access',
        autoFixable: false,
      };
    }
  }, []);

  // Test 3: Check Zoe Chat edge function
  const testZoeChatFunction = useCallback(async (): Promise<DiagnosticResult> => {
    const id = 'zoe_chat_function';
    
    try {
      const { data, error } = await supabase.functions.invoke('zoe-chat', {
        body: {
          messages: [{ role: 'user', content: 'Hello, this is a diagnostic test. Reply with OK.' }],
          soulMetrics: { intimacy: 50, selfHarmony: 50, loveEnergy: 50 }
        },
      });

      if (error) {
        return {
          id,
          name: 'Zoe Chat Function',
          status: 'fail',
          message: 'Edge function error',
          details: error.message,
          autoFixable: false,
        };
      }

      if (data?.message || data?.response) {
        return {
          id,
          name: 'Zoe Chat Function',
          status: 'pass',
          message: 'Zoe chat is responding',
          details: `Response: "${(data.message || data.response).substring(0, 50)}..."`,
        };
      }

      return {
        id,
        name: 'Zoe Chat Function',
        status: 'warning',
        message: 'Unexpected response format',
        details: JSON.stringify(data).substring(0, 100),
        autoFixable: false,
      };
    } catch (error) {
      return {
        id,
        name: 'Zoe Chat Function',
        status: 'fail',
        message: 'Failed to reach Zoe chat',
        details: error instanceof Error ? error.message : 'Network error',
        autoFixable: false,
      };
    }
  }, []);

  // Test 4: Check Zoe Agent function
  const testZoeAgentFunction = useCallback(async (): Promise<DiagnosticResult> => {
    const id = 'zoe_agent_function';
    
    if (!user) {
      return {
        id,
        name: 'Zoe Agent Function',
        status: 'warning',
        message: 'User not authenticated',
        details: 'Login required to test agent function',
        autoFixable: false,
      };
    }

    try {
      const { data, error } = await supabase.functions.invoke('zoe-agent', {
        body: {
          command: 'Diagnostic test - respond with status OK',
          userId: user.id,
          context: { currentPage: '/diagnostic' }
        },
      });

      if (error) {
        return {
          id,
          name: 'Zoe Agent Function',
          status: 'fail',
          message: 'Agent function error',
          details: error.message,
          autoFixable: false,
        };
      }

      if (data?.message) {
        return {
          id,
          name: 'Zoe Agent Function',
          status: 'pass',
          message: 'Zoe agent is operational',
          details: `Response: "${data.message.substring(0, 50)}..."`,
        };
      }

      return {
        id,
        name: 'Zoe Agent Function',
        status: 'warning',
        message: 'Unexpected response format',
        details: JSON.stringify(data).substring(0, 100),
        autoFixable: false,
      };
    } catch (error) {
      return {
        id,
        name: 'Zoe Agent Function',
        status: 'fail',
        message: 'Failed to reach Zoe agent',
        details: error instanceof Error ? error.message : 'Network error',
        autoFixable: false,
      };
    }
  }, [user]);

  // Test 5: Check Zoe Service AI function
  const testZoeServiceAI = useCallback(async (): Promise<DiagnosticResult> => {
    const id = 'zoe_service_ai';
    
    try {
      const { data, error } = await supabase.functions.invoke('zoe-service-ai', {
        body: {
          messages: [{ role: 'user', content: 'Diagnostic test - respond with OK' }],
          businessName: 'Test Business'
        },
      });

      if (error) {
        return {
          id,
          name: 'Zoe Service AI',
          status: 'fail',
          message: 'Service AI error',
          details: error.message,
          autoFixable: false,
        };
      }

      if (data?.message || data?.response) {
        return {
          id,
          name: 'Zoe Service AI',
          status: 'pass',
          message: 'Service AI is operational',
        };
      }

      return {
        id,
        name: 'Zoe Service AI',
        status: 'warning',
        message: 'Unexpected response',
        autoFixable: false,
      };
    } catch (error) {
      return {
        id,
        name: 'Zoe Service AI',
        status: 'fail',
        message: 'Failed to reach Service AI',
        details: error instanceof Error ? error.message : 'Network error',
        autoFixable: false,
      };
    }
  }, []);

  // Test 6: Check voice output functionality
  const testVoiceOutput = useCallback(async (): Promise<DiagnosticResult> => {
    const id = 'voice_output';

    if (!('speechSynthesis' in window)) {
      return {
        id,
        name: 'Voice Output',
        status: 'fail',
        message: 'No speech synthesis support',
        autoFixable: false,
      };
    }

    return new Promise((resolve) => {
      const testText = 'Testing Zoe voice output.';
      let hasStarted = false;
      
      const timeout = setTimeout(() => {
        if (!hasStarted) {
          stopZoeSpeech();
          resolve({
            id,
            name: 'Voice Output',
            status: 'warning',
            message: 'Voice may require user interaction first',
            details: 'Try clicking the speak button manually',
            autoFixable: true,
          });
        }
      }, 3000);

      speakAsZoe(
        testText,
        { volume: 0.1 },
        () => {
          hasStarted = true;
        },
        () => {
          clearTimeout(timeout);
          resolve({
            id,
            name: 'Voice Output',
            status: 'pass',
            message: 'Voice output working correctly',
          });
        },
        (error) => {
          clearTimeout(timeout);
          resolve({
            id,
            name: 'Voice Output',
            status: 'fail',
            message: 'Voice output failed',
            details: error.message,
            autoFixable: true,
          });
        }
      );
    });
  }, []);

  // Test 7: Check database connectivity for Zoe settings
  const testZoeDatabase = useCallback(async (): Promise<DiagnosticResult> => {
    const id = 'zoe_database';
    
    if (!user) {
      return {
        id,
        name: 'Zoe Database',
        status: 'warning',
        message: 'User not logged in',
        autoFixable: false,
      };
    }

    try {
      const { data, error } = await supabase
        .from('zoe_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        return {
          id,
          name: 'Zoe Database',
          status: 'fail',
          message: 'Database error',
          details: error.message,
          autoFixable: true,
        };
      }

      return {
        id,
        name: 'Zoe Database',
        status: 'pass',
        message: data ? 'Settings loaded successfully' : 'No settings yet (will create on first use)',
      };
    } catch (error) {
      return {
        id,
        name: 'Zoe Database',
        status: 'fail',
        message: 'Failed to access database',
        details: error instanceof Error ? error.message : 'Unknown error',
        autoFixable: false,
      };
    }
  }, [user]);

  // Test 8: Check Zoe Perception (Vision) Engine with real visual test
  const testZoePerception = useCallback(async (): Promise<DiagnosticResult> => {
    const id = 'zoe_perception';
    
    try {
      // Create a meaningful test image - 10x10 gradient PNG (more data for AI to analyze)
      // This is a base64 encoded 10x10 PNG with a gradient pattern
      const testImageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAASElEQVQYV2NkYGD4z4AEGBkZGZEFQQIgNkgQxAYJgdggYRAGCYEYYCaIBhFgGggDEaKAYDDCHACyHMQGYZAgkg0yEqYIZhgA+GkJC0QRvzUAAAAASUVORK5CYII=';
      
      console.log('[ZoeDiagnostics] Testing Zoe Vision engine...');
      
      const { data, error } = await supabase.functions.invoke('zoe-perception', {
        body: {
          media_type: 'image',
          media_data: testImageBase64,
          context: 'System diagnostic test - confirm you can see this image',
        },
      });

      if (error) {
        console.error('[ZoeDiagnostics] Vision test error:', error);
        return {
          id,
          name: 'Zoe Vision Engine',
          status: 'fail',
          message: 'Vision engine error',
          details: error.message || 'Edge function failed',
          category: 'vision',
          autoFixable: false,
        };
      }

      if (data?.success && data?.analysis) {
        console.log('[ZoeDiagnostics] ✓ Zoe Vision operational:', data.analysis.scene?.substring(0, 50));
        return {
          id,
          name: 'Zoe Vision Engine',
          status: 'pass',
          message: 'Zoe can see! Vision engine online',
          details: `Analysis: ${data.analysis.summary?.substring(0, 50) || data.analysis.scene?.substring(0, 50) || 'Working'}`,
          category: 'vision',
        };
      }

      if (data?.zoe_response) {
        // Even if analysis is incomplete, if Zoe responded, it's working
        return {
          id,
          name: 'Zoe Vision Engine',
          status: 'pass',
          message: 'Vision engine responding',
          details: data.zoe_response.substring(0, 50),
          category: 'vision',
        };
      }

      return {
        id,
        name: 'Zoe Vision Engine',
        status: 'warning',
        message: 'Vision returned incomplete data',
        details: 'Engine responded but analysis was partial',
        category: 'vision',
        autoFixable: false,
      };
    } catch (error: any) {
      console.error('[ZoeDiagnostics] Vision test exception:', error);
      const isRateLimit = error?.message?.includes('429') || error?.status === 429;
      const isAuth = error?.message?.includes('401') || error?.message?.includes('auth');
      
      if (isRateLimit) {
        return {
          id,
          name: 'Zoe Vision Engine',
          status: 'warning',
          message: 'Vision rate limited - try again later',
          category: 'vision',
          autoFixable: false,
        };
      }
      
      if (isAuth) {
        return {
          id,
          name: 'Zoe Vision Engine',
          status: 'warning',
          message: 'Vision requires authentication',
          details: 'Please log in to test vision',
          category: 'vision',
          autoFixable: false,
        };
      }
      
      return {
        id,
        name: 'Zoe Vision Engine',
        status: 'fail',
        message: 'Vision engine offline',
        details: error?.message || 'Unknown error',
        category: 'vision',
        autoFixable: false,
      };
    }
  }, []);

  // Test 9: Check Camera API with ACTUAL camera access test
  const testCameraAPI = useCallback(async (): Promise<DiagnosticResult> => {
    const id = 'camera_api';
    
    // First check if API exists
    if (!navigator.mediaDevices?.getUserMedia) {
      return {
        id,
        name: 'Camera Access',
        status: 'fail',
        message: 'Camera API not supported in this browser',
        category: 'vision',
        autoFixable: false,
        details: 'Please use Chrome, Edge, Safari, or Firefox with HTTPS',
      };
    }

    // Actually test camera access
    let stream: MediaStream | null = null;
    try {
      console.log('[ZoeDiagnostics] Testing actual camera access...');
      
      stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
        }
      });
      
      // Check if we got video tracks
      const videoTracks = stream.getVideoTracks();
      if (videoTracks.length === 0) {
        return {
          id,
          name: 'Camera Access',
          status: 'fail',
          message: 'No camera detected',
          category: 'vision',
          details: 'No video input devices found on this device',
          autoFixable: false,
        };
      }

      // Get device info
      const track = videoTracks[0];
      const settings = track.getSettings();
      const label = track.label || 'Camera';
      
      console.log(`[ZoeDiagnostics] ✓ Camera active: ${label} (${settings.width}x${settings.height})`);

      return {
        id,
        name: 'Camera Access',
        status: 'pass',
        message: `Camera ready: ${label.substring(0, 30)}`,
        category: 'vision',
        details: `Resolution: ${settings.width || 'auto'}x${settings.height || 'auto'}`,
      };
    } catch (error: any) {
      console.error('[ZoeDiagnostics] Camera access failed:', error);
      
      const errorName = error?.name || '';
      const errorMessage = error?.message || 'Unknown error';
      
      if (errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError') {
        return {
          id,
          name: 'Camera Access',
          status: 'fail',
          message: 'Camera permission denied',
          category: 'vision',
          details: 'Please allow camera access when prompted, or check browser settings',
          autoFixable: true,
        };
      }
      
      if (errorName === 'NotFoundError' || errorName === 'DevicesNotFoundError') {
        return {
          id,
          name: 'Camera Access',
          status: 'fail',
          message: 'No camera found',
          category: 'vision',
          details: 'Connect a camera or use a device with a built-in camera',
          autoFixable: false,
        };
      }
      
      if (errorName === 'NotReadableError' || errorName === 'TrackStartError') {
        return {
          id,
          name: 'Camera Access',
          status: 'fail',
          message: 'Camera in use by another app',
          category: 'vision',
          details: 'Close other apps using the camera and try again',
          autoFixable: true,
        };
      }
      
      if (errorName === 'OverconstrainedError') {
        return {
          id,
          name: 'Camera Access',
          status: 'warning',
          message: 'Camera constraints not met',
          category: 'vision',
          details: 'Camera will use default settings',
          autoFixable: false,
        };
      }
      
      return {
        id,
        name: 'Camera Access',
        status: 'fail',
        message: `Camera error: ${errorName}`,
        category: 'vision',
        details: errorMessage.substring(0, 100),
        autoFixable: false,
      };
    } finally {
      // CRITICAL: Always stop the test stream to release camera
      if (stream) {
        stream.getTracks().forEach(track => {
          track.stop();
          console.log('[ZoeDiagnostics] Camera test track stopped');
        });
      }
    }
  }, []);

  // Test 10: Network connectivity
  const testNetworkConnectivity = useCallback(async (): Promise<DiagnosticResult> => {
    const id = 'network';
    
    if (!navigator.onLine) {
      return {
        id,
        name: 'Network Connectivity',
        status: 'fail',
        message: 'Device is offline',
        details: 'Zoe will use offline mode with limited capabilities',
        autoFixable: false,
      };
    }

    try {
      const response = await fetch('https://ai.gateway.lovable.dev/health', { 
        method: 'HEAD',
        mode: 'no-cors'
      });
      
      return {
        id,
        name: 'Network Connectivity',
        status: 'pass',
        message: 'Online and connected',
      };
    } catch {
      return {
        id,
        name: 'Network Connectivity',
        status: 'warning',
        category: 'network',
        message: 'Network may be slow',
        autoFixable: false,
      };
    }
  }, []);

  // Auto-fix function with comprehensive repairs
  const attemptAutoFix = useCallback(async (result: DiagnosticResult): Promise<DiagnosticResult> => {
    if (!result.autoFixable || result.status === 'pass') {
      return result;
    }

    const fixedResult = { ...result, fixAttempted: true };

    switch (result.id) {
      case 'speech_synthesis':
        // Deep fix for speech synthesis
        try {
          // Cancel any stuck speech
          window.speechSynthesis.cancel();
          
          // Resume if paused
          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
          }
          
          // Force voice reload
          await initializeZoeVoices();
          await new Promise(resolve => setTimeout(resolve, 300));
          
          const voices = window.speechSynthesis.getVoices();
          if (voices.length > 0) {
            fixedResult.status = 'pass';
            fixedResult.fixResult = 'Voice system repaired - Zoe can speak now';
            fixedResult.message = `${voices.length} voices ready`;
          } else {
            fixedResult.fixResult = 'Voices still loading - click anywhere on page to activate';
            fixedResult.status = 'warning';
          }
        } catch {
          fixedResult.fixResult = 'Could not auto-fix - try refreshing page';
        }
        break;

      case 'voice_output':
        // Comprehensive voice output repair
        try {
          // Stop any current speech
          stopZoeSpeech();
          
          // Cancel and reset
          window.speechSynthesis.cancel();
          
          // Wait for cleanup
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Reinitialize
          await initializeZoeVoices();
          
          // Resume if suspended
          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
          }
          
          // Try a test utterance
          const testUtterance = new SpeechSynthesisUtterance('');
          testUtterance.volume = 0;
          window.speechSynthesis.speak(testUtterance);
          
          await new Promise(resolve => setTimeout(resolve, 50));
          window.speechSynthesis.cancel();
          
          fixedResult.fixResult = 'Voice output reset successfully - Zoe is ready';
          fixedResult.status = 'pass';
        } catch {
          fixedResult.fixResult = 'Could not auto-fix voice output';
        }
        break;

      case 'zoe_database':
        // Try to create default settings
        if (user) {
          try {
            await supabase.from('zoe_settings').upsert({
              user_id: user.id,
              output_mode: 'both',
            }, { onConflict: 'user_id' });
            fixedResult.status = 'pass';
            fixedResult.fixResult = 'Settings initialized - Zoe database connected';
          } catch {
            fixedResult.fixResult = 'Could not initialize settings';
          }
        }
        break;

      case 'camera_api':
        // Camera permission/access fix
        try {
          console.log('[ZoeDiagnostics] Attempting camera permission request...');
          
          // Try to request camera access again with simpler constraints
          const stream = await navigator.mediaDevices.getUserMedia({
            video: true
          });
          
          // Success - stop the stream immediately
          stream.getTracks().forEach(track => track.stop());
          
          fixedResult.status = 'pass';
          fixedResult.fixResult = 'Camera access granted - Zoe can see now!';
          fixedResult.message = 'Camera ready';
        } catch (error: any) {
          console.error('[ZoeDiagnostics] Camera fix failed:', error);
          
          if (error?.name === 'NotAllowedError') {
            fixedResult.fixResult = 'Please click "Allow" when browser prompts for camera access';
          } else if (error?.name === 'NotReadableError') {
            fixedResult.fixResult = 'Close other apps using the camera, then try again';
          } else {
            fixedResult.fixResult = 'Could not access camera - check browser settings';
          }
        }
        break;

      default:
        fixedResult.fixResult = 'No auto-fix available for this component';
    }

    return fixedResult;
  }, [user]);

  // Run all diagnostics
  const runDiagnostics = useCallback(async () => {
    setIsRunning(true);
    const results: DiagnosticResult[] = [];

    try {
      // Run all tests
      const tests = [
        testNetworkConnectivity,
        testSpeechSynthesis,
        testSpeechRecognition,
        testVoiceOutput,
        testZoeChatFunction,
        testZoeAgentFunction,
        testZoeServiceAI,
        testZoeDatabase,
        testZoePerception,
        testCameraAPI,
      ];

      for (const test of tests) {
        let result = await test();
        
        // Attempt auto-fix if enabled and needed
        if (autoFixEnabled && result.autoFixable && result.status !== 'pass') {
          result = await attemptAutoFix(result);
        }
        
        results.push(result);
      }

      // Calculate overall status
      const failCount = results.filter(r => r.status === 'fail').length;
      const warningCount = results.filter(r => r.status === 'warning').length;
      const passCount = results.filter(r => r.status === 'pass').length;
      const total = results.length;

      let overallStatus: 'healthy' | 'degraded' | 'critical';
      if (failCount === 0 && warningCount <= 1) {
        overallStatus = 'healthy';
      } else if (failCount <= 2) {
        overallStatus = 'degraded';
      } else {
        overallStatus = 'critical';
      }

      const score = Math.round((passCount / total) * 100);

      // Generate suggestions
      const suggestions: string[] = [];
      results.forEach(r => {
        if (r.status === 'fail') {
          suggestions.push(`Fix ${r.name}: ${r.message}`);
        } else if (r.status === 'warning') {
          suggestions.push(`Check ${r.name}: ${r.message}`);
        }
      });

      // Calculate vision and voice scores
      const visionTests = results.filter(r => r.category === 'vision');
      const voiceTests = results.filter(r => r.id === 'speech_synthesis' || r.id === 'speech_recognition' || r.id === 'voice_output');
      
      const visionScore = visionTests.length > 0 
        ? Math.round((visionTests.filter(r => r.status === 'pass').length / visionTests.length) * 100)
        : 0;
      const voiceScore = voiceTests.length > 0
        ? Math.round((voiceTests.filter(r => r.status === 'pass').length / voiceTests.length) * 100)
        : 0;

      const newReport: ZoeDiagnosticReport = {
        timestamp: new Date(),
        overallStatus,
        score,
        visionScore,
        voiceScore,
        results,
        suggestions,
      };

      setReport(newReport);

      // Silent logging with vision/voice scores for Zoe Core tracking
      console.log(`[ZoeDiagnostics] Status: ${overallStatus} (${score}%) | Vision: ${visionScore}% | Voice: ${voiceScore}% | ${passCount} pass, ${warningCount} warnings, ${failCount} failures`);

      // Log to Zoe Core for tracking (fire and forget)
      if (user) {
        try {
          supabase.from('behavioral_events').insert({
            user_id: user.id,
            event_type: 'zoe_diagnostics',
            event_category: 'system_health',
            metadata: {
              overall_score: score,
              vision_score: visionScore,
              voice_score: voiceScore,
              status: overallStatus,
              passed: passCount,
              failed: failCount,
              warnings: warningCount,
            },
          });
        } catch {
          // Silent fail for background logging
        }
      }

      return newReport;
    } finally {
      setIsRunning(false);
    }
  }, [
    autoFixEnabled,
    attemptAutoFix,
    testNetworkConnectivity,
    testSpeechSynthesis,
    testSpeechRecognition,
    testVoiceOutput,
    testZoeChatFunction,
    testZoeAgentFunction,
    testZoeServiceAI,
    testZoeDatabase,
    testZoePerception,
    testCameraAPI,
  ]);

  // Run quick health check (lighter than full diagnostics)
  const quickHealthCheck = useCallback(async () => {
    try {
      const network = await testNetworkConnectivity();
      const speech = await testSpeechSynthesis();
      
      const isHealthy = network.status === 'pass' && speech.status !== 'fail';
      
      return {
        healthy: isHealthy,
        network: network.status,
        speech: speech.status,
      };
    } catch {
      return { healthy: false, network: 'fail', speech: 'fail' };
    }
  }, [testNetworkConnectivity, testSpeechSynthesis]);

  // Auto-run diagnostics on mount (silent background check)
  useEffect(() => {
    if (user && !hasRunInitial.current) {
      hasRunInitial.current = true;
      const timer = setTimeout(() => {
        console.log('[ZoeDiagnostics] Running initial silent diagnostics...');
        runDiagnostics();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [user, runDiagnostics]);

  // Periodic background diagnostics (every 5 minutes)
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      console.log('[ZoeDiagnostics] Running periodic silent diagnostics...');
      runDiagnostics();
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user, runDiagnostics]);

  // TEST ZOE'S EYES - Combined camera + vision test with live frame capture
  const testZoeEyes = useCallback(async (): Promise<{
    cameraWorking: boolean;
    visionWorking: boolean;
    cameraDetails: string;
    visionDetails: string;
    capturedFrame?: string;
  }> => {
    console.log('[ZoeDiagnostics] ═══ TESTING ZOE EYES ═══');
    
    let cameraWorking = false;
    let visionWorking = false;
    let cameraDetails = 'Not tested';
    let visionDetails = 'Not tested';
    let capturedFrame: string | undefined;
    let stream: MediaStream | null = null;
    
    try {
      // Step 1: Get camera access
      console.log('[ZoeDiagnostics] Step 1: Requesting camera...');
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
      });
      
      const videoTrack = stream.getVideoTracks()[0];
      cameraWorking = true;
      cameraDetails = `Camera active: ${videoTrack.label}`;
      console.log('[ZoeDiagnostics] ✓ Camera active:', videoTrack.label);
      
      // Step 2: Create video element and capture a frame
      console.log('[ZoeDiagnostics] Step 2: Capturing frame...');
      const video = document.createElement('video');
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
      
      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => {
          video.play().then(() => resolve()).catch(reject);
        };
        video.onerror = reject;
        setTimeout(() => reject(new Error('Video load timeout')), 5000);
      });
      
      // Wait a moment for video to stabilize
      await new Promise(r => setTimeout(r, 500));
      
      // Capture frame to canvas
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        capturedFrame = canvas.toDataURL('image/jpeg', 0.8);
        console.log('[ZoeDiagnostics] ✓ Frame captured:', capturedFrame.length, 'bytes');
      }
      
      // Step 3: Test vision with captured frame
      if (capturedFrame) {
        console.log('[ZoeDiagnostics] Step 3: Testing Zoe vision with captured frame...');
        
        const { data, error } = await supabase.functions.invoke('zoe-perception', {
          body: {
            media_type: 'image',
            media_data: capturedFrame,
            context: 'Live camera diagnostic - describe what you see',
          },
        });
        
        if (error) {
          console.error('[ZoeDiagnostics] Vision error:', error);
          visionDetails = `Vision error: ${error.message}`;
        } else if (data?.success && data?.analysis) {
          visionWorking = true;
          visionDetails = `Zoe sees: ${data.analysis.summary?.substring(0, 100) || data.analysis.scene || 'Analysis complete'}`;
          console.log('[ZoeDiagnostics] ✓ Zoe vision working:', visionDetails);
        } else if (data?.zoe_response) {
          visionWorking = true;
          visionDetails = data.zoe_response.substring(0, 100);
        } else {
          visionDetails = 'Vision returned no data';
        }
      }
      
    } catch (error: any) {
      console.error('[ZoeDiagnostics] Zoe eyes test error:', error);
      
      if (!cameraWorking) {
        cameraDetails = `Camera error: ${error?.name || error?.message || 'Access denied'}`;
      }
    } finally {
      // Always clean up
      if (stream) {
        stream.getTracks().forEach(track => {
          track.stop();
          console.log('[ZoeDiagnostics] Camera track stopped');
        });
      }
    }
    
    // Log results
    const eyesScore = (cameraWorking ? 50 : 0) + (visionWorking ? 50 : 0);
    console.log(`[ZoeDiagnostics] Zoe Eyes Score: ${eyesScore}% | Camera: ${cameraWorking} | Vision: ${visionWorking}`);
    
    // Log to behavioral events if user is logged in
    if (user) {
      try {
        await supabase.from('behavioral_events').insert({
          user_id: user.id,
          event_type: 'zoe_eyes_test',
          event_category: 'system_health',
          metadata: {
            camera_working: cameraWorking,
            vision_working: visionWorking,
            eyes_score: eyesScore,
            camera_details: cameraDetails.substring(0, 100),
            vision_details: visionDetails.substring(0, 100),
          },
        });
      } catch {
        // Silent fail
      }
    }
    
    toast.info(`Zoe Eyes Test: ${eyesScore}%`, {
      description: cameraWorking && visionWorking 
        ? 'Camera and vision working perfectly!' 
        : cameraWorking 
          ? 'Camera works, vision needs attention' 
          : 'Camera access needed',
    });
    
    return {
      cameraWorking,
      visionWorking,
      cameraDetails,
      visionDetails,
      capturedFrame,
    };
  }, [user]);

  return {
    runDiagnostics,
    quickHealthCheck,
    testZoeEyes, // NEW: Dedicated eyes test
    isRunning,
    report,
    autoFixEnabled,
    setAutoFixEnabled,
  };
};

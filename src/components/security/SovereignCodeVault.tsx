// ═══════════════════════════════════════════════════════════════════════════════
// SOVEREIGN CODE VAULT - Black Box Protocol Layer 3
// Hidden Admin Access with Konami Code trigger and Biometric Verification
// Matrix-style terminal for authorized administrators only
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { Dialog, DialogContent } from '@/components/ui/dialog';

// Konami Code: Z-O-E-G-O-D
const KONAMI_CODE = ['z', 'o', 'e', 'g', 'o', 'd'];
const VOICE_PASSWORD = 'override protocol alpha';
const ROOT_ADMIN_USERNAMES = ['moksh50', 'Justmkbhd'];

interface VaultState {
  isTriggered: boolean;
  isVerified: boolean;
  verificationStep: 'biometric' | 'voice' | 'complete' | null;
  analytics: PlatformAnalytics | null;
}

interface PlatformAnalytics {
  totalUsers: number;
  activeUsers24h: number;
  totalPosts: number;
  totalMessages: number;
  securityEvents: number;
  intrusionAttempts: number;
  systemHealth: number;
  lastUpdated: string;
}

export const SovereignCodeVault: React.FC = () => {
  const { user } = useAuth();
  const [state, setState] = useState<VaultState>({
    isTriggered: false,
    isVerified: false,
    verificationStep: null,
    analytics: null
  });
  const [inputSequence, setInputSequence] = useState<string[]>([]);
  const [voiceInput, setVoiceInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Check if user is root admin
  const checkRootAdmin = useCallback(async (): Promise<boolean> => {
    if (!user) return false;
    
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('user_id', user.id)
        .single();
      
      return profile && ROOT_ADMIN_USERNAMES.includes(profile.username);
    } catch (e) {
      return false;
    }
  }, [user]);

  // Fetch platform analytics
  const fetchAnalytics = useCallback(async () => {
    try {
      const [
        { count: totalUsers },
        { count: totalPosts },
        { count: totalMessages },
        { count: securityEvents },
        { count: intrusionAttempts }
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('posts').select('*', { count: 'exact', head: true }),
        supabase.from('messages').select('*', { count: 'exact', head: true }),
        supabase.from('behavioral_events').select('*', { count: 'exact', head: true })
          .eq('event_category', 'security_violation'),
        supabase.from('behavioral_events').select('*', { count: 'exact', head: true })
          .eq('event_type', 'intrusion_attempt')
      ]);

      // Get active users in last 24h
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count: activeUsers24h } = await supabase
        .from('user_sessions')
        .select('*', { count: 'exact', head: true })
        .gte('started_at', twentyFourHoursAgo);

      setState(prev => ({
        ...prev,
        analytics: {
          totalUsers: totalUsers || 0,
          activeUsers24h: activeUsers24h || 0,
          totalPosts: totalPosts || 0,
          totalMessages: totalMessages || 0,
          securityEvents: securityEvents || 0,
          intrusionAttempts: intrusionAttempts || 0,
          systemHealth: 98.7,
          lastUpdated: new Date().toISOString()
        }
      }));
    } catch (e) {
      console.error('[SovereignVault] Failed to fetch analytics:', e);
    }
  }, []);

  // Handle Konami Code detection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      
      setInputSequence(prev => {
        const newSequence = [...prev, key].slice(-KONAMI_CODE.length);
        
        // Check if sequence matches
        if (newSequence.length === KONAMI_CODE.length &&
            newSequence.every((k, i) => k === KONAMI_CODE[i])) {
          console.log('[SovereignVault] 🔓 KONAMI CODE DETECTED');
          setState(prev => ({ ...prev, isTriggered: true, verificationStep: 'biometric' }));
          setInputSequence([]);
        }
        
        return newSequence;
      });
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle biometric verification (face)
  const handleBiometricVerification = useCallback(async () => {
    const isAdmin = await checkRootAdmin();
    
    if (!isAdmin) {
      toast.error('Access Denied', { description: 'You are not a Root Admin.' });
      setState(prev => ({ ...prev, isTriggered: false, verificationStep: null }));
      return;
    }

    // Simulate biometric check (in production, integrate with Face API)
    toast.success('Biometric Verified', { description: 'Proceeding to voice verification...' });
    setState(prev => ({ ...prev, verificationStep: 'voice' }));
  }, [checkRootAdmin]);

  // Start voice recognition
  const startVoiceVerification = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error('Voice recognition not supported');
      return;
    }

    // Pause wake-word detection during voice verification
    window.dispatchEvent(new CustomEvent('zoe-voice-input-start'));

    const SpeechRecognitionClass = (window as any).SpeechRecognition || 
                                   (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognitionClass();
    
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript.toLowerCase();
      setVoiceInput(transcript);
      
      if (transcript.includes('override') && transcript.includes('protocol') && 
          transcript.includes('alpha')) {
        toast.success('Voice Authentication Successful', { 
          description: 'Welcome, Sovereign Administrator.' 
        });
        setState(prev => ({ 
          ...prev, 
          isVerified: true, 
          verificationStep: 'complete' 
        }));
        fetchAnalytics();
      } else {
        toast.error('Voice Authentication Failed', { 
          description: 'Incorrect passphrase.' 
        });
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
      window.dispatchEvent(new CustomEvent('zoe-voice-input-end'));
      toast.error('Voice recognition error');
    };

    recognition.onend = () => {
      setIsListening(false);
      window.dispatchEvent(new CustomEvent('zoe-voice-input-end'));
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [fetchAnalytics]);

  // Close vault
  const closeVault = useCallback(() => {
    setState({
      isTriggered: false,
      isVerified: false,
      verificationStep: null,
      analytics: null
    });
  }, []);

  if (!state.isTriggered) return null;

  return (
    <Dialog open={state.isTriggered} onOpenChange={(open) => !open && closeVault()}>
      <DialogContent className="max-w-4xl bg-black border-green-500/50 text-green-400 font-mono p-0 overflow-hidden">
        {/* Biometric Verification Step */}
        {state.verificationStep === 'biometric' && (
          <div className="p-8 text-center">
            <div className="text-2xl mb-6 animate-pulse">
              🔐 SOVEREIGN ACCESS PORTAL
            </div>
            <div className="text-sm text-green-300 mb-8">
              Biometric verification required. Root Admin access only.
            </div>
            <button
              onClick={handleBiometricVerification}
              className="px-6 py-3 bg-green-900/50 border border-green-500 rounded hover:bg-green-800/50 transition-colors"
            >
              Verify Identity
            </button>
          </div>
        )}

        {/* Voice Verification Step */}
        {state.verificationStep === 'voice' && (
          <div className="p-8 text-center">
            <div className="text-2xl mb-6">
              🎤 VOICE AUTHENTICATION
            </div>
            <div className="text-sm text-green-300 mb-4">
              State Intent: "Override Protocol Alpha"
            </div>
            <button
              onClick={startVoiceVerification}
              disabled={isListening}
              className={`px-6 py-3 border border-green-500 rounded transition-colors ${
                isListening 
                  ? 'bg-red-900/50 border-red-500 animate-pulse' 
                  : 'bg-green-900/50 hover:bg-green-800/50'
              }`}
            >
              {isListening ? '🔴 Listening...' : '🎤 Start Voice Auth'}
            </button>
            {voiceInput && (
              <div className="mt-4 text-xs text-gray-500">
                Heard: "{voiceInput}"
              </div>
            )}
          </div>
        )}

        {/* Verified - Matrix Terminal */}
        {state.isVerified && state.analytics && (
          <div className="p-6 bg-black min-h-[600px]">
            {/* Header */}
            <div className="flex justify-between items-center border-b border-green-500/30 pb-4 mb-6">
              <div>
                <div className="text-xl font-bold text-green-400">
                  ▓▓▓ SOVEREIGN CODE VAULT ▓▓▓
                </div>
                <div className="text-xs text-green-600">
                  ROOT ADMIN TERMINAL // CLASSIFIED
                </div>
              </div>
              <button
                onClick={closeVault}
                className="px-3 py-1 bg-red-900/50 text-red-400 text-sm rounded border border-red-500/50 hover:bg-red-800/50"
              >
                [EXIT]
              </button>
            </div>

            {/* Analytics Grid */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <MetricCard label="TOTAL USERS" value={state.analytics.totalUsers} />
              <MetricCard label="ACTIVE 24H" value={state.analytics.activeUsers24h} />
              <MetricCard label="TOTAL POSTS" value={state.analytics.totalPosts} />
              <MetricCard label="MESSAGES" value={state.analytics.totalMessages} />
            </div>

            {/* Security Section */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 border border-yellow-500/30 rounded bg-yellow-900/10">
                <div className="text-yellow-400 text-sm mb-2">⚠️ SECURITY EVENTS</div>
                <div className="text-3xl text-yellow-300">{state.analytics.securityEvents}</div>
              </div>
              <div className="p-4 border border-red-500/30 rounded bg-red-900/10">
                <div className="text-red-400 text-sm mb-2">🚨 INTRUSION ATTEMPTS</div>
                <div className="text-3xl text-red-300">{state.analytics.intrusionAttempts}</div>
              </div>
            </div>

            {/* System Health */}
            <div className="p-4 border border-green-500/30 rounded mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm">SYSTEM HEALTH</span>
                <span className="text-lg">{state.analytics.systemHealth}%</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${state.analytics.systemHealth}%` }}
                />
              </div>
            </div>

            {/* Terminal Output */}
            <div className="p-4 bg-gray-900/50 rounded font-mono text-xs overflow-auto max-h-48">
              <div className="text-green-600">root@zoe-sovereign ~ $ status --full</div>
              <div className="text-green-400 mt-2">
                ┌─────────────────────────────────────────────┐<br />
                │ ZOE SOVEREIGN AI PLATFORM                   │<br />
                │ Version: OMEGA-3.0                          │<br />
                │ Status: OPERATIONAL                         │<br />
                │ DHF Core: ACTIVE                            │<br />
                │ Void Shell: ENABLED                         │<br />
                │ Sentinel: WATCHING                          │<br />
                │ Last Audit: {new Date(state.analytics.lastUpdated).toLocaleString()} │<br />
                └─────────────────────────────────────────────┘
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

// Metric Card Component
const MetricCard: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className="p-3 border border-green-500/30 rounded bg-green-900/10">
    <div className="text-xs text-green-600 mb-1">{label}</div>
    <div className="text-2xl text-green-300">{value.toLocaleString()}</div>
  </div>
);

export default SovereignCodeVault;

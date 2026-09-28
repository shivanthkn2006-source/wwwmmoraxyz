// ═══════════════════════════════════════════════════════════════════════════════
// ALWAYS-ON VOICE - True hands-free conversation with Zoe
// No mic buttons, no clicks - just speak and Zoe listens/responds naturally
// Like real human conversation - one-to-one, no strings attached
// Uses centralized mic permission manager for reliability
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useRef, useCallback, useEffect } from 'react';

import { askZoe } from '@/services/zoeEngine';
import { useAuth } from '@/lib/auth';
import { speakAsZoe, stopZoeSpeech, pauseZoeSpeech, resumeZoeSpeech, initializeZoeVoices, isZoeSpeaking } from '@/utils/zoeVoice';
import { 
  requestMicPermission, 
  isSpeechRecognitionSupported, 
  createSpeechRecognition,
  stopSpeechRecognition,
  claimSpeechRecognition,
  releaseSpeechRecognition,
} from '@/utils/micPermissionManager';
import { zoeDebugLog, zoeDebugSetState } from '@/features/zoe-handsfree/debugBus';
import { resolveVoiceIntent } from '@/features/zoe-handsfree/voiceIntentRouter';
import { recordVoiceTurn } from '@/services/zoeVoiceHistory';
import { sendVoiceMessage } from '@/services/zoeVoiceMessaging';
import { gateTranscript, setZoeMuted } from '@/features/zoe-handsfree/muteGate';

interface VoiceState {
  isListening: boolean;
  isSpeaking: boolean;
  isProcessing: boolean;
  transcript: string;
  error: string | null;
}

export const useAlwaysOnVoice = () => {
  const { user } = useAuth();
  const [state, setState] = useState<VoiceState>({
    isListening: false,
    isSpeaking: false,
    isProcessing: false,
    transcript: '',
    error: null,
  });
  
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isEnabledRef = useRef(true);
  const processingRef = useRef(false);
  const lastTranscriptRef = useRef('');
  const restartCountRef = useRef(0);
  const lastActivityRef = useRef(Date.now());
  const processingStartedRef = useRef(0);
  // Recipient awaiting the wording of a spoken message.
  const pendingRecipientRef = useRef<string | null>(null);

  // Initialize voices on mount
  useEffect(() => {
    initializeZoeVoices();
  }, []);

  // Clear silence timer
  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  // Get Zoe's response
  const getZoeResponse = useCallback(async (userText: string) => {
    if (!userText.trim()) return;

    // MUTE GATE — while muted, nothing reaches recall, the backend or Deepgram.
    // The only phrase that gets through is "Zoe wake".
    const decision = gateTranscript(userText);
    if (decision === 'ask-unmute' || decision === 'keep-muted') {
      const line = decision === 'ask-unmute'
        ? 'You told me to mute. Should I unmute?'
        : 'Okay. I’ll stay muted.';
      window.dispatchEvent(new CustomEvent('zoe-handsfree-reply', { detail: { text: line } }));
      await new Promise<void>((resolve) => {
        speakAsZoe(line, undefined, undefined, () => resolve(), () => resolve());
      });
      return;
    }
    if (decision === 'muted-drop') {
      zoeDebugLog('voice', `muted — dropped: ${userText.slice(0, 60)}`);
      return;
    }
    if (decision === 'mute') {
      setZoeMuted(true);
      stopZoeSpeech();
      zoeDebugLog('voice', 'muted by voice command');
      window.dispatchEvent(new CustomEvent('zoe-handsfree-reply', { detail: { text: 'Muted. Say "Zoe wake" when you want me back.' } }));
      return;
    }
    if (decision === 'unmute') {
      setZoeMuted(false);
      const line = "I'm back. What do you need?";
      window.dispatchEvent(new CustomEvent('zoe-handsfree-reply', { detail: { text: line } }));
      await recordVoiceTurn('assistant', line, user?.id);
      setState((prev) => ({ ...prev, isSpeaking: true }));
      await new Promise<void>((resolve) => {
        speakAsZoe(line, undefined, undefined, () => resolve(), () => resolve());
      });
      setState((prev) => ({ ...prev, isSpeaking: false }));
      if (isEnabledRef.current) setTimeout(() => startListening(), 500);
      return;
    }
    // A turn that never finished (network stall, killed speech) used to jam
    // every later question in silence. Anything older than 15s is stale.
    if (processingRef.current) {
      if (Date.now() - processingStartedRef.current < 15000) return;
      console.warn('[AlwaysOn] Clearing a stuck turn and answering the new one');
    }

    processingRef.current = true;
    processingStartedRef.current = Date.now();
    isEnabledRef.current = true;
    setState(prev => ({ ...prev, isProcessing: true, transcript: '' }));
    
    console.log('[AlwaysOn] User said:', userText);
    zoeDebugLog('voice', `recognized: ${userText}`);
    zoeDebugSetState({ hfState: 'processing' });
    window.dispatchEvent(new CustomEvent('zoe-handsfree-transcript', { detail: { text: userText } }));
    
    // Spoken turns land in the same history the orb chat shows.
    await recordVoiceTurn('user', userText, user?.id);

    // A pending "what should I say to X?" turn: this utterance IS the message.
    const pending = pendingRecipientRef.current;
    if (pending) {
      pendingRecipientRef.current = null;
      const cancelled = /^(cancel|never mind|nevermind|stop|forget it)\b/i.test(userText.trim());
      const line = cancelled
        ? 'Cancelled — nothing was sent.'
        : (await sendVoiceMessage(pending, userText, user?.id)).speak;
      window.dispatchEvent(new CustomEvent('zoe-handsfree-reply', { detail: { text: line } }));
      await recordVoiceTurn('assistant', line, user?.id);
      setState((prev) => ({ ...prev, isProcessing: false, isSpeaking: true }));
      await new Promise<void>((resolve) => {
        speakAsZoe(line, undefined, undefined, () => resolve(), () => resolve());
      });
      setState((prev) => ({ ...prev, isSpeaking: false }));
      processingRef.current = false;
      if (isEnabledRef.current) setTimeout(() => startListening(), 600);
      return;
    }

    // Deterministic platform actions ("Zoe, open chat", "Zoe, notifications",
    // "Zoe, send a message to Asha"). Anything else falls through to askZoe so
    // the answer stays natural and live-grounded instead of scripted.
    const intent = resolveVoiceIntent(userText);
    if (intent) {
      let spoken = intent.speak;
      if (intent.kind === 'navigate') {
        window.dispatchEvent(new CustomEvent('zoe-navigate', { detail: { path: intent.path } }));
      } else if (intent.kind === 'notifications') {
        window.dispatchEvent(new CustomEvent('zoe-open-notifications'));
      } else if (intent.kind === 'orb-chat') {
        // Explicit "open orb / open chat" — only then does the panel open.
        window.dispatchEvent(new CustomEvent('zoe-open-orb-chat'));
      } else if (intent.kind === 'device-scan') {
        const { scanAndSaveDevice, spokenDeviceSummary } = await import('@/services/zoeDeviceScan');
        const r = await scanAndSaveDevice('voice');
        spoken = spokenDeviceSummary(r.scan, r.ok);
      } else if (intent.kind === 'god-scan') {
        window.dispatchEvent(new CustomEvent('zoe-navigate', { detail: { path: '/admin' } }));
        // The dashboard mounts, then runs the scan. Non-admins see "Staff only".
        setTimeout(() => window.dispatchEvent(new CustomEvent('zoe-run-god-scan')), 1200);
      } else if (intent.kind === 'search') {
        // Home shows the search console with the spoken query already typed in,
        // so the member watches the same results Zoe is reading.
        window.dispatchEvent(new CustomEvent('zoe-navigate', { detail: { path: '/home' } }));
        // Home is loaded on demand, so the request is parked where the search
        // bar can pick it up whenever it finishes mounting, and also announced
        // a few times in case Home is already on screen.
        try {
          window.sessionStorage.setItem(
            'mmora:pending-home-search',
            JSON.stringify({ query: intent.query, speak: true, at: Date.now() }),
          );
        } catch {
          /* storage unavailable — the repeated announcements below still apply */
        }
        for (const delay of [400, 900, 1600, 2600]) {
          setTimeout(() => {
            window.dispatchEvent(
              new CustomEvent('mmora:open-home-search', { detail: { query: intent.query, speak: true } }),
            );
          }, delay);
        }
      } else if (intent.kind === 'resume') {
        const { triggerHeadlessResume } = await import('@/utils/headlessResumeBuilder');
        const { buildResumeDataForUser } = await import('@/services/zoeResumeData');
        const resumeData = await buildResumeDataForUser(user?.id);
        const result = await triggerHeadlessResume(resumeData);
        spoken = result.success
          ? `Done — ${result.fileName} just downloaded. No pop-ups, no waiting.`
          : `I couldn't build the resume: ${result.message}`;
      } else if (intent.kind === 'asset-3d') {
        const { requestAssetJob, spokenAssetAcknowledgement } = await import('@/services/zoeAssetJobs');
        const outcome = await requestAssetJob(intent.prompt, '3d');
        spoken = outcome.ok
          ? spokenAssetAcknowledgement(outcome.job)
          : `I couldn't start that 3D job: ${outcome.error}`;
      } else if (intent.kind === 'message') {
        if (intent.body) {
          // Real delivery — the message lands in the recipient's inbox.
          const result = await sendVoiceMessage(intent.recipient, intent.body, user?.id);
          spoken = result.speak;
          if (result.sent) {
            window.dispatchEvent(
              new CustomEvent('zoe-message-sent', {
                detail: { recipient: result.recipient?.user_id, text: intent.body },
              }),
            );
          }
        } else {
          // No wording yet: ask once, then the next thing said is the message.
          pendingRecipientRef.current = intent.recipient;
        }
      } else if (intent.kind === 'music') {
        const { musicEngine } = await import('@/services/MusicEngine');
        const action = intent.action;
        if (action.kind === 'open') {
          window.dispatchEvent(new CustomEvent('zoe-navigate', { detail: { path: '/music' } }));
        } else if (action.kind === 'pause') musicEngine.pause();
        else if (action.kind === 'stop') musicEngine.stop();
        else if (action.kind === 'resume') await musicEngine.play();
        else if (action.kind === 'next') await musicEngine.next();
        else if (action.kind === 'previous') await musicEngine.previous();
        else if (action.kind === 'personal') {
          const { resolvePersonalMusicQueue } = await import('@/features/music/musicConnect');
          const tracks = await resolvePersonalMusicQueue(action.scope);
          if (!tracks.length) spoken = 'I need a little listening history or saved music before I can choose that personally.';
          else {
            const played = await musicEngine.playQueue(tracks);
            const track = musicEngine.getState().track;
            spoken = played && track ? `Playing ${track.title} by ${track.artist}, chosen from what you already love.` : musicEngine.getState().error ?? 'I found your music, but this device needs one tap on Play.';
          }
        }
        else {
          const { resolveMusicQueue } = await import('@/features/music/musicProviders');
          const result = await resolveMusicQueue(action.query || 'music for my mood', action.lookup);
          if (!result.tracks.length) spoken = 'I could not find a playable match from the connected music sources.';
          else {
            const played = await musicEngine.playQueue(result.tracks);
            spoken = played
              ? `Playing ${result.tracks[0].title} by ${result.tracks[0].artist}, from ${result.source}.`
              : musicEngine.getState().error ?? 'I found it, but this device needs you to tap play once.';
          }
        }
      }
      window.dispatchEvent(new CustomEvent('zoe-handsfree-reply', { detail: { text: spoken } }));
      await recordVoiceTurn('assistant', spoken, user?.id);
      setState((prev) => ({ ...prev, isProcessing: false, isSpeaking: true }));
      await new Promise<void>((resolve) => {
        speakAsZoe(spoken, undefined, undefined, () => resolve(), () => resolve());
      });
      setState((prev) => ({ ...prev, isSpeaking: false }));
      processingRef.current = false;
      if (isEnabledRef.current) setTimeout(() => startListening(), 600);
      return;
    }

    try {
      // Get user's local timezone and time
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const now = new Date();
      const localTime = now.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: true 
      });

      const answer = await askZoe({
        text: userText,
        sessionKey: `always-on-${user?.id ?? 'anon'}`,
        userId: user?.id,
        // The authenticated backend already performs DHF, life-profile and
        // timeline recall in parallel. Repeating gateway recall here delayed
        // every spoken answer and could make a healthy Zoe feel unresponsive.
        skipRecall: true,
        body: { enableASI: true, soulMetrics: { intimacy: 70, selfHarmony: 75, loveEnergy: 70 } },
      });

      const responseText = answer.text || "I'm here.";
      console.log('[AlwaysOn] Zoe says:', responseText);
      zoeDebugLog('voice', `reply: ${responseText.slice(0, 180)}`);
      window.dispatchEvent(new CustomEvent('zoe-handsfree-reply', { detail: { text: responseText } }));
      
      await recordVoiceTurn('assistant', responseText, user?.id);

      // Speak the response with proper state tracking
      setState(prev => ({ ...prev, isSpeaking: true, isProcessing: false }));
      zoeDebugSetState({ hfState: 'speaking' });
      
      await new Promise<void>((resolve) => {
        // Timeout safety - max 60 seconds for speech
        const safetyTimeout = setTimeout(() => {
          console.warn('[AlwaysOn] Speech timeout - forcing completion');
          stopZoeSpeech();
          resolve();
        }, 60000);
        
        speakAsZoe(
          responseText,
          undefined,
          () => setState(prev => ({ ...prev, isSpeaking: true })),
          () => {
            clearTimeout(safetyTimeout);
            setState(prev => ({ ...prev, isSpeaking: false }));
            resolve();
          },
          () => {
            clearTimeout(safetyTimeout);
            setState(prev => ({ ...prev, isSpeaking: false }));
            resolve();
          }
        );
      });

    } catch (err) {
      console.error('[AlwaysOn] Error:', err);
      setState(prev => ({ ...prev, error: 'Connection issue', isSpeaking: false }));
      stopZoeSpeech();
      zoeDebugSetState({ hfState: 'error', lastError: err instanceof Error ? err.message : String(err) });
      // Never leave the user talking to silence — say what went wrong.
      const apology = "I couldn't reach my brain just then. Say that again in a moment.";
      window.dispatchEvent(new CustomEvent('zoe-handsfree-reply', { detail: { text: apology } }));
      await recordVoiceTurn('assistant', apology, user?.id);
      await new Promise<void>((resolve) => {
        speakAsZoe(apology, undefined, undefined, () => resolve(), () => resolve());
      });
    } finally {
      processingRef.current = false;
      setState(prev => ({ ...prev, isProcessing: false, isSpeaking: false }));
      
      // Resume listening after speaking with slight delay
      if (isEnabledRef.current) {
        // Wait a bit longer to ensure TTS is fully stopped
        setTimeout(() => {
          if (isEnabledRef.current && !isZoeSpeaking()) {
            zoeDebugSetState({ hfState: 'listening' });
            startListening();
          }
        }, 800);
      }
    }
  }, [user]);

  // Start listening with auto-restart on browser timeout
  const startListening = useCallback(() => {
    if (!isEnabledRef.current) return;
    if (isZoeSpeaking()) {
      // Zoe is mid-sentence (e.g. the wake greeting). Waiting instead of
      // silently giving up is what makes the follow-up question get heard.
      setTimeout(() => startListening(), 400);
      return;
    }
    
    if (!isSpeechRecognitionSupported()) {
      console.warn('[AlwaysOn] Speech recognition not supported');
      return;
    }

    // Stop existing recognition
    stopSpeechRecognition(recognitionRef.current);
    recognitionRef.current = null;

    const recognition = createSpeechRecognition({
      continuous: true,
      interimResults: true,
      lang: 'en-US',
      // This hook owns restart timing. Letting the shared manager restart the
      // same object too created overlapping sessions on Chrome and Safari.
      keepAlive: false
    });
    
    if (!recognition) return;

    recognition.onstart = () => {
      console.log('[AlwaysOn] Listening...');
      lastTranscriptRef.current = '';
      lastActivityRef.current = Date.now();
      restartCountRef.current = 0; // Reset restart count on successful start
      setState(prev => ({ ...prev, isListening: true, error: null }));
    };

    recognition.onresult = (event: any) => {
      lastActivityRef.current = Date.now(); // Update activity timestamp
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      const transcript = (finalTranscript || interimTranscript).trim();
      if (transcript) {
        const control = transcript.toLowerCase().replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim();
        if (/^(?:zoe\s+)?(?:stop|be quiet|quiet|cancel)$/.test(control)) {
          stopZoeSpeech();
          zoeDebugSetState({ hfState: 'listening' });
          return;
        }
        if (/^(?:zoe\s+)?pause$/.test(control)) {
          pauseZoeSpeech();
          zoeDebugSetState({ hfState: 'paused' });
          return;
        }
        if (/^(?:zoe\s+)?(?:continue|resume)$/.test(control)) {
          resumeZoeSpeech();
          zoeDebugSetState({ hfState: 'speaking' });
          return;
        }
        if (isZoeSpeaking()) stopZoeSpeech();
        lastTranscriptRef.current = transcript;
        setState(prev => ({ ...prev, transcript }));
        
        // A short end-of-turn window keeps natural pauses while meeting the
        // 1–3 second spoken-response target after a wake phrase.
        clearSilenceTimer();
        silenceTimerRef.current = setTimeout(() => {
          if (lastTranscriptRef.current.trim() && isEnabledRef.current) {
            const text = lastTranscriptRef.current.trim();
            try { recognition.stop(); } catch(e) {}
            getZoeResponse(text);
          }
        }, finalTranscript ? 180 : 450);
      }
    };

    recognition.onerror = (event: any) => {
      if (recognitionRef.current !== recognition) return;
      // Ignore common non-critical errors
      if (['no-speech', 'aborted'].includes(event.error)) {
        console.log('[AlwaysOn] Expected event:', event.error);
        return;
      }
      console.error('[AlwaysOn] Error:', event.error);
    };

    recognition.onend = () => {
      releaseSpeechRecognition('voice-input', recognition);
      if (recognitionRef.current !== recognition) return;
      recognitionRef.current = null;
      setState(prev => ({ ...prev, isListening: false }));
      
      // Auto-restart if enabled and not processing - IMMEDIATE restart
      if (isEnabledRef.current && !processingRef.current && !isZoeSpeaking()) {
        restartCountRef.current++;
        
        // Reset count every 30 seconds
        const now = Date.now();
        if (now - lastActivityRef.current > 30000) {
          restartCountRef.current = 0;
        }
        
        // Prevent infinite restart loops
        if (restartCountRef.current > 200) {
          console.warn('[AlwaysOn] Too many restarts, pausing for 3 seconds');
          restartCountRef.current = 0;
          setTimeout(() => startListening(), 3000);
          return;
        }
        
        // WebKit needs time to release its speech service before a new start.
        // A zero/50ms loop is treated as contention and becomes
        // service-not-allowed on Safari and iOS Chrome.
        const restartDelay = 350;
        console.log(`[AlwaysOn] Auto-restarting in ${restartDelay}ms (restart #${restartCountRef.current})`);
        setTimeout(() => startListening(), restartDelay);
      }
    };

    try {
      claimSpeechRecognition('voice-input', recognition);
      recognitionRef.current = recognition;
      recognition.start();
      console.log('[AlwaysOn] Recognition started');
    } catch (err) {
      releaseSpeechRecognition('voice-input', recognition);
      if (recognitionRef.current === recognition) recognitionRef.current = null;
      console.error('[AlwaysOn] Start error:', err);
      // Try again after a brief delay
      setTimeout(() => startListening(), 500);
    }
  }, [clearSilenceTimer, getZoeResponse]);

  // Enable always-on voice
  const enable = useCallback(async () => {
    // Pause wake word detection globally while hands-free mode is active
    window.dispatchEvent(new CustomEvent('zoe-handsfree-start'));

    // Request mic permission using centralized manager
    const hasPermission = await requestMicPermission();
    if (!hasPermission) {
      console.error('[AlwaysOn] Mic permission denied');
      window.dispatchEvent(new CustomEvent('zoe-handsfree-end'));
      return;
    }

    isEnabledRef.current = true;
    console.log('[AlwaysOn] Enabled - now listening');
    startListening();
  }, [startListening]);

  // Disable always-on voice
  const disable = useCallback(() => {
    isEnabledRef.current = false;
    clearSilenceTimer();
    restartCountRef.current = 0;

    if (recognitionRef.current) {
      releaseSpeechRecognition('voice-input', recognitionRef.current);
      try { recognitionRef.current.stop(); } catch(e) {}
      recognitionRef.current = null;
    }

    stopZoeSpeech();

    setState({
      isListening: false,
      isSpeaking: false,
      isProcessing: false,
      transcript: '',
      error: null,
    });

    // Resume wake word detection
    window.dispatchEvent(new CustomEvent('zoe-handsfree-end'));

    console.log('[AlwaysOn] Disabled');
  }, [clearSilenceTimer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isEnabledRef.current = false;
      clearSilenceTimer();
      if (recognitionRef.current) {
        releaseSpeechRecognition('voice-input', recognitionRef.current);
        try { recognitionRef.current.stop(); } catch(e) {}
      }
    };
  }, [clearSilenceTimer]);

  return {
    ...state,
    isEnabled: isEnabledRef.current,
    enable,
    disable,
    processUtterance: getZoeResponse,
  };
};

export default useAlwaysOnVoice;

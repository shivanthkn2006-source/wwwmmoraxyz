import React from 'react';
import { AppErrorBoundary } from '@/components/core/ErrorBoundary';
import GlobalBugReporter from '@/components/core/GlobalBugReporter';
import SentinelWatchHost from '@/components/security/SentinelWatchHost';
import GrowthCardAlertHost from '@/components/growth/GrowthCardAlertHost';
import NotificationAlertHost from '@/components/notifications/NotificationAlertHost';
import ZoeSpeechPauseBar from '@/components/voice/ZoeSpeechPauseBar';
import GuidedTour from '@/components/onboarding/GuidedTour';
import ZoeGlobalMount from '@/components/zoe/ZoeGlobalMount';
import GlobalAudioQuickConnect from '@/components/audio/GlobalAudioQuickConnect';
import ZoeVoiceIntentHost from '@/components/zoe/ZoeVoiceIntentHost';
import ZoeGreetingFilm from '@/components/zoe/ZoeGreetingFilm';
import ZoeAgentProvider from '@/contexts/ZoeAgentProvider';
import ZoeAgentHost from '@/components/zoe/ZoeAgentHost';
import GlobalMusicToggle from '@/components/music/GlobalMusicToggle';
import { CallEngineProvider } from '@/contexts/CallEngineContext';
import OneTimePermissionsPrompt from '@/components/platform/OneTimePermissionsPrompt';
import GlobalIncomingCallHost from '@/components/quantum/GlobalIncomingCallHost';

export default function DeferredPlatformServices({ children }: { children: React.ReactNode }) {
  return (
    <ZoeAgentProvider>
      <CallEngineProvider>
        {children}
        <AppErrorBoundary moduleName="growth:alerts" severity="low" fallback={null}><GrowthCardAlertHost /></AppErrorBoundary>
        <AppErrorBoundary moduleName="platform:notification-alerts" severity="low" fallback={null}><NotificationAlertHost /></AppErrorBoundary>
        <AppErrorBoundary moduleName="platform:zoe-speech-bar" severity="low" fallback={null}><ZoeSpeechPauseBar /></AppErrorBoundary>
        <AppErrorBoundary moduleName="platform:guided-tour" severity="low" fallback={null}><GuidedTour /></AppErrorBoundary>
        <AppErrorBoundary moduleName="platform:bug-reporter" severity="low" fallback={null}><GlobalBugReporter /><SentinelWatchHost /></AppErrorBoundary>
        <AppErrorBoundary moduleName="platform:audio-router" severity="low" fallback={null}><GlobalAudioQuickConnect /></AppErrorBoundary>
        <AppErrorBoundary moduleName="platform:music" severity="low" fallback={null}><GlobalMusicToggle /></AppErrorBoundary>
        <AppErrorBoundary moduleName="platform:zoe-voice-intents" severity="low" fallback={null}><ZoeVoiceIntentHost /></AppErrorBoundary>
        <AppErrorBoundary moduleName="platform:zoe-orb" severity="low" fallback={null}><ZoeGlobalMount /></AppErrorBoundary>
        <AppErrorBoundary moduleName="platform:zoe-greeting-film" severity="low" fallback={null}><ZoeGreetingFilm /></AppErrorBoundary>
        <AppErrorBoundary moduleName="platform:zoe-agent" severity="low" fallback={null}><ZoeAgentHost /></AppErrorBoundary>
        <AppErrorBoundary moduleName="platform:permissions" severity="low" fallback={null}><OneTimePermissionsPrompt /></AppErrorBoundary>
        <AppErrorBoundary moduleName="platform:incoming-call" severity="high" fallback={null}><GlobalIncomingCallHost /></AppErrorBoundary>
      </CallEngineProvider>
    </ZoeAgentProvider>
  );
}
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/auth";
import { CorticalStackProvider } from "@/contexts/CorticalStackContext";
import { GlobalMediaProvider } from "@/contexts/GlobalMediaContext"; // ONE EAR PROTOCOL
import { NavigationBusProvider } from "@/contexts/NavigationBusContext"; // PHASE 2: Search → Globe Bridge
import { DeferredComponentLoader } from '@/components/DeferredComponentLoader';
import { MoraZoeGlobalHost } from '@/components/astro/MoraZoeGlobalHost';
import { LightActivityTracker } from '@/components/LightActivityTracker';
import { MemoryLeakPlumberGlobal } from '@/components/MemoryLeakPlumberGlobal';
import { AutoFixProvider } from '@/components/AutoFixProvider';
import { AdaptiveLearningProvider } from '@/components/AdaptiveLearningProvider';
import { SecurityShell, ShadowSentinelProvider, QuantumGatekeeper, DevModeProvider, AdminToolbar, AccessDeniedScreen } from '@/components/security';
import { HarvestIntegration } from '@/components/harvest/HarvestIntegration'; // PROTOCOL ICEBERG
import { VelvetRopeProvider } from '@/contexts/VelvetRopeContext'; // VELVET ROPE PROTOCOL
import PlanetaryIntentSelector from '@/components/velvet-rope/PlanetaryIntentSelector';
import DevTestButton from '@/components/velvet-rope/DevTestButton';
import ScreenTapController from '@/components/phantom/ScreenTapController'; // PROTOCOL PHANTOM
import AutoPhantomProvider from '@/components/phantom/AutoPhantomProvider'; // WAVE 3: Auto-Ghost
import { ZoeUnifiedSelfHealerProvider } from '@/components/ZoeUnifiedSelfHealerProvider';
import { AdaptiveProviderShell } from '@/components/AdaptiveProviderShell'; // ADAPTIVE DEVICE INJECTION
import { ZoeMonitorProvider } from '@/components/ZoeMonitorProvider';
// DeviceTierProvider moved to main.tsx for earliest possible detection
import ProtectedRoute from "./components/ProtectedRoute";
// BottomNavigation removed - now using HUD navigation
import SplashScreen from "./components/SplashScreen";
import InstallPrompt from "./components/InstallPrompt";
import GuardianInterventionOverlay from "./components/vitruvian/GuardianInterventionOverlay";
import MicPermissionInitializer from "./components/MicPermissionInitializer";
import PlatformPermissionsInitializer from "./components/PlatformPermissionsInitializer";
import MmoraBrandHomeBridge from "./components/brand/MmoraBrandHomeBridge";
import VoiceSystemActivator from "./components/VoiceSystemActivator";
import CameraActiveIndicator from "./components/CameraActiveIndicator"; // CAMERA EYE INDICATOR
import { DHFHeartbeatPulse } from "./components/DHFHeartbeatPulse"; // PHASE 3: 24h Kill Switch
import GenesisCinematicIntro from "./components/GenesisCinematicIntro";
import { useGenesisIntro } from "./hooks/useGenesisIntro";
import BiosBootSequence from "./components/boot/BiosBootSequence";
import React, { useState, useEffect, useCallback, lazy, Suspense, memo } from "react";
import { useLocation } from "react-router-dom";
import { checkAppVersion, recoverFromChunkError } from "@/lib/versionCheck";

// Lazy load pages for code splitting and faster initial load
const AuthPage = lazy(() => import("./pages/AuthPage"));
const PasswordRecoveryPage = lazy(() => import("./pages/PasswordRecoveryPage"));
const SecuritySettingsPage = lazy(() => import("./components/SecuritySettingsPage"));
const CameraPage = lazy(() => import("./pages/CameraPage"));
const HomePage = lazy(() => import("./pages/HomePage"));
const ChatPage = lazy(() => import("./pages/ChatPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const HuddlePage = lazy(() => import("./pages/HuddlePage"));
const UserProfileView = lazy(() => import("./pages/UserProfileView"));
const WebdropPage = lazy(() => import("./pages/WebdropPage"));
const AICompanionPage = lazy(() => import("./pages/AICompanionPage"));
const NotificationPreferencesPage = lazy(() => import("./pages/NotificationPreferencesPage"));
const NotificationHistoryPage = lazy(() => import("./pages/NotificationHistoryPage"));
const ActivityExportPage = lazy(() => import("./pages/ActivityExportPage"));
const VoiceCommandHistoryPage = lazy(() => import("./pages/VoiceCommandHistoryPage"));
const VoiceCommandsPage = lazy(() => import("./pages/VoiceCommandsPage"));
const VoiceCommandTestPage = lazy(() => import("./pages/VoiceCommandTestPage"));
const ZoeAIPage = lazy(() => import("./pages/ZoeAIPage"));
const UniversalTimelinePage = lazy(() => import("./pages/UniversalTimelinePage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const AnalyticsDashboard = lazy(() => import("./pages/AnalyticsDashboard"));
const DHFDashboardPage = lazy(() => import("./pages/DHFDashboardPage"));
const IntegrationTestPage = lazy(() => import("./pages/IntegrationTestPage"));
const ZoeOmegaPage = lazy(() => import("./pages/ZoeOmegaPage"));
const CompatibilityReportPage = lazy(() => import("./pages/CompatibilityReportPage"));
const OmegaEvolutionPage = lazy(() => import("./pages/OmegaEvolutionPage"));
const QuadrillionAuditDashboard = lazy(() => import("./pages/QuadrillionAuditDashboard"));
const ZoeNexusPage = lazy(() => import("./pages/ZoeNexusPage"));
const PhoenixCorePage = lazy(() => import("./pages/PhoenixCorePage"));
const VitruvianPage = lazy(() => import("./pages/VitruvianPage"));
const OrbitalCommandPage = lazy(() => import("./pages/OrbitalCommandPage"));
const AgentMemoryPage = lazy(() => import("./pages/AgentMemoryPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ExodusProtocolPage = lazy(() => import("./components/exodus/ExodusProtocolPage"));
const ExodusMap = lazy(() => import("./components/exodus/ExodusMap"));
const LegalNexusPage = lazy(() => import("./components/legal/LegalNexusPage"));
const ContractScannerPage = lazy(() => import("./components/legal/ContractScanner"));
const AnkaShastraDashboard = lazy(() => import("./components/quantum/AnkaShastraDashboard"));
const VastuQuantumScan = lazy(() => import("./components/quantum/VastuQuantumScan"));
const AgasthyaVisionPage = lazy(() => import("./components/quantum/AgasthyaVision"));
const BlueprintDownloadPage = lazy(() => import("./pages/BlueprintDownloadPage"));
const ZoeNexusControlPage = lazy(() => import("./pages/ZoeNexusControlPage"));
const MmoraPage = lazy(() => import("./pages/Mmora"));
const SovereignControlPage = lazy(() => import("./pages/SovereignControlPage"));
const SelfieCityPage = lazy(() => import("./pages/SelfieCityPage"));
const MerchantCommandCenter = lazy(() => import("./pages/MerchantCommandCenter"));
const ASITestPage = lazy(() => import("./pages/ASITestPage"));
const CareerDivinityPage = lazy(() => import("./pages/CareerDivinityPage"));
const ReSleevePage = lazy(() => import("./pages/ReSleevePage"));
const QuantumCameraPage = lazy(() => import("./pages/QuantumCamera"));
const OfflineModeOverlay = lazy(() => import("./components/OfflineModeOverlay"));
const ZoeArchitectureBlueprintPage = lazy(() => import("./pages/ZoeArchitectureBlueprintPage"));
const KronosAnimaPage = lazy(() => import("./pages/KronosAnimaPage"));
const VoiceAuthPage = lazy(() => import("./pages/VoiceAuth"));
const ZoeInfinityPage = lazy(() => import("./pages/ZoeInfinity"));
const ZoeInfinityAuthPage = lazy(() => import("./pages/ZoeInfinityAuth"));
const ZoeInfinityMailPage = lazy(() => import("./pages/ZoeInfinityMail"));
const ZoeIdentityPage = lazy(() => import("./pages/ZoeIdentity")); // GENESIS IMPRINT - 2120 Auth
const EarLinkBlueprintPage = lazy(() => import("./pages/EarLinkBlueprintPage")); // EAR-LINK HARDWARE
const PlatformAuditPage = lazy(() => import("./pages/PlatformAuditPage")); // PLATFORM ROOT SCAN
const RootScanPage = lazy(() => import("./pages/RootScanPage")); // ZOE INFINITY ROOT SCAN
const VRWorldAuditPage = lazy(() => import("./pages/VRWorldAuditPage")); // VR OMEGA WORLD AUDIT
const InstallAppPage = lazy(() => import("./pages/InstallApp")); // PWA INSTALL PAGE
const GodModeEvolution = lazy(() => import("./pages/GodModeEvolution")); // ASI GENESIS KERNEL
const SentinelPage = lazy(() => import("./pages/SentinelPage")); // M'MORA SENTINEL
const AdminHealthPage = lazy(() => import("./pages/AdminHealthPage")); // ADMIN HEALTH & STATUS
const AdminSearchIndexPage = lazy(() => import("./pages/AdminSearchIndexPage")); // SEARCH INDEX BACKFILL
const AdminFeedDebugPage = lazy(() => import("./pages/AdminFeedDebugPage")); // FEED/LOOPS DEBUGGER
const AstroPreviewPage = lazy(() => import("./pages/AstroPreviewPage")); // M'MORA ZOE DAILY ALIGNMENT HARNESS
const ZoeAstroDashboardPage = lazy(() => import("./pages/ZoeAstroDashboardPage")); // M'MORA ZOE ALIGNMENT DASHBOARD
const ZoeBirthDetailsPage = lazy(() => import("./pages/ZoeBirthDetailsPage"));
const ZoeDispatchDashboardPage = lazy(() => import("./pages/ZoeDispatchDashboardPage"));
const ZoeAstroLogPage = lazy(() => import("./pages/ZoeAstroLogPage"));
const ZoeAuditTracePage = lazy(() => import("./pages/ZoeAuditTracePage"));



// Loading fallback component — never render a silent black screen.
const PageLoader = () => (
  <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
    <div className="flex flex-col items-center gap-4 rounded-lg border border-border bg-card/60 px-6 py-5 shadow-lg backdrop-blur">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-muted border-b-primary" />
      <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Zoe is reconnecting</p>
    </div>
  </div>
);

const isLovablePreviewHost = (): boolean => {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host.includes('lovableproject.com') || host.startsWith('id-preview--');
};

const ZOE_BLANK_RECOVERY_KEY = 'mmora_preview_blank_recovery_at';

const ZoePreviewRecoveryGuard = ({ children }: { children: React.ReactNode }) => {
  const { pathname } = useLocation();
  const [stalled, setStalled] = useState(false);

  useEffect(() => {
    setStalled(false);

    const isRootVisiblyBlank = () => {
      const root = document.getElementById('root');
      if (!root) return true;

      const text = (root.textContent || '').replace(/\s+/g, ' ').trim();
      const interactiveOrVisual = root.querySelectorAll('button,input,textarea,select,a,canvas,svg,video,[role],details').length;
      return text.length < 8 && interactiveOrVisual === 0;
    };

    const visibleTimer = window.setTimeout(() => {
      if (isRootVisiblyBlank()) setStalled(true);
    }, 5_000);

    const recoverTimer = window.setTimeout(() => {
      if (!isLovablePreviewHost() || !isRootVisiblyBlank()) return;

      try {
        const last = Number(sessionStorage.getItem(ZOE_BLANK_RECOVERY_KEY) || '0');
        if (Date.now() - last < 10 * 60 * 1000) return;
        sessionStorage.setItem(ZOE_BLANK_RECOVERY_KEY, String(Date.now()));
      } catch {
        // continue with one recovery attempt if storage is unavailable
      }

      recoverFromChunkError();
    }, 9_000);

    return () => {
      window.clearTimeout(visibleTimer);
      window.clearTimeout(recoverTimer);
    };
  }, [pathname]);

  return (
    <>
      {children}
      {stalled && (
        <div className="fixed inset-0 z-[99998] flex items-center justify-center bg-background/95 p-4 text-foreground backdrop-blur" role="status">
          <div className="w-full max-w-sm rounded-lg border border-border bg-card p-5 text-center shadow-lg">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-muted border-b-primary" />
            <h1 className="font-mono text-sm uppercase tracking-widest text-primary">Zoe preview recovery</h1>
            <p className="mt-2 text-sm text-muted-foreground">The preview stalled, so the recovery guard is restoring the session.</p>
            <div className="mt-4 flex justify-center gap-2">
              <button className="rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground" onClick={() => recoverFromChunkError()}>
                Recover now
              </button>
              <button className="rounded-md border border-border bg-secondary px-3 py-2 text-xs font-medium text-secondary-foreground" onClick={() => window.location.reload()}>
                Reload
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// Error boundary for lazy-loaded components
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean; error: Error | null; componentStack?: string }
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null, componentStack: undefined };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('App ErrorBoundary:', error);
    console.error('Component stack:', errorInfo.componentStack);
    this.setState({ componentStack: errorInfo.componentStack });

    const message = String(error?.message || '').toLowerCase();
    const isChunkImportFailure =
      message.includes('importing a module script failed') ||
      message.includes('failed to fetch dynamically imported module') ||
      message.includes('chunkloaderror');

    const isVRRoute = typeof window !== 'undefined' && window.location.pathname.startsWith('/zoe-omega');
    if (isChunkImportFailure && !isVRRoute) {
      console.warn('[App ErrorBoundary] Lazy chunk import failed, running chunk recovery');
      recoverFromChunkError();
    } else if (isChunkImportFailure) {
      console.warn('[App ErrorBoundary] Lazy chunk import failed on VR route; keeping current session to avoid refresh loop.');
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    // If caller provided a custom fallback, use it.
    if (this.props.fallback) return this.props.fallback;

    const errMsg = String(this.state.error?.message || '');
    const isRealtimeError =
      errMsg.includes('postgres_changes') ||
      errMsg.includes('realtime:') ||
      errMsg.toLowerCase().includes('after `subscribe()`');

    const softRetry = () => {
      this.setState({ hasError: false, error: null, componentStack: undefined });
    };

    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
        <div className="text-center space-y-3 max-w-lg">
          <h1 className="text-xl font-semibold text-foreground">Something went wrong</h1>
          <p className="text-muted-foreground">
            {isRealtimeError
              ? 'A realtime connection hiccup occurred. Try again to reconnect without losing your session.'
              : 'Please refresh the page to continue'}
          </p>

          {this.state.error?.message && (
            <p className="text-xs text-destructive break-words">
              Error: {this.state.error.message}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <button
              onClick={softRetry}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Try again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90"
            >
              Refresh Page
            </button>
            <button
              onClick={() => {
                try {
                  navigator.clipboard.writeText(
                    [
                      this.state.error?.message ?? 'Unknown error',
                      this.state.error?.stack ?? '',
                      this.state.componentStack ?? '',
                    ].join('\n\n')
                  );
                } catch {
                  // ignore
                }
              }}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90"
            >
              Copy error
            </button>
          </div>

          {this.state.componentStack && (
            <details className="text-left rounded-md border border-border bg-card/30 p-3">
              <summary className="cursor-pointer text-xs text-muted-foreground">Details</summary>
              <pre className="mt-2 max-h-[40vh] overflow-auto text-[10px] text-foreground/80 whitespace-pre-wrap">
                {this.state.componentStack}
              </pre>
            </details>
          )}
        </div>
      </div>
    );
  }
}


// Optimized QueryClient with stale time to reduce refetches
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes
      gcTime: 1000 * 60 * 5, // 5 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Genesis Intro Wrapper - shows cinematic intro for first-time users
const GenesisIntroWrapper = ({ children }: { children: React.ReactNode }) => {
  const { showGenesis, completeGenesis, skipGenesis, isLoading: genesisLoading } = useGenesisIntro();

  const handleComplete = useCallback((selectedAvatar?: string) => {
    completeGenesis(selectedAvatar);
  }, [completeGenesis]);

  const handleSkip = useCallback(() => {
    skipGenesis();
  }, [skipGenesis]);

  if (genesisLoading) {
    return <>{children}</>;
  }

  if (showGenesis) {
    return <GenesisCinematicIntro onComplete={handleComplete} onSkip={handleSkip} />;
  }

  return <>{children}</>;
};

// Domain-based redirect for Zoe Infinity standalone (www.myzoe.xyz)
const ZOE_INFINITY_DOMAINS = ['myzoe.xyz', 'www.myzoe.xyz'];

const isZoeInfinityDomain = (): boolean => {
  if (typeof window === 'undefined') return false;
  const hostname = window.location.hostname;
  return ZOE_INFINITY_DOMAINS.some(d => hostname === d || hostname.endsWith(`.${d}`));
};

const RootRedirect = () => {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  
  // Zoe Infinity standalone domain → always go to /zoe-infinity
  if (isZoeInfinityDomain()) {
    // If not authenticated, go to Zoe Infinity auth
    if (!user) {
      return <Navigate to="/zoe-infinity/auth" replace />;
    }
    return <Navigate to="/zoe-infinity" replace />;
  }
  
  return <Navigate to={user ? '/home' : '/auth'} replace />;
};

const VoiceRuntimeGate = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const pathname = location.pathname;

  const isAuth =
    pathname.startsWith('/auth') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/password-recovery');

  // Never mount voice overlays on auth routes.
  if (isAuth) return null;
  return <>{children}</>;
};

const RouteAwareShell = () => {
  const { pathname } = useLocation();
  const { user, loading } = useAuth();
  
  // FIX 3: THE COMPONENT PURGE - Zoe Infinity is ISOLATED from AdaptiveProviderShell
  // These routes bypass the heavy provider tree for pure isolation
  const isRootPreAuth = pathname === '/' && (loading || !user);
  const isLightRoute =
    isRootPreAuth ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/password-recovery') ||
    pathname.startsWith('/zoe-omega') ||
    pathname.startsWith('/zoe-infinity') ||
    pathname.startsWith('/genesis-imprint') ||
    pathname.startsWith('/ear-link-blueprint') ||
    pathname.startsWith('/platform-audit') ||
    pathname.startsWith('/root-scan') ||
    pathname.startsWith('/agent-memory') ||
    pathname.startsWith('/vr-audit') ||
    pathname.startsWith('/install');

  // Ultra-light shell for isolated routes (prevents Safari hanging/crashing)
  if (isLightRoute) {
    return (
      <div className="min-h-screen bg-background text-foreground omega-void-bg">
        <VoiceRuntimeGate>
          <MicPermissionInitializer />
          <PlatformPermissionsInitializer />
          <VoiceSystemActivator />
        </VoiceRuntimeGate>

        <ErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/access-denied" element={<AccessDeniedScreen />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/voice-auth" element={<VoiceAuthPage />} />
              <Route path="/password-recovery" element={<PasswordRecoveryPage />} />
              <Route
                path="/zoe-omega"
                element={
                  <ProtectedRoute>
                    <ZoeOmegaPage />
                  </ProtectedRoute>
                }
              />
              <Route path="/zoe-infinity" element={<ZoeInfinityPage />} />
              <Route path="/zoe-infinity/auth" element={<ZoeInfinityAuthPage />} />
              <Route path="/zoe-infinity/mail" element={<ZoeInfinityMailPage />} />
              <Route path="/genesis-imprint" element={<ZoeIdentityPage />} />
              <Route path="/ear-link-blueprint" element={<EarLinkBlueprintPage />} />
              <Route path="/platform-audit" element={<PlatformAuditPage />} />
              <Route path="/root-scan" element={<RootScanPage />} />
              <Route path="/agent-memory" element={<AgentMemoryPage />} />
              <Route path="/vr-audit" element={<VRWorldAuditPage />} />
              <Route path="/install" element={<InstallAppPage />} />
              <Route path="/" element={<RootRedirect />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </div>
    );
  }

  return (
    <AdaptiveProviderShell>
      <AutoPhantomProvider enabled={true}>
        <ShadowSentinelProvider>
          <ZoeMonitorProvider>
            <VoiceRuntimeGate>
              <MicPermissionInitializer />
              <PlatformPermissionsInitializer />
              <VoiceSystemActivator />
            </VoiceRuntimeGate>

            <LightActivityTracker />
            <DHFHeartbeatPulse />
            <MemoryLeakPlumberGlobal />
            <AutoFixProvider />
            <DeferredComponentLoader />
            <HarvestIntegration />

            <VelvetRopeProvider>
              <PlanetaryIntentSelector />
              <DevTestButton />
              <ScreenTapController />
              <AdminToolbar />

              <GenesisIntroWrapper>
                <QuantumGatekeeper enabled={true}>
                  <div className="min-h-screen bg-background text-foreground omega-void-bg">
                    <ErrorBoundary>
                      <Suspense fallback={<PageLoader />}>
                        <Routes>
                          <Route path="/access-denied" element={<AccessDeniedScreen />} />
                          <Route path="/auth" element={<AuthPage />} />
                          <Route path="/voice-auth" element={<VoiceAuthPage />} />
                          <Route path="/password-recovery" element={<PasswordRecoveryPage />} />
                          <Route
                            path="/security"
                            element={
                              <ProtectedRoute>
                                <SecuritySettingsPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/camera"
                            element={
                              <ProtectedRoute>
                                <CameraPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/quantum-camera"
                            element={
                              <ProtectedRoute>
                                <QuantumCameraPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/home"
                            element={
                              <ProtectedRoute>
                                <HomePage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/chat"
                            element={
                              <ProtectedRoute>
                                <ChatPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/chat/:userId"
                            element={
                              <ProtectedRoute>
                                <ChatPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/huddle"
                            element={
                              <ProtectedRoute>
                                <HuddlePage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/profile"
                            element={
                              <ProtectedRoute>
                                <ProfilePage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/profile/:userId"
                            element={
                              <ProtectedRoute>
                                <UserProfileView />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/webdrop"
                            element={
                              <ProtectedRoute>
                                <WebdropPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/ai-companion"
                            element={
                              <ProtectedRoute>
                                <ZoeAIPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/notification-preferences"
                            element={
                              <ProtectedRoute>
                                <NotificationPreferencesPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/notification-history"
                            element={
                              <ProtectedRoute>
                                <NotificationHistoryPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/activity-export"
                            element={
                              <ProtectedRoute>
                                <ActivityExportPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/zoe-ai"
                            element={
                              <ProtectedRoute>
                                <ZoeAIPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/voice-commands"
                            element={
                              <ProtectedRoute>
                                <VoiceCommandsPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/voice-command-history"
                            element={
                              <ProtectedRoute>
                                <VoiceCommandHistoryPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/voice-command-test"
                            element={
                              <ProtectedRoute>
                                <VoiceCommandTestPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/universal-timeline"
                            element={
                              <ProtectedRoute>
                                <UniversalTimelinePage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/kronos-anima"
                            element={
                              <ProtectedRoute>
                                <KronosAnimaPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route path="/zoe-infinity" element={<ZoeInfinityPage />} />
                          <Route path="/zoe-infinity/mail" element={<ZoeInfinityMailPage />} />
                          <Route path="/genesis-imprint" element={<ZoeIdentityPage />} />
                          <Route path="/" element={<RootRedirect />} />
                          <Route path="/about" element={<AboutPage />} />
                          <Route
                            path="/analytics-dashboard"
                            element={
                              <ProtectedRoute>
                                <AnalyticsDashboard />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/admin/health"
                            element={
                              <ProtectedRoute>
                                <AdminHealthPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/admin/search-index"
                            element={
                              <ProtectedRoute>
                                <AdminSearchIndexPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/admin/feed-debug"
                            element={
                              <ProtectedRoute>
                                <AdminFeedDebugPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/admin/zoe-preview"
                            element={
                              <ProtectedRoute>
                                <AstroPreviewPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/zoe-astro"
                            element={
                              <ProtectedRoute>
                                <ZoeAstroDashboardPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/zoe-astro/birth"
                            element={
                              <ProtectedRoute>
                                <ZoeBirthDetailsPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/zoe-astro/log"
                            element={
                              <ProtectedRoute>
                                <ZoeAstroLogPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/zoe-astro/dispatch"
                            element={
                              <ProtectedRoute>
                                <ZoeDispatchDashboardPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/zoe-astro/trace/:correlationId"
                            element={
                              <ProtectedRoute>
                                <ZoeAuditTracePage />
                              </ProtectedRoute>
                            }
                          />



                          <Route
                            path="/dhf-dashboard"
                            element={
                              <ProtectedRoute>
                                <DHFDashboardPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/integration-test"
                            element={
                              <ProtectedRoute>
                                <div className="pb-16">
                                  <IntegrationTestPage />
                                </div>
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/compatibility-report"
                            element={
                              <ProtectedRoute>
                                <CompatibilityReportPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/zoe-omega"
                            element={
                              <ProtectedRoute>
                                <ZoeOmegaPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/omega-evolution"
                            element={
                              <ProtectedRoute>
                                <OmegaEvolutionPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/god-mode"
                            element={
                              <ProtectedRoute>
                                <QuadrillionAuditDashboard />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/god-mode/evolution"
                            element={
                              <ProtectedRoute>
                                <GodModeEvolution />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/zoe-nexus"
                            element={
                              <ProtectedRoute>
                                <ZoeNexusPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/phoenix-core"
                            element={
                              <ProtectedRoute>
                                <PhoenixCorePage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/vitruvian"
                            element={
                              <ProtectedRoute>
                                <VitruvianPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/orbital-command"
                            element={
                              <ProtectedRoute>
                                <OrbitalCommandPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/exodus"
                            element={
                              <ProtectedRoute>
                                <ExodusProtocolPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/exodus-map"
                            element={
                              <ProtectedRoute>
                                <ExodusMap />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/legal-nexus"
                            element={
                              <ProtectedRoute>
                                <LegalNexusPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/contract-scanner"
                            element={
                              <ProtectedRoute>
                                <ContractScannerPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/anka-shastra"
                            element={
                              <ProtectedRoute>
                                <AnkaShastraDashboard />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/vastu-scan"
                            element={
                              <ProtectedRoute>
                                <VastuQuantumScan />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/agasthya-vision"
                            element={
                              <ProtectedRoute>
                                <AgasthyaVisionPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/blueprint-download"
                            element={
                              <ProtectedRoute>
                                <BlueprintDownloadPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/zoe-nexus-control"
                            element={
                              <ProtectedRoute>
                                <ZoeNexusControlPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/asi-test"
                            element={
                              <ProtectedRoute>
                                <div className="pb-16">
                                  <ASITestPage />
                                </div>
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/mmora"
                            element={
                              <ProtectedRoute>
                                <MmoraPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/selfie-city"
                            element={
                              <ProtectedRoute>
                                <SelfieCityPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/merchant"
                            element={
                              <ProtectedRoute>
                                <MerchantCommandCenter />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/career-divinity"
                            element={
                              <ProtectedRoute>
                                <CareerDivinityPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/resleeve"
                            element={
                              <ProtectedRoute>
                                <ReSleevePage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/zoe-architecture"
                            element={
                              <ProtectedRoute>
                                <ZoeArchitectureBlueprintPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/sentinel"
                            element={<SentinelPage />}
                          />
                          <Route path="*" element={<NotFound />} />
                        </Routes>
                      </Suspense>
                    </ErrorBoundary>
                  </div>
                </QuantumGatekeeper>
              </GenesisIntroWrapper>
            </VelvetRopeProvider>
          </ZoeMonitorProvider>
        </ShadowSentinelProvider>
      </AutoPhantomProvider>
    </AdaptiveProviderShell>
  );
};

const SecurityBypassOnAuthRoutes = ({ children }: { children: React.ReactNode }) => {
  const { pathname } = useLocation();
  const { user, loading } = useAuth();

  const isAuthRoute =
    pathname.startsWith('/auth') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/password-recovery') ||
    pathname.startsWith('/voice-auth') ||
    pathname.startsWith('/zoe-infinity/auth');
  const isZoeInfinityRoute = pathname.startsWith('/zoe-infinity');

  // Critical: never mount aggressive security layers before auth resolves
  // or while user is unauthenticated (matches private/incognito clean path behavior).
  const shouldBypassSecurity = loading || !user || isAuthRoute || isZoeInfinityRoute || pathname === '/';

  if (shouldBypassSecurity) return <>{children}</>;

  return (
    <SecurityShell enabled={true} devToolsTrapEnabled={true} voidShellEnabled={true}>
      {children}
    </SecurityShell>
  );
};

const App = () => {
  const [showBiosBoot, setShowBiosBoot] = useState(() => {
    // Check if BIOS boot was shown this session
    return !sessionStorage.getItem('biosBootShown');
  });

  const [showSplash, setShowSplash] = useState(() => {
    // Check if splash was shown today
    const lastShownDate = localStorage.getItem('splashLastShown');
    const today = new Date().toDateString();

    // Show splash if it hasn't been shown today
    return lastShownDate !== today;
  });

  // Check app version and force refresh if outdated
  useEffect(() => {
    checkAppVersion();
  }, []);

  // Capture invite token as early as possible (even before boot/splash/intro)
  // This prevents losing the token if any early UI flow triggers a redirect.
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('invite_token');
      if (token && !sessionStorage.getItem('quantum_invite_token')) {
        sessionStorage.setItem('quantum_invite_token', token);
      }
    } catch {
      // ignore
    }
  }, []);

  // Initialize Zoe AI voices on app load
  useEffect(() => {
    // Initialize Zoe voices with error resilience for M05/low-end devices
    const initVoices = async () => {
      try {
        const { initializeZoeVoices } = await import('@/utils/zoeVoice');
        await initializeZoeVoices();
      } catch (error) {
        // On M05/low-end devices, module import may fail - use direct fallback
        console.warn('Failed to initialize Zoe voices:', error);
        try {
          // Direct fallback: ensure speechSynthesis is ready
          if ('speechSynthesis' in window) {
            window.speechSynthesis.getVoices();
            console.log('[ZoeVoice] Fallback: Direct speechSynthesis initialized');
          }
        } catch {
          // Voice unavailable - not critical
        }
      }
    };
    initVoices();

    // Initialize notification sounds audio context on user interaction
    const initAudio = () => {
      import('@/utils/notificationSounds')
        .then(({ initializeAudio }) => {
          initializeAudio();
        })
        .catch((error) => {
          console.warn('Failed to initialize audio:', error);
        });
    };

    // Listen for any user interaction to initialize audio
    document.addEventListener('click', initAudio, { once: true });
    document.addEventListener('touchstart', initAudio, { once: true });

    return () => {
      document.removeEventListener('click', initAudio);
      document.removeEventListener('touchstart', initAudio);
    };
  }, []);

  const handleSplashFinish = useCallback(() => {
    try {
      const today = new Date().toDateString();
      localStorage.setItem('splashLastShown', today);
    } catch {
      // ignore
    }
    setShowSplash(false);
  }, []);

  const handleBiosComplete = useCallback(() => {
    try {
      sessionStorage.setItem('biosBootShown', 'true');
    } catch {
      // ignore
    }
    setShowBiosBoot(false);
  }, []);

  // Failsafe: never let BIOS boot stall the app indefinitely
  useEffect(() => {
    if (!showBiosBoot) return;
    const t = window.setTimeout(() => {
      console.warn('[Boot] BIOS timeout — skipping');
      try {
        sessionStorage.setItem('biosBootShown', 'true');
      } catch {
        // ignore
      }
      setShowBiosBoot(false);
    }, 600); // ULTRA-OPTIMIZED: 600ms max for BIOS

    return () => window.clearTimeout(t);
  }, [showBiosBoot]);

  // Failsafe: Splash timeout
  useEffect(() => {
    if (!showSplash) return;
    const t = window.setTimeout(() => {
      console.warn('[Boot] Splash timeout — skipping');
      try {
        localStorage.setItem('splashLastShown', new Date().toDateString());
      } catch {
        // ignore
      }
      setShowSplash(false);
    }, 400); // ULTRA-OPTIMIZED: 400ms max for splash

    return () => window.clearTimeout(t);
  }, [showSplash]);

  // Show BIOS boot first
  if (showBiosBoot) {
    return <BiosBootSequence onComplete={handleBiosComplete} />;
  }

  if (showSplash) {
    return <SplashScreen onFinish={handleSplashFinish} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {/* DeviceTierProvider is in main.tsx - earliest possible detection for M05 optimization */}
        <GlobalMediaProvider>
          <NavigationBusProvider>
            <DevModeProvider>
              <CorticalStackProvider>
                <AdaptiveLearningProvider>
                  <ZoeUnifiedSelfHealerProvider>
                    <TooltipProvider>
                      <Toaster />
                      <Sonner />
                      <InstallPrompt />
                      <GuardianInterventionOverlay />
                      <CameraActiveIndicator position="top-right" minimal={false} />
                      <Suspense fallback={null}>
                        <OfflineModeOverlay />
                      </Suspense>

                      {/* Sandboxed M'Mora Zoe overlay layer — zero impact on feed/routing */}
                      <Suspense fallback={null}>
                        <MoraZoeGlobalHost />
                      </Suspense>

                      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>

                        <MmoraBrandHomeBridge />
                        <ZoePreviewRecoveryGuard>
                          <SecurityBypassOnAuthRoutes>
                            {/* Route-aware shell: keep /auth ultra-light to prevent Safari hangs */}
                            <RouteAwareShell />
                          </SecurityBypassOnAuthRoutes>
                        </ZoePreviewRecoveryGuard>
                      </BrowserRouter>
                    </TooltipProvider>
                  </ZoeUnifiedSelfHealerProvider>
                </AdaptiveLearningProvider>
              </CorticalStackProvider>
            </DevModeProvider>
          </NavigationBusProvider>
        </GlobalMediaProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

// ZoeAssistantWrapper removed - now handled by DeferredComponentLoader

export default App;

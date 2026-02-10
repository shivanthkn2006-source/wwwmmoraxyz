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
import AdminRoute from "./components/AdminRoute";
// BottomNavigation removed - now using HUD navigation
import SplashScreen from "./components/SplashScreen";
import InstallPrompt from "./components/InstallPrompt";
import GuardianInterventionOverlay from "./components/vitruvian/GuardianInterventionOverlay";
import MicPermissionInitializer from "./components/MicPermissionInitializer";
import VoiceSystemActivator from "./components/VoiceSystemActivator";
import CameraActiveIndicator from "./components/CameraActiveIndicator"; // CAMERA EYE INDICATOR
import GenesisCinematicIntro from "./components/GenesisCinematicIntro";
import { useGenesisIntro } from "./hooks/useGenesisIntro";
import BiosBootSequence from "./components/boot/BiosBootSequence";
import React, { useState, useEffect, useCallback, lazy, Suspense, memo } from "react";
import { useLocation } from "react-router-dom";
import { checkAppVersion } from "@/lib/versionCheck";

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
const ZoeAIPage = lazy(() => import("./pages/ZoeAIPage"));
const UniversalTimelinePage = lazy(() => import("./pages/UniversalTimelinePage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const AnalyticsDashboard = lazy(() => import("./pages/AnalyticsDashboard"));
const DHFDashboardPage = lazy(() => import("./pages/DHFDashboardPage"));
const IntegrationTestPage = lazy(() => import("./pages/IntegrationTestPage"));
const ZoeOmegaPage = lazy(() => import("./pages/ZoeOmegaPage"));
const OmegaEvolutionPage = lazy(() => import("./pages/OmegaEvolutionPage"));
const QuadrillionAuditDashboard = lazy(() => import("./pages/QuadrillionAuditDashboard"));
const ZoeNexusPage = lazy(() => import("./pages/ZoeNexusPage"));
const PhoenixCorePage = lazy(() => import("./pages/PhoenixCorePage"));
const VitruvianPage = lazy(() => import("./pages/VitruvianPage"));
const OrbitalCommandPage = lazy(() => import("./pages/OrbitalCommandPage"));
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
const InstallAppPage = lazy(() => import("./pages/InstallApp")); // PWA INSTALL PAGE

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
);

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
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    // If caller provided a custom fallback, use it.
    if (this.props.fallback) return this.props.fallback;

    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
        <div className="text-center space-y-3 max-w-lg">
          <h1 className="text-xl font-semibold text-foreground">Something went wrong</h1>
          <p className="text-muted-foreground">Please refresh the page to continue</p>

          {this.state.error?.message && (
            <p className="text-xs text-destructive break-words">
              Error: {this.state.error.message}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
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
  
  // FIX 3: THE COMPONENT PURGE - Zoe Infinity is ISOLATED from AdaptiveProviderShell
  // These routes bypass the heavy provider tree for pure isolation
  const isLightRoute =
    pathname.startsWith('/auth') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/password-recovery') ||
    pathname.startsWith('/zoe-infinity') ||
    pathname.startsWith('/genesis-imprint') ||
    pathname.startsWith('/ear-link-blueprint') ||
    pathname.startsWith('/platform-audit') ||
    pathname.startsWith('/root-scan') ||
    pathname.startsWith('/install');

  // Ultra-light shell for isolated routes (prevents Safari hanging/crashing)
  if (isLightRoute) {
    return (
      <div className="min-h-screen bg-background text-foreground omega-void-bg">
        <ErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/access-denied" element={<AccessDeniedScreen />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/voice-auth" element={<VoiceAuthPage />} />
              <Route path="/password-recovery" element={<PasswordRecoveryPage />} />
              <Route path="/zoe-infinity" element={<ZoeInfinityPage />} />
              <Route path="/zoe-infinity/auth" element={<ZoeInfinityAuthPage />} />
              <Route path="/zoe-infinity/mail" element={<ZoeInfinityMailPage />} />
              <Route path="/genesis-imprint" element={<ZoeIdentityPage />} />
              <Route path="/ear-link-blueprint" element={<EarLinkBlueprintPage />} />
              <Route path="/platform-audit" element={<PlatformAuditPage />} />
              <Route path="/root-scan" element={<RootScanPage />} />
              <Route path="/install" element={<InstallAppPage />} />
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
              <VoiceSystemActivator />
            </VoiceRuntimeGate>

            <LightActivityTracker />
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
                              <AdminRoute featureName="Anka Shastra Protocol">
                                <AnkaShastraDashboard />
                              </AdminRoute>
                            }
                          />
                          <Route
                            path="/vastu-scan"
                            element={
                              <AdminRoute featureName="Vastu Quantum Scan">
                                <VastuQuantumScan />
                              </AdminRoute>
                            }
                          />
                          <Route
                            path="/agasthya-vision"
                            element={
                              <AdminRoute featureName="Agasthya Nadi Vision">
                                <AgasthyaVisionPage />
                              </AdminRoute>
                            }
                          />
                          <Route
                            path="/blueprint-download"
                            element={
                              <AdminRoute featureName="Architecture Blueprint">
                                <BlueprintDownloadPage />
                              </AdminRoute>
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
                              <AdminRoute featureName="Zoe Architecture Blueprint">
                                <ZoeArchitectureBlueprintPage />
                              </AdminRoute>
                            }
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
              <SecurityShell enabled={true} devToolsTrapEnabled={true} voidShellEnabled={true}>
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

                        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                          {/* Route-aware shell: keep /auth ultra-light to prevent Safari hangs */}
                          <RouteAwareShell />
                        </BrowserRouter>
                      </TooltipProvider>
                    </ZoeUnifiedSelfHealerProvider>
                  </AdaptiveLearningProvider>
                </CorticalStackProvider>
              </SecurityShell>
            </DevModeProvider>
          </NavigationBusProvider>
        </GlobalMediaProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

// ZoeAssistantWrapper removed - now handled by DeferredComponentLoader

export default App;

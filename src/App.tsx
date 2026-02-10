import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/auth";
import ProtectedRoute from "./components/ProtectedRoute";
import React, { useEffect, useCallback, lazy, Suspense } from "react";
import { checkAppVersion } from "@/lib/versionCheck";

// Lazy load the 3 Zoe Infinity pages
const ZoeInfinityPage = lazy(() => import("./pages/ZoeInfinity"));
const ZoeInfinityAuthPage = lazy(() => import("./pages/ZoeInfinityAuth"));
const ZoeInfinityMailPage = lazy(() => import("./pages/ZoeInfinityMail"));

// Loading fallback
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
);

// Error boundary for lazy-loaded components
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('App ErrorBoundary:', error);
    console.error('Component stack:', errorInfo.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

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
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }
}

// Root redirect: logged in → /, not logged in → /auth
const RootRedirect = () => {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (user) return <ZoeInfinityPage />;
  return <Navigate to="/auth" replace />;
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      gcTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App = () => {
  useEffect(() => {
    checkAppVersion();
  }, []);

  // Initialize Zoe voices
  useEffect(() => {
    const initVoices = async () => {
      try {
        const { initializeZoeVoices } = await import('@/utils/zoeVoice');
        await initializeZoeVoices();
      } catch (error) {
        console.warn('Failed to initialize Zoe voices:', error);
        try {
          if ('speechSynthesis' in window) {
            window.speechSynthesis.getVoices();
          }
        } catch {
          // Voice unavailable
        }
      }
    };
    initVoices();

    const initAudio = () => {
      import('@/utils/notificationSounds')
        .then(({ initializeAudio }) => initializeAudio())
        .catch((error) => console.warn('Failed to initialize audio:', error));
    };

    document.addEventListener('click', initAudio, { once: true });
    document.addEventListener('touchstart', initAudio, { once: true });

    return () => {
      document.removeEventListener('click', initAudio);
      document.removeEventListener('touchstart', initAudio);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <div className="min-h-screen bg-background text-foreground">
              <ErrorBoundary>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="/auth" element={<ZoeInfinityAuthPage />} />
                    <Route
                      path="/mail"
                      element={
                        <ProtectedRoute>
                          <ZoeInfinityMailPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route path="/" element={<RootRedirect />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Suspense>
              </ErrorBoundary>
            </div>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;

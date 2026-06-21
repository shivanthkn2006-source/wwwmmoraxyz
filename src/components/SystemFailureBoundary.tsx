import React from "react";
import { Button } from "@/components/ui/button";
import { errorLogger } from "@/utils/errorBoundaryLogger";
import { forceAppRefresh, recoverFromChunkError } from "@/lib/versionCheck";
import { supabase } from "@/integrations/supabase/client";

type State = {
  hasError: boolean;
  error: Error | null;
  componentStack?: string;
  isChunkFailure: boolean;
  autoRetryIn: number; // seconds remaining for auto-retry
};

// ─── Zoe Monitor Integration ──────────────────────────────────────────────────

const ADMIN_USERNAMES = ['saraswathi', 'moksh50'];
const VR_FALLBACK_PATH = '/selfie-city';

const getDeviceInfo = (): Record<string, unknown> => {
  const connection = (navigator as any).connection;
  const memory = (performance as any).memory;
  
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    online: navigator.onLine,
    connectionType: connection?.effectiveType || 'unknown',
    memoryUsed: memory ? Math.round(memory.usedJSHeapSize / 1048576) : null,
  };
};

const isVRScreen = (): boolean => {
  const path = window.location.pathname;
  return path.includes('/vr') || path.includes('/3d') || path.includes('/globe') || path.includes('/world');
};

const getScreenName = (path: string): string => {
  const screenMap: Record<string, string> = {
    '/vr': 'VR World', '/3d': '3D View', '/globe': 'Selfie Globe',
    '/world': 'World Map', '/home': 'Home', '/chat': 'Chat',
    '/profile': 'Profile', '/settings': 'Settings', '/selfie-city': 'Selfie City',
  };
  for (const [key, name] of Object.entries(screenMap)) {
    if (path.includes(key)) return name;
  }
  return path || 'Unknown Screen';
};

// Log crash to Supabase
const logCrashToDatabase = async (error: Error, componentStack?: string) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const screenName = getScreenName(window.location.pathname);
    const severity = error.message.includes('memory') ? 'critical' : isVRScreen() ? 'high' : 'critical';

    await supabase.from('system_health_logs').insert([{
      user_id: user?.id || null,
      log_type: 'crash',
      screen_name: screenName,
      error_message: error.message || 'Unknown error',
      error_stack: error.stack || null,
      component_stack: componentStack || null,
      severity,
      auto_heal_attempted: false,
      device_info: getDeviceInfo(),
      session_id: `session_${Date.now()}`,
      url_path: window.location.pathname,
      timestamp: new Date().toISOString(), // Use ISO string for database
    }] as any);

    console.log('[ZoeMonitor] Crash logged to database');
  } catch (e) {
    console.error('[ZoeMonitor] Failed to log crash:', e);
  }
};

// Notify admin via Zoe Whisper
const notifyAdminOfCrash = async (error: Error) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const screenName = getScreenName(window.location.pathname);
    
    const { data: admins } = await supabase
      .from('profiles')
      .select('id, username')
      .or(ADMIN_USERNAMES.map(u => `username.ilike.${u}`).join(','));

    if (!admins || admins.length === 0) return;

    let crashedUsername = 'Unknown User';
    if (user?.id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single();
      crashedUsername = profile?.username || 'Unknown User';
    }

    const notifications = admins.map(admin => ({
      user_id: admin.id,
      from_user_id: user?.id || admin.id,
      type: 'system_alert',
      priority: 5,
      read: false,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      context_data: {
        title: '🚨 Zoe Sentry Alert: CRITICAL',
        message: `Alert: User @${crashedUsername} just crashed on the ${screenName}. Error: ${error.message.substring(0, 100)}`,
        crash_type: 'zoe_sentry',
        crashed_user_id: user?.id,
        crashed_username: crashedUsername,
        screen_name: screenName,
        severity: 'critical',
        timestamp: new Date().toISOString(),
      }
    }));

    await supabase.from('notifications').insert(notifications as any);
    console.log('[ZoeMonitor] Admin notified via Zoe Whisper');
  } catch (e) {
    console.error('[ZoeMonitor] Failed to notify admin:', e);
  }
};

// Auto-heal VR crashes
const attemptVRAutoHeal = (): boolean => {
  if (isVRScreen()) {
    console.log('[ZoeMonitor] VR crash detected - auto-healing to Lite 2D Map');
    try {
      sessionStorage.removeItem('vr_state');
      sessionStorage.removeItem('globe_state');
      localStorage.removeItem('vr_cache');
    } catch (e) { /* ignore */ }
    
    setTimeout(() => {
      window.location.href = VR_FALLBACK_PATH;
    }, 2000);
    return true;
  }
  return false;
};

// ─── Error Boundary Component ─────────────────────────────────────────────────

export default class SystemFailureBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  state: State = { hasError: false, error: null, isChunkFailure: false, autoRetryIn: 0 };

  private retryTimer: ReturnType<typeof setInterval> | null = null;

  static getDerivedStateFromError(error: Error): Partial<State> {
    const msg = String(error?.message || '').toLowerCase();
    const isChunkFailure =
      msg.includes('importing a module script failed') ||
      msg.includes('failed to fetch dynamically imported module') ||
      msg.includes('chunkloaderror');
    return { hasError: true, error, isChunkFailure, autoRetryIn: isChunkFailure ? 0 : 5 };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const message = String(error?.message || '').toLowerCase();
    const isChunkImportFailure =
      message.includes('importing a module script failed') ||
      message.includes('failed to fetch dynamically imported module') ||
      message.includes('chunkloaderror');
    const isVRRoute = typeof window !== 'undefined' && window.location.pathname.startsWith('/zoe-omega');

    if (isChunkImportFailure && !isVRRoute) {
      console.warn('[SystemFailureBoundary] Module import failed, running one-shot chunk recovery');
      recoverFromChunkError();
    }

    // Log to error logger
    errorLogger.log({
      errorType: "ReactErrorBoundary",
      message: error.message || "Unknown React render error",
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      severity: "critical",
    });

    this.setState({ componentStack: errorInfo.componentStack });

    // Phase 3: SysAdmin Zoe Integration
    // 1. Log to system_health_logs
    logCrashToDatabase(error, errorInfo.componentStack);
    
    // 2. Notify admin (Saraswathi) via Zoe Whisper
    notifyAdminOfCrash(error);
    
    // 3. Auto-heal VR crashes by redirecting to Lite 2D Map
    const autoHealed = attemptVRAutoHeal();
    if (autoHealed) {
      console.log('[ZoeMonitor] VR auto-heal initiated - redirecting to Lite 2D Map');
    }
  }

  componentDidMount() {
    this.startAutoRetry();
  }

  componentDidUpdate(_prevProps: { children: React.ReactNode }, prevState: State) {
    if (this.state.hasError && !prevState.hasError) {
      this.startAutoRetry();
    }
  }

  componentWillUnmount() {
    if (this.retryTimer) clearInterval(this.retryTimer);
  }

  private startAutoRetry = () => {
    // Auto-retry only for non-chunk transient errors. Chunk failures already
    // trigger recoverFromChunkError() which shows its own overlay + reload.
    if (!this.state.hasError || this.state.isChunkFailure || this.state.autoRetryIn <= 0) return;
    if (this.retryTimer) clearInterval(this.retryTimer);
    this.retryTimer = setInterval(() => {
      this.setState((s) => {
        const next = s.autoRetryIn - 1;
        if (next <= 0) {
          if (this.retryTimer) { clearInterval(this.retryTimer); this.retryTimer = null; }
          // Soft reset — try to recover without full reload
          window.location.reload();
          return { autoRetryIn: 0 };
        }
        return { autoRetryIn: next };
      });
    }, 1000);
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleHardRefresh = () => {
    forceAppRefresh();
  };

  private handleClearLogs = () => {
    errorLogger.clearErrors();
    this.handleReload();
  };

  private handleGoToLiteMap = () => {
    window.location.href = VR_FALLBACK_PATH;
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const error = this.state.error;
    const recent = errorLogger.getStoredErrors().slice(-5).reverse();
    const isVR = isVRScreen();

    // Friendly recovery UI for chunk-import failures (deploy / stale tab).
    // Recovery is already in progress via recoverFromChunkError() — this is
    // only what the user sees while it happens (~1-2s).
    if (this.state.isChunkFailure) {
      return (
        <div role="status" aria-live="polite" className="fixed inset-0 z-[2147483647] flex flex-col items-center justify-center gap-4 bg-background text-foreground p-6 text-center">
          <div className="h-9 w-9 rounded-full border-[3px] border-muted border-t-primary animate-spin" />
          <h1 className="text-base font-semibold">Updating M'mora to the latest version…</h1>
          <p className="text-xs text-muted-foreground max-w-sm">
            We're refreshing your app cache. This usually takes about a second.
          </p>
          <Button variant="outline" size="sm" onClick={this.handleHardRefresh} className="mt-2">
            Reload now
          </Button>
        </div>
      );
    }

    return (
      <div role="alert" className="min-h-screen bg-background text-foreground p-6">
        <main className="mx-auto flex w-full max-w-4xl flex-col gap-4">
          <header className="rounded-lg border border-destructive/40 bg-card/50 backdrop-blur">
            <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <h1 className="font-mono text-sm tracking-widest text-destructive">
                  SYSTEM FAILURE
                </h1>
                <p className="font-mono text-xs text-muted-foreground">
                  ZOE CONNECTION LOST. {isVR && "Redirecting to Lite 2D Map..."}
                  {this.state.autoRetryIn > 0 && ` Auto-recovering in ${this.state.autoRetryIn}s…`}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {isVR && (
                  <Button variant="default" onClick={this.handleGoToLiteMap}>
                    Go to Lite Map
                  </Button>
                )}
                <Button variant="default" onClick={this.handleGoHome}>
                  Go home
                </Button>
                <Button variant="outline" onClick={this.handleReload}>
                  Reload
                </Button>
                <Button variant="secondary" onClick={this.handleHardRefresh}>
                  Hard refresh
                </Button>
                <Button variant="destructive" onClick={this.handleClearLogs}>
                  Clear logs
                </Button>
              </div>
            </div>
          </header>

          <section className="rounded-lg border border-border bg-card/30 p-4 backdrop-blur">
            <p className="font-mono text-sm text-destructive">
              CRITICAL ERROR: {error?.message || "Unknown error"}
            </p>

            {(error?.stack || this.state.componentStack) && (
              <div className="mt-4 grid gap-3">
                {error?.stack && (
                  <article>
                    <h2 className="mb-2 font-mono text-xs text-muted-foreground">
                      Stack
                    </h2>
                    <pre className="max-h-[40vh] overflow-auto rounded-md border border-border bg-background/60 p-3 font-mono text-xs text-foreground/90">
                      {error.stack}
                    </pre>
                  </article>
                )}

                {this.state.componentStack && (
                  <article>
                    <h2 className="mb-2 font-mono text-xs text-muted-foreground">
                      Component trace
                    </h2>
                    <pre className="max-h-[30vh] overflow-auto rounded-md border border-border bg-background/60 p-3 font-mono text-xs text-foreground/90">
                      {this.state.componentStack}
                    </pre>
                  </article>
                )}
              </div>
            )}
          </section>

          {recent.length > 0 && (
            <aside className="rounded-lg border border-border bg-card/20 p-4 backdrop-blur">
              <h2 className="mb-3 font-mono text-xs text-muted-foreground">
                Recent error logs
              </h2>
              <div className="grid gap-2">
                {recent.map((e) => (
                  <div
                    key={e.id}
                    className="rounded-md border border-border bg-background/50 p-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono text-xs text-foreground">
                        {e.errorType}
                      </span>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {new Date(e.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-1 font-mono text-xs text-muted-foreground">
                      {e.message}
                    </p>
                  </div>
                ))}
              </div>
            </aside>
          )}

          {/* Zoe Sentry Status */}
          <aside className="rounded-lg border border-primary/30 bg-primary/5 p-4 backdrop-blur">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="font-mono text-xs text-primary">
                ZOE SENTRY ACTIVE - Crash logged & admin notified
              </span>
            </div>
          </aside>
        </main>
      </div>
    );
  }
}

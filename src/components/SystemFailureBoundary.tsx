import React from "react";
import { Button } from "@/components/ui/button";
import { errorLogger } from "@/utils/errorBoundaryLogger";
import { forceAppRefresh } from "@/lib/versionCheck";
import { supabase } from "@/integrations/supabase/client";

type State = {
  hasError: boolean;
  error: Error | null;
  componentStack?: string;
  isChunkFailure: boolean;
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

    // Cross-user alerts go through a rate-limited, server-authorised channel.
    await supabase.rpc('notify_admins_of_failure', {
      p_type: 'zoe_sentry',
      p_title: '🚨 Zoe Sentry Alert: CRITICAL',
      p_context: {
        message: `Alert: User @${crashedUsername} just crashed on the ${screenName}. Error: ${error.message.substring(0, 100)}`,
        crashed_user_id: user?.id ?? null,
        crashed_username: crashedUsername,
        screen_name: screenName,
        severity: 'critical',
        timestamp: new Date().toISOString(),
      },
    });
    console.log('[ZoeMonitor] Admin notified via Zoe Whisper');

  } catch (e) {
    console.error('[ZoeMonitor] Failed to notify admin:', e);
  }
};

// Auto-heal VR crashes
// ─── Error Boundary Component ─────────────────────────────────────────────────

export default class SystemFailureBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  state: State = { hasError: false, error: null, isChunkFailure: false };

  static getDerivedStateFromError(error: Error): Partial<State> {
    const msg = String(error?.message || '').toLowerCase();
    const isChunkFailure =
      msg.includes('importing a module script failed') ||
      msg.includes('failed to fetch dynamically imported module') ||
      msg.includes('chunkloaderror');
    return { hasError: true, error, isChunkFailure };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
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
    
    // Never redirect or reload after a crash. The failure screen remains stable
    // until the user explicitly chooses a destination or recovery action.
  }

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

    // Friendly stable UI for chunk-import failures. Never reload automatically:
    // the user chooses if and when to retry or refresh.
    if (this.state.isChunkFailure) {
      return (
        <div role="status" aria-live="polite" className="fixed inset-0 z-[2147483647] flex flex-col items-center justify-center gap-4 bg-background text-foreground p-6 text-center">
          <div className="h-9 w-9 rounded-full border-[3px] border-muted border-t-primary animate-spin" />
          <h1 className="text-base font-semibold">A module could not load</h1>
          <p className="text-xs text-muted-foreground max-w-sm">
            M'mora will stay on this screen without reloading automatically.
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
                  MODULE ISOLATED. {isVR && "You can continue in the Lite 2D Map."}
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

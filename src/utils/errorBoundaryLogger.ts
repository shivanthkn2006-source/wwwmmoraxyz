/**
 * Centralized Error Logging and Recovery System
 */

export interface ErrorLog {
  id: string;
  timestamp: Date;
  errorType: string;
  message: string;
  stack?: string;
  componentStack?: string;
  userAgent: string;
  url: string;
  userId?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

class ErrorLogger {
  private errors: ErrorLog[] = [];
  private maxErrors = 100;
  private listeners: ((error: ErrorLog) => void)[] = [];
  private recentErrors: Map<string, number> = new Map();
  private readonly DEBOUNCE_WINDOW = 5000; // 5 seconds

  constructor() {
    this.initializeGlobalHandlers();
    this.startCleanupTask();
  }

  private initializeGlobalHandlers() {
    // Catch unhandled errors
    window.addEventListener('error', (event) => {
      // Filter out known non-critical errors
      if (this.shouldIgnoreError(event.message)) {
        return;
      }
      
      this.log({
        errorType: 'UnhandledError',
        message: event.message,
        stack: event.error?.stack,
        severity: 'high',
      });
    });

    // Catch unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      // Filter out aborted fetch requests and known issues
      const reason = event.reason?.message || String(event.reason);
      if (this.shouldIgnoreError(reason)) {
        return;
      }
      
      this.log({
        errorType: 'UnhandledPromiseRejection',
        message: reason,
        stack: event.reason?.stack,
        severity: 'medium',
      });
    });
  }

  private shouldIgnoreError(message: string): boolean {
    const ignoredPatterns = [
      'aborted', // Aborted fetch requests
      'AuthSessionMissingError', // Known non-critical auth warning
      'ResizeObserver loop', // Common benign warning
      'Non-Error promise rejection', // Often non-critical
    ];
    
    return ignoredPatterns.some(pattern => 
      message.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  private startCleanupTask() {
    // Cleanup old errors every 5 minutes
    setInterval(() => {
      this.recentErrors.clear();
      
      // Remove errors older than 1 hour from memory
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      this.errors = this.errors.filter(
        error => new Date(error.timestamp).getTime() > oneHourAgo
      );
    }, 5 * 60 * 1000);
  }

  log(error: Omit<ErrorLog, 'id' | 'timestamp' | 'userAgent' | 'url'>) {
    // Debounce identical errors
    const errorKey = `${error.errorType}:${error.message}`;
    const lastTime = this.recentErrors.get(errorKey);
    const now = Date.now();
    
    if (lastTime && now - lastTime < this.DEBOUNCE_WINDOW) {
      // Skip duplicate error within debounce window
      return;
    }
    
    this.recentErrors.set(errorKey, now);
    
    const errorLog: ErrorLog = {
      id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      ...error,
    };

    // Add to errors array
    this.errors.push(errorLog);
    
    // Keep only last maxErrors
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors);
    }

    // Log to console in development
    if (import.meta.env.DEV) {
      console.error('[ErrorLogger]', errorLog);
    }

    // Notify listeners
    this.listeners.forEach(listener => {
      try {
        listener(errorLog);
      } catch (e) {
        console.warn('Error in error listener:', e);
      }
    });

    // Store in localStorage for persistence
    try {
      const storedErrors = this.getStoredErrors();
      storedErrors.push(errorLog);
      localStorage.setItem('platform_error_logs', JSON.stringify(storedErrors.slice(-50)));
    } catch (e) {
      // Ignore localStorage errors (quota exceeded, etc.)
    }
  }

  getErrors(): ErrorLog[] {
    return [...this.errors];
  }

  getStoredErrors(): ErrorLog[] {
    try {
      const stored = localStorage.getItem('platform_error_logs');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  clearErrors() {
    this.errors = [];
    try {
      localStorage.removeItem('platform_error_logs');
    } catch {
      // Ignore
    }
  }

  onError(listener: (error: ErrorLog) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  getCriticalErrors(): ErrorLog[] {
    return this.errors.filter(e => e.severity === 'critical');
  }

  getErrorStats() {
    const byType: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    
    this.errors.forEach(error => {
      byType[error.errorType] = (byType[error.errorType] || 0) + 1;
      bySeverity[error.severity] = (bySeverity[error.severity] || 0) + 1;
    });

    return {
      total: this.errors.length,
      byType,
      bySeverity,
      criticalCount: bySeverity.critical || 0,
    };
  }
}

// Singleton instance
export const errorLogger = new ErrorLogger();

// Convenience function
export const logError = (
  errorType: string,
  message: string,
  severity: ErrorLog['severity'] = 'medium',
  stack?: string
) => {
  errorLogger.log({ errorType, message, severity, stack });
};

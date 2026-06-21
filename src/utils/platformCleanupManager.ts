/**
 * Platform Cleanup Manager
 * Centralized cleanup utility for managing memory leaks, event listeners, and resources
 */

interface CleanupTask {
  id: string;
  type: 'interval' | 'timeout' | 'listener' | 'subscription' | 'custom';
  cleanup: () => void;
  createdAt: number;
}

class PlatformCleanupManager {
  private tasks: Map<string, CleanupTask> = new Map();
  private eventListenerCount = 0;
  private maxEventListeners = 100;
  private cleanupIntervalId: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Track event listeners globally
    this.patchEventListeners();
    
    // Periodic stale cleanup every 2 minutes
    this.cleanupIntervalId = setInterval(() => {
      this.cleanupStale();
    }, 2 * 60 * 1000);
  }

  /**
   * Patch addEventListener/removeEventListener to track counts
   */
  private patchEventListeners() {
    if (typeof window === 'undefined') return;
    
    const originalAdd = EventTarget.prototype.addEventListener;
    const originalRemove = EventTarget.prototype.removeEventListener;
    const self = this;

    EventTarget.prototype.addEventListener = function(...args) {
      self.eventListenerCount++;
      (window as any).__eventListenerCount = self.eventListenerCount;
      return originalAdd.apply(this, args);
    };

    EventTarget.prototype.removeEventListener = function(...args) {
      self.eventListenerCount = Math.max(0, self.eventListenerCount - 1);
      (window as any).__eventListenerCount = self.eventListenerCount;
      return originalRemove.apply(this, args);
    };
  }

  /**
   * Register an interval for cleanup tracking
   */
  registerInterval(id: string, intervalId: ReturnType<typeof setInterval>): void {
    this.tasks.set(id, {
      id,
      type: 'interval',
      cleanup: () => clearInterval(intervalId),
      createdAt: Date.now(),
    });
  }

  /**
   * Register a timeout for cleanup tracking
   */
  registerTimeout(id: string, timeoutId: ReturnType<typeof setTimeout>): void {
    this.tasks.set(id, {
      id,
      type: 'timeout',
      cleanup: () => clearTimeout(timeoutId),
      createdAt: Date.now(),
    });
  }

  /**
   * Register an event listener for cleanup tracking
   */
  registerListener(
    id: string, 
    target: EventTarget, 
    event: string, 
    handler: EventListener
  ): void {
    this.tasks.set(id, {
      id,
      type: 'listener',
      cleanup: () => target.removeEventListener(event, handler),
      createdAt: Date.now(),
    });
  }

  /**
   * Register a subscription for cleanup tracking
   */
  registerSubscription(id: string, unsubscribe: () => void): void {
    this.tasks.set(id, {
      id,
      type: 'subscription',
      cleanup: unsubscribe,
      createdAt: Date.now(),
    });
  }

  /**
   * Register a custom cleanup function
   */
  registerCustom(id: string, cleanup: () => void): void {
    this.tasks.set(id, {
      id,
      type: 'custom',
      cleanup,
      createdAt: Date.now(),
    });
  }

  /**
   * Cleanup a specific task by ID
   */
  cleanup(id: string): void {
    const task = this.tasks.get(id);
    if (task) {
      try {
        task.cleanup();
      } catch (e) {
        console.warn(`[CleanupManager] Failed to cleanup ${id}:`, e);
      }
      this.tasks.delete(id);
    }
  }

  /**
   * Cleanup all tasks
   */
  cleanupAll(): void {
    this.tasks.forEach((task) => {
      try {
        task.cleanup();
      } catch (e) {
        console.warn(`[CleanupManager] Failed to cleanup ${task.id}:`, e);
      }
    });
    this.tasks.clear();
  }

  /**
   * Cleanup stale tasks (older than 30 minutes)
   */
  cleanupStale(): void {
    const staleThreshold = 30 * 60 * 1000; // 30 minutes
    const now = Date.now();
    let cleanedCount = 0;

    this.tasks.forEach((task, id) => {
      if (now - task.createdAt > staleThreshold) {
        try {
          task.cleanup();
          this.tasks.delete(id);
          cleanedCount++;
        } catch (e) {
          // Ignore cleanup errors for stale tasks
        }
      }
    });

    if (cleanedCount > 0) {
      console.log(`[CleanupManager] Cleaned ${cleanedCount} stale tasks`);
    }
  }

  /**
   * Get current stats
   */
  getStats(): {
    taskCount: number;
    eventListenerCount: number;
    isHealthy: boolean;
  } {
    return {
      taskCount: this.tasks.size,
      eventListenerCount: this.eventListenerCount,
      isHealthy: this.eventListenerCount < this.maxEventListeners && this.tasks.size < 200,
    };
  }

  /**
   * Force memory cleanup
   */
  forceMemoryCleanup(): { cleaned: string[] } {
    const cleaned: string[] = [];

    // Clear old localStorage cache
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('-cache-') || key.includes('-temp-') || key.includes('-expired'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => {
        localStorage.removeItem(k);
        cleaned.push(`localStorage:${k}`);
      });
    } catch (e) {
      // Ignore storage errors
    }

    // Clear old sessionStorage errors
    try {
      const errorLog = sessionStorage.getItem('zoe-errors');
      if (errorLog) {
        const errors = JSON.parse(errorLog);
        if (errors.length > 20) {
          sessionStorage.setItem('zoe-errors', JSON.stringify(errors.slice(-10)));
          cleaned.push('sessionStorage:zoe-errors');
        }
      }
    } catch (e) {
      // Ignore
    }

    // Clear performance marks/measures
    try {
      if (performance.getEntriesByType('mark').length > 50) {
        performance.clearMarks();
        cleaned.push('performance:marks');
      }
      if (performance.getEntriesByType('measure').length > 50) {
        performance.clearMeasures();
        cleaned.push('performance:measures');
      }
    } catch (e) {
      // Ignore
    }

    return { cleaned };
  }

  /**
   * Destroy the manager
   */
  destroy(): void {
    this.cleanupAll();
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
    }
  }
}

// Singleton instance
export const cleanupManager = new PlatformCleanupManager();

/**
 * React hook helper for automatic cleanup registration
 */
export const createCleanupId = (prefix: string): string => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
};

export default cleanupManager;

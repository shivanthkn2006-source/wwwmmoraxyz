/**
 * Storage Cleanup Scheduler - Connects Cleanup Crew to Zoe Core
 * Provides intelligent scheduling based on usage patterns
 */

import { supabase } from '@/integrations/supabase/client';

const CLEANUP_SCHEDULE_KEY = 'zoe_cleanup_schedule';

interface CleanupSchedule {
  lastRun: string | null;
  nextRun: string;
  runCount: number;
  totalFreedMB: number;
  avgCleanupIntervalHours: number;
}

export class StorageCleanupScheduler {
  private schedule: CleanupSchedule;

  constructor() {
    this.schedule = this.loadSchedule();
  }

  private loadSchedule(): CleanupSchedule {
    try {
      const cached = localStorage.getItem(CLEANUP_SCHEDULE_KEY);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch {
      // Ignore
    }
    
    return {
      lastRun: null,
      nextRun: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
      runCount: 0,
      totalFreedMB: 0,
      avgCleanupIntervalHours: 24,
    };
  }

  private saveSchedule(): void {
    try {
      localStorage.setItem(CLEANUP_SCHEDULE_KEY, JSON.stringify(this.schedule));
    } catch {
      // Storage full, ironically
    }
  }

  public shouldRunNow(): boolean {
    if (!this.schedule.nextRun) return true;
    return new Date() >= new Date(this.schedule.nextRun);
  }

  public recordCleanup(freedMB: number): void {
    const now = new Date();
    
    // Calculate new average interval based on how much was freed
    // More data = more frequent cleanups needed
    let newIntervalHours = 24;
    if (freedMB > 100) {
      newIntervalHours = 6; // Aggressive cleanup needed
    } else if (freedMB > 50) {
      newIntervalHours = 12;
    } else if (freedMB > 10) {
      newIntervalHours = 24;
    } else {
      newIntervalHours = 48; // Low usage, can wait longer
    }

    this.schedule = {
      lastRun: now.toISOString(),
      nextRun: new Date(now.getTime() + newIntervalHours * 60 * 60 * 1000).toISOString(),
      runCount: this.schedule.runCount + 1,
      totalFreedMB: this.schedule.totalFreedMB + freedMB,
      avgCleanupIntervalHours: Math.round(
        (this.schedule.avgCleanupIntervalHours + newIntervalHours) / 2
      ),
    };

    this.saveSchedule();
  }

  public getSchedule(): CleanupSchedule {
    return { ...this.schedule };
  }
}

// Zoe Core connection - logs cleanup events for awareness
export async function logCleanupToZoeCore(
  cleanupResult: {
    deletedFiles: number;
    freedMB: number;
    storagePercentage: number;
    alertSent: boolean;
  }
): Promise<void> {
  try {
    const { data: session } = await supabase.auth.getSession();
    const userId = session?.session?.user?.id || '00000000-0000-0000-0000-000000000000';

    await supabase.from('behavioral_events').insert({
      user_id: userId,
      event_type: 'storage_cleanup_local',
      event_category: 'system_health',
      metadata: {
        deleted_files: cleanupResult.deletedFiles,
        freed_mb: cleanupResult.freedMB,
        storage_percentage: cleanupResult.storagePercentage,
        alert_sent: cleanupResult.alertSent,
        client_timestamp: new Date().toISOString(),
        protocol: 'cleanup_crew_v1',
      },
    });
  } catch (err) {
    console.error('[Cleanup Scheduler] Failed to log to Zoe Core:', err);
  }
}

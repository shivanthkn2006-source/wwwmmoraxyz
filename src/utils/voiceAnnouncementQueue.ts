// Global voice announcement queue with deduplication
// Prevents duplicate announcements across components and page refreshes

interface QueuedAnnouncement {
  key: string;
  timestamp: number;
  announced: boolean;
}

class VoiceAnnouncementQueue {
  private announcements: Map<string, QueuedAnnouncement> = new Map();
  private sessionKey: string;
  private readonly COOLDOWN_MS = 60000; // 1 minute cooldown per unique announcement
  private readonly SESSION_STORAGE_KEY = 'voice_announcements_session';
  private readonly MAX_CACHE_SIZE = 100;

  constructor() {
    // Create or retrieve session key to prevent duplicates on refresh
    const stored = sessionStorage.getItem(this.SESSION_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        this.sessionKey = parsed.sessionKey;
        // Restore recent announcements from session
        if (parsed.announcements) {
          const now = Date.now();
          parsed.announcements.forEach((item: QueuedAnnouncement) => {
            // Only restore announcements from the last minute
            if (now - item.timestamp < this.COOLDOWN_MS) {
              this.announcements.set(item.key, item);
            }
          });
        }
      } catch (e) {
        this.sessionKey = `session_${Date.now()}_${Math.random()}`;
      }
    } else {
      this.sessionKey = `session_${Date.now()}_${Math.random()}`;
    }
    this.saveToSession();
  }

  private saveToSession() {
    const data = {
      sessionKey: this.sessionKey,
      announcements: Array.from(this.announcements.values()),
    };
    sessionStorage.setItem(this.SESSION_STORAGE_KEY, JSON.stringify(data));
  }

  // Check if announcement should be made
  shouldAnnounce(notificationId: string, content: string): boolean {
    // Create a unique key from notification ID and content hash
    const contentHash = this.simpleHash(content);
    const key = `${notificationId}_${contentHash}`;

    const now = Date.now();
    const existing = this.announcements.get(key);

    // If announcement was made recently, skip it
    if (existing && (now - existing.timestamp < this.COOLDOWN_MS)) {
      console.log('[VoiceQueue] Skipping duplicate announcement:', key, 'Last announced:', new Date(existing.timestamp).toISOString());
      return false;
    }

    // Mark as announced
    this.announcements.set(key, {
      key,
      timestamp: now,
      announced: true,
    });

    // Clean up old entries
    this.cleanup();
    this.saveToSession();

    console.log('[VoiceQueue] Allowing announcement:', key);
    return true;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private cleanup() {
    const now = Date.now();
    const entries = Array.from(this.announcements.entries());

    // Remove entries older than cooldown
    entries.forEach(([key, value]) => {
      if (now - value.timestamp > this.COOLDOWN_MS) {
        this.announcements.delete(key);
      }
    });

    // If still too many, keep only the most recent ones
    if (this.announcements.size > this.MAX_CACHE_SIZE) {
      const sorted = Array.from(this.announcements.entries())
        .sort((a, b) => b[1].timestamp - a[1].timestamp);
      
      this.announcements.clear();
      sorted.slice(0, this.MAX_CACHE_SIZE).forEach(([key, value]) => {
        this.announcements.set(key, value);
      });
    }
  }

  // Clear all announcements (useful for testing or reset)
  clear() {
    this.announcements.clear();
    sessionStorage.removeItem(this.SESSION_STORAGE_KEY);
  }
}

// Export singleton instance
export const voiceQueue = new VoiceAnnouncementQueue();

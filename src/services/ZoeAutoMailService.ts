/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ZOE AUTO MAIL SERVICE
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Background service that generates and sends realistic mail between test users.
 * Runs on intervals to simulate real email activity.
 * 
 * Test Users:
 * - Moksh50: d6f2dcd8-5c16-425a-b74d-60546d1a25ae
 * - Shivanth_KN: 52c863dd-01ba-4a29-87a6-e1a0b7976751
 */

import { supabase } from '@/integrations/supabase/client';

// Test user IDs
const TEST_USERS = {
  MOKSH50: 'd6f2dcd8-5c16-425a-b74d-60546d1a25ae',
  SHIVANTH_KN: '52c863dd-01ba-4a29-87a6-e1a0b7976751',
};

interface AutoMailConfig {
  enabled: boolean;
  intervalMs: number; // Time between auto-generated mails
  maxMailsPerSession: number;
}

class ZoeAutoMailService {
  private static instance: ZoeAutoMailService;
  private config: AutoMailConfig = {
    enabled: false,
    intervalMs: 60000, // 1 minute default
    maxMailsPerSession: 10,
  };
  private intervalId: NodeJS.Timeout | null = null;
  private mailsSentThisSession = 0;
  private isRunning = false;

  private constructor() {
    console.log('[ZoeAutoMail] Service initialized');
  }

  public static getInstance(): ZoeAutoMailService {
    if (!ZoeAutoMailService.instance) {
      ZoeAutoMailService.instance = new ZoeAutoMailService();
    }
    return ZoeAutoMailService.instance;
  }

  /**
   * Start the auto mail generator
   */
  public start(config?: Partial<AutoMailConfig>): void {
    if (this.isRunning) {
      console.log('[ZoeAutoMail] Already running');
      return;
    }

    this.config = { ...this.config, ...config, enabled: true };
    this.isRunning = true;
    this.mailsSentThisSession = 0;

    console.log(`[ZoeAutoMail] Starting with interval: ${this.config.intervalMs}ms`);

    // Send first mail immediately
    this.generateAndSendMail();

    // Set up interval
    this.intervalId = setInterval(() => {
      if (this.mailsSentThisSession < this.config.maxMailsPerSession) {
        this.generateAndSendMail();
      } else {
        console.log('[ZoeAutoMail] Max mails reached for session, stopping');
        this.stop();
      }
    }, this.config.intervalMs);
  }

  /**
   * Stop the auto mail generator
   */
  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    this.config.enabled = false;
    console.log('[ZoeAutoMail] Stopped');
  }

  /**
   * Generate and send a single mail between test users
   */
  public async generateAndSendMail(direction?: 'moksh_to_shivanth' | 'shivanth_to_moksh'): Promise<boolean> {
    try {
      // Check auth before calling edge function
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.warn('[ZoeAutoMail] No active session - skipping mail generation');
        return false;
      }

      // Alternate direction or use provided
      const actualDirection = direction || (this.mailsSentThisSession % 2 === 0 
        ? 'shivanth_to_moksh' 
        : 'moksh_to_shivanth');

      const senderId = actualDirection === 'shivanth_to_moksh' 
        ? TEST_USERS.SHIVANTH_KN 
        : TEST_USERS.MOKSH50;
      const recipientId = actualDirection === 'shivanth_to_moksh' 
        ? TEST_USERS.MOKSH50 
        : TEST_USERS.SHIVANTH_KN;

      console.log(`[ZoeAutoMail] Generating mail: ${actualDirection}`);

      const { data, error } = await supabase.functions.invoke('zoe-auto-mail-generator', {
        body: {
          senderId,
          recipientId,
        },
      });

      if (error) {
        console.error('[ZoeAutoMail] Generation error:', error);
        return false;
      }

      console.log('[ZoeAutoMail] Mail sent:', data);
      this.mailsSentThisSession++;
      return true;

    } catch (error) {
      console.error('[ZoeAutoMail] Error:', error);
      return false;
    }
  }

  /**
   * Send a custom mail between test users
   */
  public async sendCustomMail(params: {
    from: 'moksh50' | 'shivanth_kn';
    subject: string;
    body: string;
    category?: string;
    priority?: string;
  }): Promise<boolean> {
    try {
      // Check auth before calling edge function
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.warn('[ZoeAutoMail] No active session - skipping custom mail');
        return false;
      }

      const senderId = params.from === 'shivanth_kn' ? TEST_USERS.SHIVANTH_KN : TEST_USERS.MOKSH50;
      const recipientId = params.from === 'shivanth_kn' ? TEST_USERS.MOKSH50 : TEST_USERS.SHIVANTH_KN;

      const { data, error } = await supabase.functions.invoke('zoe-auto-mail-generator', {
        body: {
          senderId,
          recipientId,
          customSubject: params.subject,
          customBody: params.body,
          category: params.category,
          priority: params.priority,
        },
      });

      if (error) {
        console.error('[ZoeAutoMail] Custom mail error:', error);
        return false;
      }

      console.log('[ZoeAutoMail] Custom mail sent:', data);
      return true;

    } catch (error) {
      console.error('[ZoeAutoMail] Error:', error);
      return false;
    }
  }

  /**
   * Get service status
   */
  public getStatus() {
    return {
      isRunning: this.isRunning,
      mailsSentThisSession: this.mailsSentThisSession,
      config: this.config,
    };
  }

  /**
   * Trigger immediate mail send (for testing)
   */
  public async triggerImmediateMail(direction?: 'moksh_to_shivanth' | 'shivanth_to_moksh'): Promise<boolean> {
    console.log('[ZoeAutoMail] Triggering immediate mail send');
    return this.generateAndSendMail(direction);
  }
}

// Export singleton instance
export const zoeAutoMailService = ZoeAutoMailService.getInstance();

// Export for direct imports
export default ZoeAutoMailService;

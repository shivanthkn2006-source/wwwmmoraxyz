/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * NANO REFLEX PROTOCOL - Trigger-Based Tool Calling for Small LMs
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * THE PROBLEM: Gemini Nano is too small for complex function calling
 * THE FIX: Teach it "Trigger Words" that we catch and execute
 * 
 * ARCHITECTURE:
 * - Inject trigger instructions into Nano's system prompt
 * - Parse responses for [ACTION:*] tags
 * - Execute corresponding functions
 * - Remove tags from user-visible response
 * 
 * SUPPORTED ACTIONS:
 * - [ACTION:DRAW_GIFT] - Generate an image/art for emotional support
 * - [ACTION:PLAY_MUSIC] - Play calming/mood-matching music
 * - [ACTION:SHOW_MEMORY] - Surface a cherished memory
 * - [ACTION:MEDITATION] - Start a guided meditation
 * - [ACTION:BREATHING] - Start a breathing exercise
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══ TYPES ═══
export type NanoAction = 
  | 'DRAW_GIFT'
  | 'PLAY_MUSIC'
  | 'SHOW_MEMORY'
  | 'MEDITATION'
  | 'BREATHING'
  | 'SCHEDULE_REMINDER'
  | 'SEND_HUG'
  | 'SHARE_QUOTE';

export interface ParsedResponse {
  cleanText: string;
  actions: NanoAction[];
  parameters: Record<NanoAction, string | undefined>;
  rawResponse: string;
}

export interface ReflexHandler {
  action: NanoAction;
  execute: (params?: string) => Promise<void> | void;
  description: string;
}

// ═══ SYSTEM PROMPT ADDITION ═══
// This gets injected into Gemini Nano's system prompt
export const NANO_REFLEX_PROMPT = `
SPECIAL ACTIONS:
When you want to perform a special action, output EXACTLY one of these tags at the END of your message:
- [ACTION:DRAW_GIFT] - When user is sad or you want to give a visual gift
- [ACTION:PLAY_MUSIC] - When suggesting calming music would help
- [ACTION:SHOW_MEMORY] - When referencing a cherished memory
- [ACTION:MEDITATION] - When guiding into meditation
- [ACTION:BREATHING] - When starting a breathing exercise
- [ACTION:SEND_HUG] - When offering emotional comfort
- [ACTION:SHARE_QUOTE] - When sharing an inspiring quote

You may include a parameter after a colon: [ACTION:DRAW_GIFT:sunset over mountains]

These tags will be hidden from the user and trigger special features.
`;

// ═══ ACTION PATTERN MATCHER ═══
const ACTION_PATTERN = /\[ACTION:(\w+)(?::([^\]]+))?\]/g;

// ═══ NANO REFLEX PROTOCOL CLASS ═══
class NanoReflexProtocol {
  private handlers: Map<NanoAction, ReflexHandler> = new Map();

  constructor() {
    // Register default handlers
    this.registerDefaultHandlers();
  }

  /**
   * Register default action handlers
   */
  private registerDefaultHandlers(): void {
    // Draw Gift - Generate art when user is sad
    this.registerHandler({
      action: 'DRAW_GIFT',
      description: 'Generate an image to comfort or delight the user',
      execute: async (params) => {
        console.log('[NanoReflex] 🎨 DRAW_GIFT triggered:', params || 'emotional support art');
        // This will be wired up to the artifact generator
        window.dispatchEvent(new CustomEvent('nano-reflex-action', {
          detail: { action: 'DRAW_GIFT', params: params || 'a comforting, beautiful scene' }
        }));
      }
    });

    // Play Music
    this.registerHandler({
      action: 'PLAY_MUSIC',
      description: 'Play calming or mood-matching music',
      execute: async (params) => {
        console.log('[NanoReflex] 🎵 PLAY_MUSIC triggered:', params || 'calming music');
        window.dispatchEvent(new CustomEvent('nano-reflex-action', {
          detail: { action: 'PLAY_MUSIC', params }
        }));
      }
    });

    // Show Memory
    this.registerHandler({
      action: 'SHOW_MEMORY',
      description: 'Surface a cherished memory from the user\'s history',
      execute: async (params) => {
        console.log('[NanoReflex] 💭 SHOW_MEMORY triggered:', params);
        window.dispatchEvent(new CustomEvent('nano-reflex-action', {
          detail: { action: 'SHOW_MEMORY', params }
        }));
      }
    });

    // Meditation
    this.registerHandler({
      action: 'MEDITATION',
      description: 'Start a guided meditation session',
      execute: async (params) => {
        console.log('[NanoReflex] 🧘 MEDITATION triggered:', params || 'general calm');
        window.dispatchEvent(new CustomEvent('nano-reflex-action', {
          detail: { action: 'MEDITATION', params }
        }));
      }
    });

    // Breathing Exercise
    this.registerHandler({
      action: 'BREATHING',
      description: 'Start a breathing exercise',
      execute: async (params) => {
        console.log('[NanoReflex] 🌬️ BREATHING triggered:', params || '4-7-8 technique');
        window.dispatchEvent(new CustomEvent('nano-reflex-action', {
          detail: { action: 'BREATHING', params }
        }));
      }
    });

    // Send Hug (visual/haptic feedback)
    this.registerHandler({
      action: 'SEND_HUG',
      description: 'Send a virtual hug with visual feedback',
      execute: async () => {
        console.log('[NanoReflex] 🤗 SEND_HUG triggered');
        window.dispatchEvent(new CustomEvent('nano-reflex-action', {
          detail: { action: 'SEND_HUG' }
        }));
      }
    });

    // Share Quote
    this.registerHandler({
      action: 'SHARE_QUOTE',
      description: 'Share an inspiring quote',
      execute: async (params) => {
        console.log('[NanoReflex] 💬 SHARE_QUOTE triggered:', params);
        window.dispatchEvent(new CustomEvent('nano-reflex-action', {
          detail: { action: 'SHARE_QUOTE', params }
        }));
      }
    });

    // Schedule Reminder
    this.registerHandler({
      action: 'SCHEDULE_REMINDER',
      description: 'Schedule a reminder for the user',
      execute: async (params) => {
        console.log('[NanoReflex] ⏰ SCHEDULE_REMINDER triggered:', params);
        window.dispatchEvent(new CustomEvent('nano-reflex-action', {
          detail: { action: 'SCHEDULE_REMINDER', params }
        }));
      }
    });
  }

  /**
   * Register a custom action handler
   */
  registerHandler(handler: ReflexHandler): void {
    this.handlers.set(handler.action, handler);
    console.log(`[NanoReflex] Registered handler: ${handler.action}`);
  }

  /**
   * Parse a Gemini Nano response for action tags
   */
  parseResponse(response: string): ParsedResponse {
    const actions: NanoAction[] = [];
    const parameters: Record<string, string | undefined> = {};
    
    // Find all action tags
    let match;
    while ((match = ACTION_PATTERN.exec(response)) !== null) {
      const action = match[1] as NanoAction;
      const param = match[2];
      
      if (this.handlers.has(action)) {
        actions.push(action);
        parameters[action] = param;
      }
    }

    // Remove action tags from visible text
    const cleanText = response
      .replace(ACTION_PATTERN, '')
      .replace(/\s+/g, ' ')
      .trim();

    return {
      cleanText,
      actions,
      parameters: parameters as Record<NanoAction, string | undefined>,
      rawResponse: response,
    };
  }

  /**
   * Execute all detected actions
   */
  async executeActions(parsed: ParsedResponse): Promise<void> {
    for (const action of parsed.actions) {
      const handler = this.handlers.get(action);
      if (handler) {
        try {
          await handler.execute(parsed.parameters[action]);
        } catch (error) {
          console.error(`[NanoReflex] Action ${action} failed:`, error);
        }
      }
    }
  }

  /**
   * Process a Gemini Nano response: parse, execute actions, return clean text
   */
  async processResponse(response: string): Promise<string> {
    const parsed = this.parseResponse(response);
    
    if (parsed.actions.length > 0) {
      console.log(`[NanoReflex] 🎯 Detected ${parsed.actions.length} actions:`, parsed.actions);
      await this.executeActions(parsed);
    }

    return parsed.cleanText;
  }

  /**
   * Get the system prompt addition for Nano
   */
  getSystemPromptAddition(): string {
    return NANO_REFLEX_PROMPT;
  }

  /**
   * Get list of available actions
   */
  getAvailableActions(): Array<{ action: NanoAction; description: string }> {
    return Array.from(this.handlers.entries()).map(([action, handler]) => ({
      action,
      description: handler.description,
    }));
  }
}

// ═══ SINGLETON INSTANCE ═══
let reflexInstance: NanoReflexProtocol | null = null;

export function getNanoReflexProtocol(): NanoReflexProtocol {
  if (!reflexInstance) {
    reflexInstance = new NanoReflexProtocol();
  }
  return reflexInstance;
}

// ═══ CONVENIENCE FUNCTIONS ═══

/**
 * Process Gemini Nano response through the reflex protocol
 */
export async function processNanoResponse(response: string): Promise<string> {
  return getNanoReflexProtocol().processResponse(response);
}

/**
 * Get the reflex prompt to add to Nano's system prompt
 */
export function getNanoReflexPrompt(): string {
  return NANO_REFLEX_PROMPT;
}

/**
 * Register a custom reflex handler
 */
export function registerNanoReflex(handler: ReflexHandler): void {
  getNanoReflexProtocol().registerHandler(handler);
}

/**
 * Check if response contains any action tags
 */
export function hasNanoActions(response: string): boolean {
  return ACTION_PATTERN.test(response);
}

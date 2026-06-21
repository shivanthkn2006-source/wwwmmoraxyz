// Offline cache for Zoe AI - provides basic responses without internet
// Now integrated with zoeOfflineIntelligence for enhanced capabilities

import { processOfflineCommand, isOffline, getOfflineStatusMessage } from './zoeOfflineIntelligence';

export interface CachedResponse {
  command: string;
  response: string;
  category: string;
  action?: string;
  actionData?: any;
}

export const defaultOfflineResponses: CachedResponse[] = [
  // Greetings
  { command: 'hi zoe', response: 'Hello! I\'m here to help, even in offline mode.', category: 'greeting' },
  { command: 'hey zoe', response: 'Hi there! Running locally but fully functional for basic commands.', category: 'greeting' },
  { command: 'hello zoe', response: 'Hello! What can I help you with?', category: 'greeting' },
  
  // Navigation
  { command: 'go home', response: 'Opening home page', category: 'navigation', action: 'navigate', actionData: { route: '/home' } },
  { command: 'open home', response: 'Navigating to home', category: 'navigation', action: 'navigate', actionData: { route: '/home' } },
  { command: 'go to chat', response: 'Opening chat', category: 'navigation', action: 'navigate', actionData: { route: '/chat' } },
  { command: 'open chat', response: 'Navigating to chat', category: 'navigation', action: 'navigate', actionData: { route: '/chat' } },
  { command: 'go to profile', response: 'Opening your profile', category: 'navigation', action: 'navigate', actionData: { route: '/profile' } },
  { command: 'open profile', response: 'Navigating to profile', category: 'navigation', action: 'navigate', actionData: { route: '/profile' } },
  { command: 'open camera', response: 'Opening camera', category: 'navigation', action: 'navigate', actionData: { route: '/camera' } },
  { command: 'go to huddle', response: 'Opening huddle', category: 'navigation', action: 'navigate', actionData: { route: '/huddle' } },
  { command: 'open huddle', response: 'Navigating to huddle', category: 'navigation', action: 'navigate', actionData: { route: '/huddle' } },
  { command: 'open webdrop', response: 'Opening webdrop', category: 'navigation', action: 'navigate', actionData: { route: '/webdrop' } },
  { command: 'open timeline', response: 'Opening timeline', category: 'navigation', action: 'navigate', actionData: { route: '/universal-timeline' } },
  
  // Status commands
  { command: 'set status to available', response: 'Setting your status to available', category: 'status', action: 'set-status', actionData: { status: 'available' } },
  { command: 'set status to busy', response: 'Setting your status to busy', category: 'status', action: 'set-status', actionData: { status: 'busy' } },
  { command: 'set status to away', response: 'Setting your status to away', category: 'status', action: 'set-status', actionData: { status: 'away' } },
  { command: 'set status to do not disturb', response: 'Setting your status to do not disturb', category: 'status', action: 'set-status', actionData: { status: 'dnd' } },
  
  // Voice control
  { command: 'stop speaking', response: 'Stopping...', category: 'voice', action: 'stop-speech' },
  { command: 'be quiet', response: 'Going silent.', category: 'voice', action: 'stop-speech' },
  { command: 'repeat', response: 'Repeating...', category: 'voice', action: 'repeat-last' },
  
  // Time queries
  { command: 'what time is it', response: '', category: 'time', action: 'tell-time' },
  { command: 'what day is it', response: '', category: 'time', action: 'tell-date' },
  
  // Help
  { command: 'help', response: 'I can help you navigate the app, manage your status, check time, control voice settings, and more. Try saying "go to home", "what time is it", or "tell me a joke".', category: 'help' },
  { command: 'what can you do', response: 'In offline mode, I can navigate pages, update your status, tell time, share jokes and facts, flip coins, roll dice, and provide emotional support. For AI-powered features, you\'ll need to be online.', category: 'help' },
  { command: 'who are you', response: 'I\'m Zoe, your AI companion. Even offline, I\'m here to help with navigation, basic tasks, and to keep you company!', category: 'help' },
  
  // Fun
  { command: 'tell me a joke', response: '', category: 'fun', action: 'tell-joke' },
  { command: 'tell me a fact', response: '', category: 'fun', action: 'tell-fact' },
  { command: 'inspire me', response: '', category: 'fun', action: 'tell-quote' },
  { command: 'flip a coin', response: '', category: 'fun', action: 'coin-flip' },
  { command: 'roll a dice', response: '', category: 'fun', action: 'roll-dice' },
  
  // Emotional support
  { command: 'i am happy', response: 'That\'s wonderful! Your happiness means a lot to me.', category: 'emotional' },
  { command: 'i am sad', response: 'I\'m sorry you\'re feeling down. Remember, it\'s okay to feel this way. I\'m here for you.', category: 'emotional' },
  { command: 'thank you', response: 'You\'re welcome! Always happy to help.', category: 'emotional' },
  
  // System
  { command: 'offline mode', response: 'Offline mode is active. Running locally with essential features.', category: 'system' },
  { command: 'refresh', response: 'Refreshing the page...', category: 'system', action: 'refresh-page' },
  { command: 'dark mode', response: 'Switching to dark mode.', category: 'system', action: 'set-theme', actionData: { theme: 'dark' } },
  { command: 'light mode', response: 'Switching to light mode.', category: 'system', action: 'set-theme', actionData: { theme: 'light' } },
];

export class ZoeOfflineCache {
  private static readonly CACHE_KEY = 'zoe_offline_cache';
  private static readonly CUSTOM_RESPONSES_KEY = 'zoe_custom_offline_responses';
  private static readonly USER_PREFERENCES_KEY = 'zoe_offline_preferences';

  static getCache(): CachedResponse[] {
    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      return cached ? JSON.parse(cached) : defaultOfflineResponses;
    } catch (error) {
      console.error('Error reading offline cache:', error);
      return defaultOfflineResponses;
    }
  }

  static updateCache(responses: CachedResponse[]) {
    try {
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(responses));
    } catch (error) {
      console.error('Error updating offline cache:', error);
    }
  }

  static findResponse(command: string): CachedResponse | null {
    const cache = this.getCache();
    const normalizedCommand = command.toLowerCase().trim();
    
    // Exact match first
    const exactMatch = cache.find(
      r => r.command.toLowerCase() === normalizedCommand
    );
    if (exactMatch) return exactMatch;
    
    // Partial match
    const partialMatch = cache.find(
      r => normalizedCommand.includes(r.command.toLowerCase()) ||
           r.command.toLowerCase().includes(normalizedCommand)
    );
    if (partialMatch) return partialMatch;
    
    return null;
  }

  // Use the enhanced offline intelligence for processing
  static processWithIntelligence(command: string): { text: string; action?: string; actionData?: any } {
    const result = processOfflineCommand(command);
    return {
      text: result.text,
      action: result.action,
      actionData: result.actionData,
    };
  }

  static addCustomResponse(command: string, response: string, category: string = 'custom', action?: string, actionData?: any) {
    const cache = this.getCache();
    cache.push({ command: command.toLowerCase(), response, category, action, actionData });
    this.updateCache(cache);
  }

  static removeResponse(command: string) {
    const cache = this.getCache();
    const filtered = cache.filter(r => r.command.toLowerCase() !== command.toLowerCase());
    this.updateCache(filtered);
  }

  static resetToDefaults() {
    this.updateCache(defaultOfflineResponses);
  }

  static isOffline(): boolean {
    return isOffline();
  }

  static getOfflineMessage(): string {
    return getOfflineStatusMessage();
  }

  // User preferences for offline behavior
  static savePreference(key: string, value: any) {
    try {
      const prefs = JSON.parse(localStorage.getItem(this.USER_PREFERENCES_KEY) || '{}');
      prefs[key] = value;
      localStorage.setItem(this.USER_PREFERENCES_KEY, JSON.stringify(prefs));
    } catch (error) {
      console.error('Error saving preference:', error);
    }
  }

  static getPreference(key: string, defaultValue: any = null): any {
    try {
      const prefs = JSON.parse(localStorage.getItem(this.USER_PREFERENCES_KEY) || '{}');
      return prefs[key] ?? defaultValue;
    } catch {
      return defaultValue;
    }
  }
}

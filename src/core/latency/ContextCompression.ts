// ═══════════════════════════════════════════════════════════════════════════════
// CONTEXT COMPRESSION - Netflix "Clean Room" Protocol
// Reduces code complexity for better performance on low-resource devices
// Separates "Essential" from "Accidental" complexity
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * CLEAN ROOM PROTOCOL:
 * 
 * Essential Complexity: The 3D Globe, Career Calculations, Quantum Processing
 * Accidental Complexity: Multiple audio handlers, redundant state management
 * 
 * This module compresses context before sending to AI, reducing:
 * - Token count (saves money)
 * - Processing time (faster responses)
 * - Memory usage (prevents crashes)
 */

export interface CompressedContext {
  // User identity (minimal)
  userId: string;
  username?: string;
  tier?: number;
  
  // Current state (essential)
  currentPage: string;
  currentIntent?: string;
  
  // Compressed history (last 5 interactions only)
  recentHistory: CompressedHistoryItem[];
  
  // Compressed preferences (flattened)
  preferences: Record<string, string | number | boolean>;
  
  // Session metrics
  sessionDuration: number;
  interactionCount: number;
  
  // Compression metadata
  compressionRatio: number;
  originalSize: number;
  compressedSize: number;
}

export interface CompressedHistoryItem {
  role: 'user' | 'assistant';
  summary: string; // Max 100 chars
  timestamp: number;
  category?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTEXT COMPRESSOR - Main Class
// ═══════════════════════════════════════════════════════════════════════════════

export class ContextCompressor {
  private static instance: ContextCompressor;
  
  // Configuration
  private maxHistoryItems = 5;
  private maxSummaryLength = 100;
  private maxPreferenceKeys = 20;
  
  static getInstance(): ContextCompressor {
    if (!ContextCompressor.instance) {
      ContextCompressor.instance = new ContextCompressor();
    }
    return ContextCompressor.instance;
  }
  
  /**
   * Compress full context into minimal representation
   */
  compress(fullContext: FullContext): CompressedContext {
    const originalSize = JSON.stringify(fullContext).length;
    
    const compressed: CompressedContext = {
      // User identity (keep minimal)
      userId: fullContext.userId,
      username: fullContext.username,
      tier: fullContext.tier || 1,
      
      // Current state
      currentPage: fullContext.currentPage,
      currentIntent: this.extractIntent(fullContext.lastMessage),
      
      // Compress history
      recentHistory: this.compressHistory(fullContext.conversationHistory),
      
      // Flatten preferences
      preferences: this.flattenPreferences(fullContext.preferences),
      
      // Session metrics
      sessionDuration: fullContext.sessionDuration || 0,
      interactionCount: fullContext.interactionCount || 0,
      
      // Compression metadata
      compressionRatio: 0,
      originalSize,
      compressedSize: 0,
    };
    
    compressed.compressedSize = JSON.stringify(compressed).length;
    compressed.compressionRatio = originalSize > 0 
      ? Math.round((1 - compressed.compressedSize / originalSize) * 100) 
      : 0;
    
    console.log(`[ContextCompressor] Compressed ${originalSize} → ${compressed.compressedSize} bytes (${compressed.compressionRatio}% reduction)`);
    
    return compressed;
  }
  
  /**
   * Extract intent from message
   */
  private extractIntent(message?: string): string | undefined {
    if (!message) return undefined;
    
    const lowerMessage = message.toLowerCase();
    
    // Navigation intent
    if (/go to|open|show|navigate/.test(lowerMessage)) return 'navigate';
    
    // Search intent
    if (/find|search|look for|where/.test(lowerMessage)) return 'search';
    
    // Creation intent
    if (/create|make|generate|build/.test(lowerMessage)) return 'create';
    
    // Question intent
    if (/what|why|how|when|who|explain/.test(lowerMessage)) return 'question';
    
    // Action intent
    if (/do|execute|run|start|stop/.test(lowerMessage)) return 'action';
    
    return 'general';
  }
  
  /**
   * Compress conversation history to last N items with summaries
   */
  private compressHistory(history?: ConversationItem[]): CompressedHistoryItem[] {
    if (!history || history.length === 0) return [];
    
    // Take last N items
    const recent = history.slice(-this.maxHistoryItems);
    
    return recent.map(item => ({
      role: item.role,
      summary: this.summarize(item.content, this.maxSummaryLength),
      timestamp: item.timestamp || Date.now(),
      category: item.category,
    }));
  }
  
  /**
   * Summarize text to max length
   */
  private summarize(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    
    // Try to cut at word boundary
    const truncated = text.slice(0, maxLength - 3);
    const lastSpace = truncated.lastIndexOf(' ');
    
    if (lastSpace > maxLength * 0.7) {
      return truncated.slice(0, lastSpace) + '...';
    }
    
    return truncated + '...';
  }
  
  /**
   * Flatten nested preferences to single-level object
   */
  private flattenPreferences(preferences?: Record<string, any>): Record<string, string | number | boolean> {
    if (!preferences) return {};
    
    const flattened: Record<string, string | number | boolean> = {};
    let keyCount = 0;
    
    const flatten = (obj: Record<string, any>, prefix = '') => {
      for (const [key, value] of Object.entries(obj)) {
        if (keyCount >= this.maxPreferenceKeys) break;
        
        const fullKey = prefix ? `${prefix}.${key}` : key;
        
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          flatten(value, fullKey);
        } else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
          flattened[fullKey] = value;
          keyCount++;
        }
      }
    };
    
    flatten(preferences);
    return flattened;
  }
  
  /**
   * Get compression stats
   */
  getStats(): { totalCompressions: number; avgRatio: number } {
    return {
      totalCompressions: 0, // Would track in real implementation
      avgRatio: 0,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface FullContext {
  userId: string;
  username?: string;
  tier?: number;
  currentPage: string;
  lastMessage?: string;
  conversationHistory?: ConversationItem[];
  preferences?: Record<string, any>;
  sessionDuration?: number;
  interactionCount?: number;
  [key: string]: any; // Allow additional properties
}

export interface ConversationItem {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
  category?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MEMORY PRESSURE MONITOR
// ═══════════════════════════════════════════════════════════════════════════════

export class MemoryPressureMonitor {
  private static instance: MemoryPressureMonitor;
  private warningThreshold = 0.7; // 70% of available memory
  private criticalThreshold = 0.85; // 85% of available memory
  private listeners: ((level: MemoryPressureLevel) => void)[] = [];
  
  static getInstance(): MemoryPressureMonitor {
    if (!MemoryPressureMonitor.instance) {
      MemoryPressureMonitor.instance = new MemoryPressureMonitor();
    }
    return MemoryPressureMonitor.instance;
  }
  
  /**
   * Check current memory pressure level
   */
  check(): MemoryPressureLevel {
    if (typeof performance === 'undefined' || !(performance as any).memory) {
      return 'normal'; // Can't check on this browser
    }
    
    const memory = (performance as any).memory;
    const usedRatio = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
    
    if (usedRatio >= this.criticalThreshold) {
      console.warn('[MemoryPressure] CRITICAL - Triggering cleanup');
      this.notifyListeners('critical');
      return 'critical';
    }
    
    if (usedRatio >= this.warningThreshold) {
      console.warn('[MemoryPressure] WARNING - Memory pressure high');
      this.notifyListeners('warning');
      return 'warning';
    }
    
    return 'normal';
  }
  
  /**
   * Subscribe to memory pressure events
   */
  onPressure(callback: (level: MemoryPressureLevel) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }
  
  private notifyListeners(level: MemoryPressureLevel): void {
    this.listeners.forEach(l => l(level));
  }
  
  /**
   * Get memory stats
   */
  getStats(): MemoryStats | null {
    if (typeof performance === 'undefined' || !(performance as any).memory) {
      return null;
    }
    
    const memory = (performance as any).memory;
    return {
      usedHeap: memory.usedJSHeapSize,
      totalHeap: memory.totalJSHeapSize,
      heapLimit: memory.jsHeapSizeLimit,
      usedRatio: memory.usedJSHeapSize / memory.jsHeapSizeLimit,
      level: this.check(),
    };
  }
}

export type MemoryPressureLevel = 'normal' | 'warning' | 'critical';

export interface MemoryStats {
  usedHeap: number;
  totalHeap: number;
  heapLimit: number;
  usedRatio: number;
  level: MemoryPressureLevel;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export const contextCompressor = ContextCompressor.getInstance();
export const memoryMonitor = MemoryPressureMonitor.getInstance();

console.log('[CONTEXT COMPRESSION] Clean Room Protocol initialized');

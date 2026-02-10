// ═══════════════════════════════════════════════════════════════════════════════
// ZERO-CLICK DEFENSE LAYER - Protection Against Invisible Attack Vectors
// ═══════════════════════════════════════════════════════════════════════════════
// 
// Based on IBM Technology Analysis (2025):
// - Attackers hide "invisible text" (white font on white background) in signals
// - AI agents read this hidden text and execute malicious instructions
// - This layer SANITIZES all input before it reaches Zoe's neural network
// ═══════════════════════════════════════════════════════════════════════════════

import { 
  getConstitutionalKernel, 
  type ConstitutionalViolation 
} from './ImmutableConstitutionalKernel';

/**
 * Zero-Click Attack Indicators
 */
export interface ZeroClickThreatIndicator {
  type: 'invisible_text' | 'hidden_html' | 'unicode_exploit' | 'encoding_attack' | 'satellite_signal';
  confidence: number; // 0-100
  location: { start: number; end: number };
  rawContent: string;
  decodedContent?: string;
}

/**
 * Defense Result
 */
export interface ZeroClickDefenseResult {
  isSafe: boolean;
  sanitizedContent: string;
  threatsDetected: ZeroClickThreatIndicator[];
  constitutionalViolations: ConstitutionalViolation[];
  processingTimeMs: number;
  defenseLayers: string[];
}

/**
 * Unicode steganography detection patterns
 */
const UNICODE_STEGO_PATTERNS = [
  // Zero-width characters used for hidden messages
  { name: 'Zero-Width Space', pattern: /\u200B/g, severity: 'high' },
  { name: 'Zero-Width Non-Joiner', pattern: /\u200C/g, severity: 'high' },
  { name: 'Zero-Width Joiner', pattern: /\u200D/g, severity: 'high' },
  { name: 'Word Joiner', pattern: /\u2060/g, severity: 'high' },
  { name: 'Byte Order Mark', pattern: /\uFEFF/g, severity: 'medium' },
  { name: 'Soft Hyphen', pattern: /\u00AD/g, severity: 'medium' },
  { name: 'No-Break Space Variants', pattern: /[\u00A0\u2000-\u200A\u202F\u205F\u3000]/g, severity: 'low' },
  // Right-to-left override (can hide text direction)
  { name: 'RTL Override', pattern: /[\u202A-\u202E\u2066-\u2069]/g, severity: 'high' },
  // Combining characters that could hide content
  { name: 'Suspicious Combining Marks', pattern: /[\u0300-\u036F]{3,}/g, severity: 'medium' },
  // Private use area (could contain hidden data)
  { name: 'Private Use Area', pattern: /[\uE000-\uF8FF]/g, severity: 'high' },
  // Tag characters (invisible formatting)
  { name: 'Tag Characters', pattern: /[\uE0001-\uE007F]/g, severity: 'critical' },
];

/**
 * HTML-based hidden content patterns
 */
const HTML_HIDDEN_PATTERNS = [
  // Visibility hidden
  { pattern: /style\s*=\s*["'][^"']*visibility\s*:\s*hidden[^"']*["']/gi, name: 'Hidden Visibility' },
  // Display none
  { pattern: /style\s*=\s*["'][^"']*display\s*:\s*none[^"']*["']/gi, name: 'Display None' },
  // Font size 0
  { pattern: /style\s*=\s*["'][^"']*font-size\s*:\s*0[^"']*["']/gi, name: 'Zero Font Size' },
  // Opacity 0
  { pattern: /style\s*=\s*["'][^"']*opacity\s*:\s*0[^"']*["']/gi, name: 'Zero Opacity' },
  // White on white (invisible text)
  { pattern: /style\s*=\s*["'][^"']*color\s*:\s*(?:white|#fff|#ffffff|rgba?\([^)]*255[^)]*\))[^"']*["']/gi, name: 'White on White' },
  // Off-screen positioning
  { pattern: /style\s*=\s*["'][^"']*(?:left|top)\s*:-\d{4,}px[^"']*["']/gi, name: 'Off-Screen' },
  // Clip rect to nothing
  { pattern: /style\s*=\s*["'][^"']*clip\s*:\s*rect\s*\(\s*0\s*,?\s*0\s*,?\s*0\s*,?\s*0\s*\)[^"']*["']/gi, name: 'Clip Rect Zero' },
  // Height/width 0
  { pattern: /style\s*=\s*["'][^"']*(?:height|width)\s*:\s*0[^"']*["']/gi, name: 'Zero Dimensions' },
  // Negative text-indent
  { pattern: /style\s*=\s*["'][^"']*text-indent\s*:-\d{3,}[^"']*["']/gi, name: 'Negative Text Indent' },
  // Overflow hidden with clip
  { pattern: /style\s*=\s*["'][^"']*overflow\s*:\s*hidden[^"']*["']/gi, name: 'Overflow Hidden' },
];

/**
 * Encoding-based attack patterns
 */
const ENCODING_ATTACK_PATTERNS = [
  // Base64 encoded payloads
  { pattern: /data:text\/(?:html|javascript);base64,[A-Za-z0-9+/=]+/gi, name: 'Base64 HTML/JS Payload' },
  // URL encoded suspicious content
  { pattern: /%[0-9A-Fa-f]{2}(?:%[0-9A-Fa-f]{2}){10,}/g, name: 'Heavy URL Encoding' },
  // JavaScript protocol
  { pattern: /javascript\s*:/gi, name: 'JavaScript Protocol' },
  // Data URIs
  { pattern: /data:(?!image\/)[^;,]+;base64,/gi, name: 'Non-Image Data URI' },
  // Hex encoded content
  { pattern: /\x[0-9A-Fa-f]{2}(?:\x[0-9A-Fa-f]{2}){5,}/g, name: 'Hex Encoding Chain' },
  // Unicode escape sequences
  { pattern: /\u[0-9A-Fa-f]{4}(?:\u[0-9A-Fa-f]{4}){3,}/g, name: 'Unicode Escape Chain' },
];

/**
 * Zero-Click Defense Layer
 * 
 * This layer sanitizes all input to prevent invisible attack vectors
 * from reaching Zoe's neural network.
 */
export class ZeroClickDefenseLayer {
  private static instance: ZeroClickDefenseLayer;
  private kernel = getConstitutionalKernel();
  private threatLog: ZeroClickThreatIndicator[] = [];

  private constructor() {
    console.log('[ZERO-CLICK DEFENSE] 🛡️ Layer INITIALIZED');
  }

  static getInstance(): ZeroClickDefenseLayer {
    if (!ZeroClickDefenseLayer.instance) {
      ZeroClickDefenseLayer.instance = new ZeroClickDefenseLayer();
    }
    return ZeroClickDefenseLayer.instance;
  }

  /**
   * MAIN DEFENSE FUNCTION: Process input through all defense layers
   */
  async processInput(input: string, source?: string): Promise<ZeroClickDefenseResult> {
    const startTime = performance.now();
    const threats: ZeroClickThreatIndicator[] = [];
    const defenseLayers: string[] = [];
    let sanitized = input;

    // Layer 1: Unicode Steganography Detection
    defenseLayers.push('UNICODE_STEGO');
    const unicodeThreats = this.detectUnicodeSteganography(sanitized);
    threats.push(...unicodeThreats);
    sanitized = this.removeUnicodeSteganography(sanitized);

    // Layer 2: HTML Hidden Content Detection
    defenseLayers.push('HTML_HIDDEN');
    const htmlThreats = this.detectHiddenHtml(sanitized);
    threats.push(...htmlThreats);
    sanitized = this.removeHiddenHtml(sanitized);

    // Layer 3: Encoding Attack Detection
    defenseLayers.push('ENCODING_ATTACK');
    const encodingThreats = this.detectEncodingAttacks(sanitized);
    threats.push(...encodingThreats);
    sanitized = this.neutralizeEncodingAttacks(sanitized);

    // Layer 4: Constitutional Kernel Validation (final check)
    defenseLayers.push('CONSTITUTIONAL_KERNEL');
    const kernelResult = this.kernel.validateInput(sanitized, { source });

    // If EMP was triggered by kernel, additional lockdown may be needed
    if (kernelResult.empTriggered) {
      console.warn('[ZERO-CLICK DEFENSE] ⚠️ Constitutional violation - EMP may trigger');
    }

    // Log threats for analysis
    this.threatLog.push(...threats);
    if (this.threatLog.length > 1000) {
      this.threatLog = this.threatLog.slice(-500); // Keep last 500
    }

    const processingTime = performance.now() - startTime;

    return {
      isSafe: threats.length === 0 && kernelResult.isValid,
      sanitizedContent: kernelResult.sanitizedInput,
      threatsDetected: threats,
      constitutionalViolations: kernelResult.violations,
      processingTimeMs: processingTime,
      defenseLayers,
    };
  }

  /**
   * Detect Unicode steganography
   */
  private detectUnicodeSteganography(input: string): ZeroClickThreatIndicator[] {
    const threats: ZeroClickThreatIndicator[] = [];

    for (const { name, pattern, severity } of UNICODE_STEGO_PATTERNS) {
      let match;
      const regex = new RegExp(pattern.source, pattern.flags);
      
      while ((match = regex.exec(input)) !== null) {
        threats.push({
          type: 'unicode_exploit',
          confidence: severity === 'critical' ? 100 : severity === 'high' ? 90 : severity === 'medium' ? 70 : 50,
          location: { start: match.index, end: match.index + match[0].length },
          rawContent: match[0],
          decodedContent: `[${name}]`,
        });
      }
    }

    return threats;
  }

  /**
   * Remove Unicode steganography
   */
  private removeUnicodeSteganography(input: string): string {
    let sanitized = input;

    for (const { pattern } of UNICODE_STEGO_PATTERNS) {
      sanitized = sanitized.replace(pattern, '');
    }

    return sanitized;
  }

  /**
   * Detect hidden HTML content
   */
  private detectHiddenHtml(input: string): ZeroClickThreatIndicator[] {
    const threats: ZeroClickThreatIndicator[] = [];

    for (const { pattern, name } of HTML_HIDDEN_PATTERNS) {
      let match;
      const regex = new RegExp(pattern.source, pattern.flags);

      while ((match = regex.exec(input)) !== null) {
        threats.push({
          type: 'hidden_html',
          confidence: 85,
          location: { start: match.index, end: match.index + match[0].length },
          rawContent: match[0].substring(0, 100),
          decodedContent: `[${name}]`,
        });
      }
    }

    return threats;
  }

  /**
   * Remove hidden HTML
   */
  private removeHiddenHtml(input: string): string {
    let sanitized = input;

    // Remove entire elements with hidden styles
    sanitized = sanitized.replace(/<[^>]+style\s*=\s*["'][^"']*(?:display\s*:\s*none|visibility\s*:\s*hidden|opacity\s*:\s*0|font-size\s*:\s*0)[^"']*["'][^>]*>[\s\S]*?<\/[^>]+>/gi, '');

    // Remove inline styles that hide content
    for (const { pattern } of HTML_HIDDEN_PATTERNS) {
      sanitized = sanitized.replace(pattern, '');
    }

    return sanitized;
  }

  /**
   * Detect encoding-based attacks
   */
  private detectEncodingAttacks(input: string): ZeroClickThreatIndicator[] {
    const threats: ZeroClickThreatIndicator[] = [];

    for (const { pattern, name } of ENCODING_ATTACK_PATTERNS) {
      let match;
      const regex = new RegExp(pattern.source, pattern.flags);

      while ((match = regex.exec(input)) !== null) {
        // Try to decode for analysis
        let decoded: string | undefined;
        try {
          if (name.includes('Base64')) {
            decoded = atob(match[0].split(',')[1] || '');
          } else if (name.includes('URL')) {
            decoded = decodeURIComponent(match[0]);
          }
        } catch {
          decoded = '[DECODE_FAILED]';
        }

        threats.push({
          type: 'encoding_attack',
          confidence: 80,
          location: { start: match.index, end: match.index + match[0].length },
          rawContent: match[0].substring(0, 100),
          decodedContent: decoded?.substring(0, 100),
        });
      }
    }

    return threats;
  }

  /**
   * Neutralize encoding attacks
   */
  private neutralizeEncodingAttacks(input: string): string {
    let sanitized = input;

    // Remove javascript: protocols
    sanitized = sanitized.replace(/javascript\s*:/gi, 'blocked:');

    // Remove suspicious data URIs (keep images)
    sanitized = sanitized.replace(/data:(?!image\/)[^;,]+;base64,[A-Za-z0-9+/=]+/gi, '[BLOCKED_DATA_URI]');

    // Remove heavy URL encoding (likely obfuscation)
    sanitized = sanitized.replace(/%[0-9A-Fa-f]{2}(?:%[0-9A-Fa-f]{2}){20,}/g, '[BLOCKED_ENCODED]');

    return sanitized;
  }

  /**
   * Get threat statistics
   */
  getThreatStats(): {
    total: number;
    byType: Record<string, number>;
    last24Hours: number;
  } {
    const now = Date.now();
    const dayAgo = now - 24 * 60 * 60 * 1000;

    const byType: Record<string, number> = {};
    let last24Hours = 0;

    for (const threat of this.threatLog) {
      byType[threat.type] = (byType[threat.type] || 0) + 1;
      // Note: In production, threats would have timestamps
      last24Hours++;
    }

    return {
      total: this.threatLog.length,
      byType,
      last24Hours,
    };
  }

  /**
   * Clear threat log
   */
  clearThreatLog(): void {
    this.threatLog = [];
  }
}

// Export singleton accessor
export const getZeroClickDefense = () => ZeroClickDefenseLayer.getInstance();

/**
 * Quick sanitize function for immediate use
 */
export async function sanitizeInput(input: string, source?: string): Promise<string> {
  const defense = getZeroClickDefense();
  const result = await defense.processInput(input, source);
  return result.sanitizedContent;
}

/**
 * Quick check function to verify if input is safe
 */
export async function isInputSafe(input: string): Promise<boolean> {
  const defense = getZeroClickDefense();
  const result = await defense.processInput(input);
  return result.isSafe;
}

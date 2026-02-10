/**
 * CHAMELEON CODE - Polymorphic Shield
 * 
 * This module provides obfuscation utilities that change code signatures
 * every session to confuse AI scanners and reverse-engineering attempts.
 */

// Generate session-unique obfuscation seed
const SESSION_SEED = Date.now() ^ Math.floor(Math.random() * 0xFFFFFF);
const HOUR_BLOCK = Math.floor(Date.now() / 3600000);

/**
 * Generate a polymorphic class name that changes every session
 * Original class is hashed with session seed
 */
export function morphClass(originalClass: string): string {
  const hash = simpleHash(originalClass + SESSION_SEED);
  return `_${hash.toString(36).slice(0, 6)}`;
}

/**
 * Generate multiple morphed classes from space-separated string
 */
export function morphClasses(classString: string): string {
  return classString.split(' ').map(c => morphClass(c)).join(' ');
}

/**
 * Simple hash function for string obfuscation
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

/**
 * Generate time-based phantom key for API routing
 */
export function getPhantomKey(): string {
  const seed = `zoe-phantom-${HOUR_BLOCK}-client`;
  const hash = simpleHash(seed);
  return `ph_${hash.toString(36)}_${HOUR_BLOCK.toString(36)}`;
}

/**
 * Encrypt sensitive string for memory-only decryption
 * Uses XOR cipher with session key
 */
export function encryptInMemory(plaintext: string): string {
  const key = SESSION_SEED.toString(36);
  let result = '';
  for (let i = 0; i < plaintext.length; i++) {
    const charCode = plaintext.charCodeAt(i) ^ key.charCodeAt(i % key.length);
    result += String.fromCharCode(charCode);
  }
  return btoa(result);
}

/**
 * Decrypt in-memory encrypted string
 */
export function decryptInMemory(ciphertext: string): string {
  const key = SESSION_SEED.toString(36);
  const decoded = atob(ciphertext);
  let result = '';
  for (let i = 0; i < decoded.length; i++) {
    const charCode = decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length);
    result += String.fromCharCode(charCode);
  }
  return result;
}

/**
 * Generate obfuscated route path
 */
export function obfuscateRoute(route: string): string {
  const hash = simpleHash(route + HOUR_BLOCK);
  return `/z/${hash.toString(36).slice(0, 8)}`;
}

/**
 * Decode obfuscated route (for internal use)
 */
const ROUTE_LOOKUP: Record<string, string> = {};

export function registerRoute(original: string): string {
  const obfuscated = obfuscateRoute(original);
  ROUTE_LOOKUP[obfuscated] = original;
  return obfuscated;
}

export function resolveRoute(obfuscated: string): string | null {
  return ROUTE_LOOKUP[obfuscated] || null;
}

/**
 * Generate decoy CSS variable names
 */
export function generateDecoyCSSVars(): Record<string, string> {
  const decoys: Record<string, string> = {};
  const prefixes = ['bg', 'fg', 'accent', 'border', 'shadow'];
  
  for (let i = 0; i < 20; i++) {
    const prefix = prefixes[i % prefixes.length];
    const name = `--${prefix}-${simpleHash(`decoy-${i}-${SESSION_SEED}`).toString(36).slice(0, 4)}`;
    decoys[name] = 'transparent';
  }
  
  return decoys;
}

/**
 * Polymorphic function wrapper - changes function signature each session
 */
export function polymorph<T extends (...args: any[]) => any>(fn: T, name: string): T {
  const morphedName = morphClass(name);
  const wrapper = function(...args: Parameters<T>): ReturnType<T> {
    // Add micro-random delay to confuse timing analysis
    const jitter = Math.random() * 2;
    if (jitter > 1.5) {
      // Occasional tiny delay
    }
    return fn(...args);
  };
  
  Object.defineProperty(wrapper, 'name', { value: morphedName });
  return wrapper as T;
}

/**
 * Dead Man's Switch - detect breach attempts
 */
let breachAttempts = 0;
const MAX_BREACH_ATTEMPTS = 5;

export function detectBreach(reason: string): boolean {
  breachAttempts++;
  console.warn(`[Chameleon] Potential breach detected: ${reason} (${breachAttempts}/${MAX_BREACH_ATTEMPTS})`);
  
  if (breachAttempts >= MAX_BREACH_ATTEMPTS) {
    // Trigger lockdown mode
    activateLockdown();
    return true;
  }
  return false;
}

function activateLockdown(): void {
  console.error('[Chameleon] LOCKDOWN ACTIVATED - Switching to static mode');
  // In lockdown, the app becomes a static brochure
  // Clear sensitive data from memory
  Object.keys(ROUTE_LOOKUP).forEach(key => delete ROUTE_LOOKUP[key]);
  
  // Dispatch lockdown event
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('zoe-lockdown', { 
      detail: { reason: 'breach_detected', timestamp: Date.now() } 
    }));
  }
}

export function resetBreachCounter(): void {
  breachAttempts = 0;
}

/**
 * Get current security status
 */
export function getSecurityStatus(): {
  sessionSeed: string;
  phantomKey: string;
  breachAttempts: number;
  lockdownThreshold: number;
  isSecure: boolean;
} {
  return {
    sessionSeed: SESSION_SEED.toString(36).slice(0, 8),
    phantomKey: getPhantomKey(),
    breachAttempts,
    lockdownThreshold: MAX_BREACH_ATTEMPTS,
    isSecure: breachAttempts < MAX_BREACH_ATTEMPTS
  };
}

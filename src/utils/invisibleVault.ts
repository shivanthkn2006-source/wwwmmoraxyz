/**
 * INVISIBLE VAULT - Stealth Access System
 * 
 * Hides Phoenix Protocol and God Mode features behind
 * innocent-looking interactions (steganography for UI)
 */

// Secret access patterns
interface AccessPattern {
  sequence: string[];
  timeout: number;
  callback: () => void;
}

// Track current input sequence
let currentSequence: string[] = [];
let sequenceTimeout: ReturnType<typeof setTimeout> | null = null;
const SEQUENCE_TIMEOUT = 3000; // 3 seconds to complete pattern

// Registered secret patterns
const secretPatterns: Map<string, AccessPattern> = new Map();

/**
 * Register a secret access pattern
 * Example: 5 taps on settings icon unlocks Phoenix
 */
export function registerSecretPattern(
  name: string,
  sequence: string[],
  callback: () => void,
  timeout: number = SEQUENCE_TIMEOUT
): void {
  secretPatterns.set(name, { sequence, timeout, callback });
}

/**
 * Record an interaction (tap, click, gesture)
 */
export function recordInteraction(action: string): boolean {
  // Clear previous timeout
  if (sequenceTimeout) {
    clearTimeout(sequenceTimeout);
  }
  
  currentSequence.push(action);
  
  // Check all patterns
  for (const [name, pattern] of secretPatterns) {
    if (matchesPattern(currentSequence, pattern.sequence)) {
      console.log(`[Vault] Secret pattern "${name}" activated`);
      pattern.callback();
      currentSequence = [];
      return true;
    }
  }
  
  // Set timeout to clear sequence
  sequenceTimeout = setTimeout(() => {
    currentSequence = [];
  }, SEQUENCE_TIMEOUT);
  
  return false;
}

function matchesPattern(current: string[], target: string[]): boolean {
  if (current.length < target.length) return false;
  
  const recentActions = current.slice(-target.length);
  return recentActions.every((action, i) => action === target[i]);
}

/**
 * Initialize default secret patterns for Zoe
 */
export function initializeVaultPatterns(callbacks: {
  onPhoenixUnlock?: () => void;
  onGodModeUnlock?: () => void;
  onDeveloperUnlock?: () => void;
  onEmergencyLockdown?: () => void;
}): void {
  // Phoenix Protocol: Tap logo 5 times rapidly
  if (callbacks.onPhoenixUnlock) {
    registerSecretPattern(
      'phoenix',
      ['logo', 'logo', 'logo', 'logo', 'logo'],
      callbacks.onPhoenixUnlock
    );
  }
  
  // God Mode: Settings icon -> tap 3 times, then swipe up
  if (callbacks.onGodModeUnlock) {
    registerSecretPattern(
      'god-mode',
      ['settings', 'settings', 'settings', 'swipe-up'],
      callbacks.onGodModeUnlock
    );
  }
  
  // Developer Mode: Tap version number 7 times
  if (callbacks.onDeveloperUnlock) {
    registerSecretPattern(
      'developer',
      ['version', 'version', 'version', 'version', 'version', 'version', 'version'],
      callbacks.onDeveloperUnlock
    );
  }
  
  // Emergency Lockdown: Hold power + tap logo
  if (callbacks.onEmergencyLockdown) {
    registerSecretPattern(
      'lockdown',
      ['power-hold', 'logo', 'logo', 'power-release'],
      callbacks.onEmergencyLockdown
    );
  }
}

/**
 * Steganography: Hide data inside innocent-looking content
 */
export function hideInContent(data: string, carrier: string): string {
  // Use zero-width characters to hide data
  const ZERO_WIDTH_SPACE = '\u200B';
  const ZERO_WIDTH_JOINER = '\u200D';
  const ZERO_WIDTH_NON_JOINER = '\u200C';
  
  // Convert data to binary
  const binary = data.split('').map(char => 
    char.charCodeAt(0).toString(2).padStart(8, '0')
  ).join('');
  
  // Encode binary as zero-width chars
  let hidden = '';
  for (const bit of binary) {
    if (bit === '0') {
      hidden += ZERO_WIDTH_SPACE;
    } else {
      hidden += ZERO_WIDTH_JOINER;
    }
  }
  
  // Insert at middle of carrier
  const midpoint = Math.floor(carrier.length / 2);
  return carrier.slice(0, midpoint) + ZERO_WIDTH_NON_JOINER + hidden + ZERO_WIDTH_NON_JOINER + carrier.slice(midpoint);
}

/**
 * Extract hidden data from steganographic content
 */
export function extractFromContent(stegContent: string): string | null {
  const ZERO_WIDTH_SPACE = '\u200B';
  const ZERO_WIDTH_JOINER = '\u200D';
  const ZERO_WIDTH_NON_JOINER = '\u200C';
  
  // Find the hidden section
  const parts = stegContent.split(ZERO_WIDTH_NON_JOINER);
  if (parts.length < 3) return null;
  
  const hiddenSection = parts[1];
  if (!hiddenSection) return null;
  
  // Decode binary
  let binary = '';
  for (const char of hiddenSection) {
    if (char === ZERO_WIDTH_SPACE) binary += '0';
    else if (char === ZERO_WIDTH_JOINER) binary += '1';
  }
  
  // Convert binary to string
  let result = '';
  for (let i = 0; i < binary.length; i += 8) {
    const byte = binary.slice(i, i + 8);
    if (byte.length === 8) {
      result += String.fromCharCode(parseInt(byte, 2));
    }
  }
  
  return result;
}

/**
 * Create a hidden trigger element (looks like decoration)
 */
export function createHiddenTrigger(
  elementType: 'dot' | 'line' | 'space',
  onActivate: () => void
): { style: React.CSSProperties; onClick: () => void } {
  let tapCount = 0;
  let lastTap = 0;
  
  const baseStyles: Record<string, React.CSSProperties> = {
    dot: {
      width: '4px',
      height: '4px',
      borderRadius: '50%',
      background: 'transparent',
      position: 'absolute' as const,
      opacity: 0.1,
      cursor: 'default'
    },
    line: {
      width: '100%',
      height: '1px',
      background: 'transparent',
      position: 'absolute' as const,
      cursor: 'default'
    },
    space: {
      width: '20px',
      height: '20px',
      background: 'transparent',
      position: 'absolute' as const,
      cursor: 'default'
    }
  };
  
  return {
    style: baseStyles[elementType],
    onClick: () => {
      const now = Date.now();
      if (now - lastTap < 500) {
        tapCount++;
        if (tapCount >= 5) {
          onActivate();
          tapCount = 0;
        }
      } else {
        tapCount = 1;
      }
      lastTap = now;
    }
  };
}

/**
 * Camouflage a sensitive component as something mundane
 */
export function getCamouflageLabel(realFeature: string): string {
  const camouflageMap: Record<string, string> = {
    'phoenix-protocol': 'System Preferences',
    'god-mode': 'Advanced Settings',
    'soul-codex': 'Profile Backup',
    'ghost-construct': 'Memory Archive',
    'dhf-core': 'Data Storage',
    'lockdown': 'Sleep Mode',
    'quantum-state': 'Sync Status'
  };
  
  return camouflageMap[realFeature] || 'Settings';
}

/**
 * Check if current session has vault access
 */
let vaultUnlocked = false;
const VAULT_UNLOCK_DURATION = 30 * 60 * 1000; // 30 minutes
let vaultUnlockTime = 0;

export function unlockVault(): void {
  vaultUnlocked = true;
  vaultUnlockTime = Date.now();
  console.log('[Vault] Access granted for 30 minutes');
}

export function lockVault(): void {
  vaultUnlocked = false;
  vaultUnlockTime = 0;
  console.log('[Vault] Access revoked');
}

export function isVaultUnlocked(): boolean {
  if (!vaultUnlocked) return false;
  
  // Check if unlock has expired
  if (Date.now() - vaultUnlockTime > VAULT_UNLOCK_DURATION) {
    lockVault();
    return false;
  }
  
  return true;
}

/**
 * Get vault status
 */
export function getVaultStatus(): {
  isUnlocked: boolean;
  remainingTime: number;
  patternsRegistered: number;
} {
  const remaining = vaultUnlocked 
    ? Math.max(0, VAULT_UNLOCK_DURATION - (Date.now() - vaultUnlockTime))
    : 0;
    
  return {
    isUnlocked: isVaultUnlocked(),
    remainingTime: Math.floor(remaining / 1000),
    patternsRegistered: secretPatterns.size
  };
}

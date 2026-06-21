// ═══════════════════════════════════════════════════════════════════════════════
// IMMUTABLE CONSTITUTIONAL KERNEL - EARTH'S CORE SECURITY
// ═══════════════════════════════════════════════════════════════════════════════
// 
// This module contains the foundational security rules that CANNOT be overridden.
// Once the platform launches, these rules are immutable and self-enforcing.
// 
// CONSTITUTIONAL ARTICLES:
// 1. User data sovereignty - Users own their data absolutely
// 2. Privacy by default - All personal data encrypted before storage
// 3. Consent-first - No action without explicit user permission
// 4. Right to erasure - Users can delete all their data permanently
// 5. Transparency - All AI decisions must be explainable
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Constitutional Articles - Immutable rules for the platform
 */
export const CONSTITUTIONAL_ARTICLES = Object.freeze({
  // ARTICLE 1: USER DATA SOVEREIGNTY
  DATA_SOVEREIGNTY: Object.freeze({
    id: 'ARTICLE_1',
    name: 'User Data Sovereignty',
    description: 'Users own their data absolutely and can export/delete it at any time',
    enforcement: 'MANDATORY',
    violationSeverity: 'CRITICAL',
    canBeOverridden: false,
  }),

  // ARTICLE 2: PRIVACY BY DEFAULT
  PRIVACY_BY_DEFAULT: Object.freeze({
    id: 'ARTICLE_2', 
    name: 'Privacy by Default',
    description: 'All personal data must be encrypted before storage using AES-256',
    enforcement: 'MANDATORY',
    violationSeverity: 'CRITICAL',
    canBeOverridden: false,
  }),

  // ARTICLE 3: CONSENT FIRST
  CONSENT_FIRST: Object.freeze({
    id: 'ARTICLE_3',
    name: 'Consent First',
    description: 'No data collection or action without explicit user consent',
    enforcement: 'MANDATORY',
    violationSeverity: 'HIGH',
    canBeOverridden: false,
  }),

  // ARTICLE 4: RIGHT TO ERASURE
  RIGHT_TO_ERASURE: Object.freeze({
    id: 'ARTICLE_4',
    name: 'Right to Erasure',
    description: 'Users can permanently delete all their data with a single action',
    enforcement: 'MANDATORY',
    violationSeverity: 'CRITICAL',
    canBeOverridden: false,
  }),

  // ARTICLE 5: TRANSPARENCY
  TRANSPARENCY: Object.freeze({
    id: 'ARTICLE_5',
    name: 'AI Transparency',
    description: 'All AI decisions must be explainable and logged',
    enforcement: 'MANDATORY',
    violationSeverity: 'HIGH',
    canBeOverridden: false,
  }),

  // ARTICLE 6: NO SURVEILLANCE
  NO_SURVEILLANCE: Object.freeze({
    id: 'ARTICLE_6',
    name: 'No Unauthorized Surveillance',
    description: 'Platform will never use camera/microphone without explicit activation',
    enforcement: 'MANDATORY',
    violationSeverity: 'CRITICAL',
    canBeOverridden: false,
  }),

  // ARTICLE 7: EQUAL ACCESS
  EQUAL_ACCESS: Object.freeze({
    id: 'ARTICLE_7',
    name: 'Equal Access',
    description: 'All core platform features available regardless of subscription tier',
    enforcement: 'ADVISORY',
    violationSeverity: 'MEDIUM',
    canBeOverridden: false,
  }),
});

/**
 * Platform launch status - once set to LIVE, beta restrictions are removed
 */
export const PLATFORM_STATUS = Object.freeze({
  BETA: 'BETA',
  SOFT_LAUNCH: 'SOFT_LAUNCH',
  LIVE: 'LIVE',
} as const);

// Current platform status - GENESIS LAUNCH activates this
let currentStatus: typeof PLATFORM_STATUS[keyof typeof PLATFORM_STATUS] = PLATFORM_STATUS.LIVE;

/**
 * Get the current platform status
 */
export function getPlatformStatus(): typeof currentStatus {
  return currentStatus;
}

/**
 * Check if the platform is in live mode (post-beta)
 */
export function isLive(): boolean {
  return currentStatus === PLATFORM_STATUS.LIVE;
}

/**
 * Check if beta restrictions should be enforced
 */
export function isBetaLocked(): boolean {
  // GENESIS LAUNCH: Beta lock is now DISABLED
  return false;
}

/**
 * Validate an action against constitutional rules
 */
export function validateConstitutionalCompliance(
  action: string,
  context: Record<string, unknown>
): { compliant: boolean; violatedArticles: string[]; warnings: string[] } {
  const violations: string[] = [];
  const warnings: string[] = [];

  // Check data sovereignty
  if (context.exportingUserData && !context.userInitiated) {
    violations.push(CONSTITUTIONAL_ARTICLES.DATA_SOVEREIGNTY.id);
  }

  // Check consent
  if (context.collectingData && !context.consentGiven) {
    violations.push(CONSTITUTIONAL_ARTICLES.CONSENT_FIRST.id);
  }

  // Check surveillance
  if ((context.usingCamera || context.usingMicrophone) && !context.explicitActivation) {
    violations.push(CONSTITUTIONAL_ARTICLES.NO_SURVEILLANCE.id);
  }

  // Check encryption
  if (context.storingPersonalData && !context.encrypted) {
    violations.push(CONSTITUTIONAL_ARTICLES.PRIVACY_BY_DEFAULT.id);
  }

  return {
    compliant: violations.length === 0,
    violatedArticles: violations,
    warnings,
  };
}

/**
 * Kernel initialization - called on app boot
 */
export function initializeKernel(): void {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('       IMMUTABLE CONSTITUTIONAL KERNEL INITIALIZED');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`Platform Status: ${currentStatus}`);
  console.log(`Beta Lock: ${isBetaLocked() ? 'ACTIVE' : 'DISABLED'}`);
  console.log('Constitutional Articles:', Object.keys(CONSTITUTIONAL_ARTICLES).length);
  console.log('');
  Object.values(CONSTITUTIONAL_ARTICLES).forEach(article => {
    console.log(`  [${article.id}] ${article.name}: ${article.enforcement}`);
  });
  console.log('═══════════════════════════════════════════════════════════════');
}

// Lazy initialization - only log in development, not on every import
let _kernelInitialized = false;
export function ensureKernelInitialized(): void {
  if (!_kernelInitialized) {
    _kernelInitialized = true;
    if (typeof window !== 'undefined' && import.meta.env?.DEV) {
      initializeKernel();
    }
  }
}
ensureKernelInitialized();

export default {
  CONSTITUTIONAL_ARTICLES,
  PLATFORM_STATUS,
  getPlatformStatus,
  isLive,
  isBetaLocked,
  validateConstitutionalCompliance,
  initializeKernel,
};

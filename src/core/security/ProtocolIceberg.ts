// ═══════════════════════════════════════════════════════════════════════════════
// PROTOCOL ICEBERG - Shadow Feature Flag System
// Hides Tier 6 features behind admin-only gates
// Non-admins see "Coming Soon" or 404 - never "Access Denied"
// ═══════════════════════════════════════════════════════════════════════════════

import { isRootAdmin } from '@/components/security/securityConfig';

// Tier 6 Hidden Features - These are NEVER visible to non-admins
export const TIER_6_FEATURES = [
  'phoenix-protocol',
  'soul-codex', 
  'god-mode',
  'sovereignty-logs',
  're-sleeve',
  'ghost-construct',
  'immortality-engine',
  'consciousness-transfer',
] as const;

export type Tier6Feature = typeof TIER_6_FEATURES[number];

// Routes that should show 404/Coming Soon for non-admins
export const SHADOW_ROUTES = [
  '/phoenix',
  '/god-mode',
  '/sovereignty',
  '/soul-codex',
  '/re-sleeve',
  '/construct',
  '/immortality',
] as const;

// Public-facing names for hidden features (camouflage)
export const FEATURE_CAMOUFLAGE: Record<string, string> = {
  'phoenix-protocol': 'Cloud Backup',
  'soul-codex': 'Personalization Settings',
  'god-mode': 'Developer Tools',
  'sovereignty-logs': 'System Logs',
  're-sleeve': 'Career Suggestions',
  'ghost-construct': 'AI Assistant',
  'immortality-engine': 'Data Sync',
};

// Session storage key for shadow mode
const SHADOW_MODE_KEY = 'iceberg_shadow_active';
const FEATURE_ACCESS_LOG_KEY = 'iceberg_access_log';

interface AccessLogEntry {
  feature: string;
  timestamp: number;
  userId?: string;
  wasBlocked: boolean;
}

/**
 * Check if a feature is a Tier 6 hidden feature
 */
export const isTier6Feature = (feature: string): boolean => {
  return TIER_6_FEATURES.includes(feature as Tier6Feature);
};

/**
 * Check if a route is a shadow route (hidden from non-admins)
 */
export const isShadowRoute = (path: string): boolean => {
  return SHADOW_ROUTES.some(route => 
    path === route || path.startsWith(`${route}/`)
  );
};

/**
 * THE LOCK - Core access control for Tier 6 features
 * Returns null for non-admins (feature "doesn't exist")
 */
export const checkTier6Access = <T>(
  username: string | null | undefined,
  feature: Tier6Feature,
  content: T
): T | null => {
  const hasAccess = isRootAdmin(username);
  
  // Log access attempt
  logFeatureAccess(feature, !hasAccess, username || undefined);
  
  if (!hasAccess) {
    console.log(`[ICEBERG] Feature "${feature}" hidden from user`);
    return null;
  }
  
  console.log(`[ICEBERG] Admin access granted to "${feature}"`);
  return content;
};

/**
 * THE CAMOUFLAGE - Get what non-admins should see
 * Returns 'coming-soon' or '404' based on feature type
 */
export const getCamouflageResponse = (
  feature: string
): 'coming-soon' | '404' | 'redirect' => {
  // Soul Codex and Phoenix show "Coming Soon" to build anticipation
  if (feature === 'phoenix-protocol' || feature === 'soul-codex') {
    return 'coming-soon';
  }
  
  // God Mode and Sovereignty routes return 404 (don't hint they exist)
  if (feature === 'god-mode' || feature === 'sovereignty-logs') {
    return '404';
  }
  
  // Re-Sleeve redirects to public Career page
  if (feature === 're-sleeve') {
    return 'redirect';
  }
  
  return '404';
};

/**
 * Get public-facing name for a hidden feature
 */
export const getPublicName = (feature: string): string => {
  return FEATURE_CAMOUFLAGE[feature] || 'Feature';
};

/**
 * Log feature access attempts (for analytics/security)
 */
const logFeatureAccess = (
  feature: string,
  wasBlocked: boolean,
  userId?: string
): void => {
  try {
    const logKey = FEATURE_ACCESS_LOG_KEY;
    const existing = sessionStorage.getItem(logKey);
    const logs: AccessLogEntry[] = existing ? JSON.parse(existing) : [];
    
    logs.push({
      feature,
      timestamp: Date.now(),
      userId,
      wasBlocked,
    });
    
    // Keep only last 50 entries
    const trimmed = logs.slice(-50);
    sessionStorage.setItem(logKey, JSON.stringify(trimmed));
  } catch {
    // Silent fail - logging shouldn't break the app
  }
};

/**
 * Activate shadow mode (hides all Tier 6 features globally)
 */
export const activateShadowMode = (): void => {
  sessionStorage.setItem(SHADOW_MODE_KEY, 'true');
  console.log('[ICEBERG] Shadow mode ACTIVATED - Tier 6 features hidden');
};

/**
 * Deactivate shadow mode (admin-only)
 */
export const deactivateShadowMode = (username: string | null | undefined): boolean => {
  if (!isRootAdmin(username)) {
    console.warn('[ICEBERG] Unauthorized attempt to deactivate shadow mode');
    return false;
  }
  
  sessionStorage.removeItem(SHADOW_MODE_KEY);
  console.log('[ICEBERG] Shadow mode DEACTIVATED by admin');
  return true;
};

/**
 * Check if shadow mode is active
 */
export const isShadowModeActive = (): boolean => {
  return sessionStorage.getItem(SHADOW_MODE_KEY) === 'true';
};

/**
 * Get access log for security review (admin-only)
 */
export const getAccessLog = (username: string | null | undefined): AccessLogEntry[] | null => {
  if (!isRootAdmin(username)) {
    return null;
  }
  
  try {
    const logs = sessionStorage.getItem(FEATURE_ACCESS_LOG_KEY);
    return logs ? JSON.parse(logs) : [];
  } catch {
    return [];
  }
};

/**
 * Wrapper component helper - use in React components
 */
export const withTier6Gate = <P extends object>(
  username: string | null | undefined,
  feature: Tier6Feature,
  Component: React.ComponentType<P>
): React.ComponentType<P> | null => {
  if (!isRootAdmin(username)) {
    return null;
  }
  return Component;
};

/**
 * Hook helper for conditional rendering
 */
export const useTier6Visibility = (
  username: string | null | undefined,
  feature: Tier6Feature
): boolean => {
  return isRootAdmin(username) && !isShadowModeActive();
};

// Export status check
export const getIcebergStatus = () => ({
  tier6Features: TIER_6_FEATURES,
  shadowRoutes: SHADOW_ROUTES,
  shadowModeActive: isShadowModeActive(),
  protocol: 'ICEBERG',
  version: '1.0.0',
});

console.log('[PROTOCOL ICEBERG] Initialized - Tier 6 features protected');

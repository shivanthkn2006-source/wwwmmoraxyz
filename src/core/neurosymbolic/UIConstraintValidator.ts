// ═══════════════════════════════════════════════════════════════════════════════
// UI CONSTRAINT VALIDATOR - Symbolic layer for Living UI
// Ensures menu items always map to valid routes & critical items never hidden
// ═══════════════════════════════════════════════════════════════════════════════

export interface MenuItem {
  id: string;
  label: string;
  route: string;
  icon?: string;
  critical?: boolean; // If true, can never be fully hidden
}

/** All platform menu items with their routes */
export const PLATFORM_MENU_ITEMS: MenuItem[] = [
  { id: 'home', label: 'Home', route: '/', icon: 'Home', critical: true },
  { id: 'camera', label: 'Camera', route: '/camera', icon: 'Camera' },
  { id: 'chat', label: 'Chat', route: '/chat', icon: 'MessageCircle' },
  { id: 'huddle', label: 'Huddle', route: '/huddle', icon: 'Users' },
  { id: 'webdrop', label: 'Webdrop', route: '/webdrop', icon: 'PenSquare' },
  { id: 'explore', label: 'Explore', route: '/explore', icon: 'Compass' },
  { id: 'selfie-city', label: 'Selfie City', route: '/selfie-city', icon: 'MapPin' },
  { id: 'zoe-ai', label: 'Zoe AI', route: '/zoe-ai', icon: 'Brain' },
  { id: 'ai-companion', label: 'AI Companion', route: '/ai-companion', icon: 'Heart' },
  { id: 'journal', label: 'Journal', route: '/journal', icon: 'BookOpen' },
  { id: 'mmora', label: "M'mora", route: '/mmora', icon: 'Sparkles' },
  { id: 'evolution', label: 'Evolution', route: '/omega-evolution', icon: 'Zap' },
  // Critical items — symbolic constraint: NEVER fully hidden
  { id: 'settings', label: 'Settings', route: '/settings', icon: 'Settings', critical: true },
  { id: 'security', label: 'Security', route: '/security', icon: 'Shield', critical: true },
  { id: 'profile', label: 'Profile', route: '/profile', icon: 'User', critical: true },
];

export type UIMode = 'default' | 'calm' | 'creative' | 'minimal' | 'supportive';

/** Map of which items to show per UI mode */
const MODE_VISIBLE_IDS: Record<UIMode, string[]> = {
  default: PLATFORM_MENU_ITEMS.map(i => i.id),
  calm: ['home', 'chat', 'journal', 'explore', 'settings', 'security', 'profile'],
  creative: ['home', 'camera', 'webdrop', 'selfie-city', 'explore', 'mmora', 'chat', 'settings', 'security', 'profile'],
  minimal: ['home', 'chat', 'mmora', 'settings', 'security', 'profile'],
  supportive: ['home', 'chat', 'zoe-ai', 'ai-companion', 'journal', 'huddle', 'settings', 'security', 'profile'],
};

/**
 * Validate that a UI mode's menu configuration is safe
 * - Every visible item must map to a valid route
 * - Critical items (Settings, Security, Profile) are NEVER removed
 */
export function validateUIMode(mode: UIMode): {
  valid: boolean;
  visibleItems: MenuItem[];
  hiddenItems: MenuItem[];
  warnings: string[];
} {
  const warnings: string[] = [];
  const visibleIds = new Set(MODE_VISIBLE_IDS[mode] || MODE_VISIBLE_IDS.default);

  // Enforce critical items are always present
  const criticalItems = PLATFORM_MENU_ITEMS.filter(i => i.critical);
  for (const item of criticalItems) {
    if (!visibleIds.has(item.id)) {
      visibleIds.add(item.id);
      warnings.push(`Critical item '${item.label}' was re-added (cannot be hidden)`);
    }
  }

  const visibleItems = PLATFORM_MENU_ITEMS.filter(i => visibleIds.has(i.id));
  const hiddenItems = PLATFORM_MENU_ITEMS.filter(i => !visibleIds.has(i.id));

  // Validate all visible items have valid routes
  for (const item of visibleItems) {
    if (!item.route || !item.route.startsWith('/')) {
      warnings.push(`Item '${item.label}' has invalid route: ${item.route}`);
    }
  }

  return {
    valid: warnings.length === 0,
    visibleItems,
    hiddenItems,
    warnings,
  };
}

export default { validateUIMode, PLATFORM_MENU_ITEMS };

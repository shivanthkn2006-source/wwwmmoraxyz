// ═══════════════════════════════════════════════════════════════════════════════
// M'MORA SHARED COLOR CONSTANTS
// Single source of truth for M'mora accent colors. Update here to propagate
// across all M'mora components (sidebar accent, progress meters, badges, etc.).
//
// Brand accent is a slightly off-white (#ece7dc). The Tailwind `blue-*` scale is
// remapped in tailwind.config.ts to off-white shades, so these classes stay valid.
// ═══════════════════════════════════════════════════════════════════════════════

/** Tailwind utility class shorthands for the M'mora accent (off-white). */
export const MMORA_ACCENT = {
  // Text
  text: 'text-blue-500',
  textMuted: 'text-blue-400',
  textStrong: 'text-blue-600',

  // Backgrounds
  bg: 'bg-blue-500',
  bgSoft: 'bg-blue-500/10',
  bgHover: 'hover:bg-blue-500/20',

  // Borders
  border: 'border-blue-500',
  borderSoft: 'border-blue-500/30',

  // Gradients (paired with cyan for depth, matching the reference screenshot)
  gradient: 'bg-gradient-to-r from-blue-500 to-cyan-400',
  gradientSoft: 'bg-gradient-to-r from-blue-500/20 to-cyan-400/20',

  // States
  focusRing: 'focus-visible:ring-blue-500',
  disabled: 'disabled:bg-blue-500/40 disabled:text-background',
} as const;

/** Raw hex + HSL tokens for non-Tailwind usage (SVG, canvas, inline styles). */
export const MMORA_ACCENT_RAW = {
  hex: '#ece7dc',      // off-white 500
  hexLight: '#f2eee5', // off-white 400
  hexDark: '#ddd7ca',  // off-white 600
  hsl: '40 20% 94%',   // off-white in HSL
  rgb: 'rgb(236, 231, 220)',
} as const;

export type MmoraAccentKey = keyof typeof MMORA_ACCENT;

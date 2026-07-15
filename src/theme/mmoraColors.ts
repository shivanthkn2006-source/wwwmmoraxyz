// ═══════════════════════════════════════════════════════════════════════════════
// M'MORA SHARED COLOR CONSTANTS
// Single source of truth for M'mora accent colors. Update here to propagate
// across all M'mora components (sidebar accent, progress meters, badges, etc.).
//
// Reference blue sampled from the approved screenshot: ~rgb(80, 150, 240)
// HSL(213, 84%, 63%) — matches the existing Tailwind `blue-400` / `blue-500`.
// ═══════════════════════════════════════════════════════════════════════════════

/** Tailwind utility class shorthands for the M'mora accent (blue). */
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
  disabled: 'disabled:bg-blue-500/40 disabled:text-blue-100',
} as const;

/** Raw hex + HSL tokens for non-Tailwind usage (SVG, canvas, inline styles). */
export const MMORA_ACCENT_RAW = {
  hex: '#3b82f6',      // blue-500
  hexLight: '#60a5fa', // blue-400
  hexDark: '#2563eb',  // blue-600
  hsl: '217 91% 60%',  // blue-500 in HSL (matches index.css convention)
  rgb: 'rgb(59, 130, 246)',
} as const;

export type MmoraAccentKey = keyof typeof MMORA_ACCENT;

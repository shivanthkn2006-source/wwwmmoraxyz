import type { Config } from "tailwindcss";
import containerQueries from "@tailwindcss/container-queries";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1rem",
        xs: "0.75rem",
        sm: "1rem",
        md: "1.5rem",
        lg: "2rem",
        xl: "2.5rem",
        "2xl": "3rem",
        "3xl": "4rem",
        "4k": "6rem",
      },
      screens: {
        xs: "380px",
        sm: "640px",
        md: "768px",
        lg: "1024px",
        xl: "1280px",
        "2xl": "1536px",
        "3xl": "1920px",
        "4k": "2560px",
        "8k": "4320px",
      },
    },
    screens: {
      // ═══════════════════════════════════════════════════════════════════════
      // PROTOCOL LIQUID UNIVERSE: Form Factor Breakpoints
      // ═══════════════════════════════════════════════════════════════════════
      
      // Foldable Cover Screens
      'fold-cover': '280px',           // Z Fold Outer Screen (280-340px)
      'flip-cover': '340px',           // Z Flip Cover Screen (~340px)
      
      // Ultra-small phones (4.1" - 4.7")
      'xxs': '320px',
      // Small phones (4.7" - 5.5")
      'xs': '380px',
      // Medium phones (5.5" - 6.1")
      'sm': '640px',
      // Large phones (6.1" - 6.9")
      'md': '768px',
      // Small tablets (7" - 8.4")
      'lg': '1024px',
      // Medium tablets / iPad (9.7" - 11")
      'xl': '1280px',
      // Large tablets / iPad Pro (12.9")
      '2xl': '1536px',
      // Desktop HD
      '3xl': '1920px',
      // 4K displays
      '4k': '2560px',
      // 8K displays
      '8k': '4320px',
      // 12K/16K ultra displays
      'ultra': '7680px',
      
      // ═══════════════════════════════════════════════════════════════════════
      // SPECIAL DEVICE FORM FACTORS
      // ═══════════════════════════════════════════════════════════════════════
      
      // Samsung Family Hub Fridge (Portrait 1080x1920)
      'fridge': { 'raw': '(min-height: 1900px) and (min-width: 1000px)' },
      
      // Z Flip Open (Tall 22:9 aspect ratio)
      'flip-open': { 'raw': '(min-aspect-ratio: 22/9)' },
      
      // Z Fold Open (Internal 6:5 aspect ratio)
      'fold-open': { 'raw': '(min-width: 1536px) and (max-aspect-ratio: 6/5)' },
      
      // Smart Watches (tiny screens)
      'watch': { 'raw': '(max-width: 280px) and (max-height: 400px)' },
      
      // Car Displays (landscape, touch)
      'car': { 'raw': '(min-width: 800px) and (max-height: 600px) and (hover: none)' },
      
      // Kiosk/POS Systems
      'kiosk': { 'raw': '(min-width: 1000px) and (min-height: 1400px) and (hover: none)' },
      
      // Smart TVs
      'tv': { 'raw': '(min-width: 1920px) and (min-height: 1000px)' },
      
      // IoT devices (small screens)
      'iot': { 'raw': '(max-width: 280px)' },
      
      // E-Ink / E-Readers
      'eink': { 'raw': '(prefers-contrast: more) and (color-gamut: srgb)' },
      
      // ═══════════════════════════════════════════════════════════════════════
      // ORIENTATION & INTERACTION VARIANTS
      // ═══════════════════════════════════════════════════════════════════════
      
      // Orientation variants
      'landscape': { 'raw': '(orientation: landscape)' },
      'portrait': { 'raw': '(orientation: portrait)' },
      
      // Tablet landscape specific
      'tablet-landscape': { 'raw': '(min-width: 1024px) and (max-width: 1366px) and (orientation: landscape)' },
      
      // High DPI displays
      'retina': { 'raw': '(-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi)' },
      
      // Touch devices
      'touch': { 'raw': '(hover: none) and (pointer: coarse)' },
      
      // Mouse devices
      'mouse': { 'raw': '(hover: hover) and (pointer: fine)' },
      
      // Stylus/Pen input
      'stylus': { 'raw': '(pointer: fine) and (hover: none)' },
      
      // PWA Standalone mode
      'pwa': { 'raw': '(display-mode: standalone)' },
      
      // Foldable with hinge
      'hinge': { 'raw': '(horizontal-viewport-segments: 2), (vertical-viewport-segments: 2)' },
    },
    extend: {
      colors: {
        // M'mora brand: blue palette remapped to slightly off-white
        blue: {
          50: '#ffffff', 100: '#fdfcfa', 200: '#faf8f4', 300: '#f6f3ec',
          400: '#f2eee5', 500: '#ece7dc', 600: '#ddd7ca', 700: '#c4bdaf',
          800: '#9c968a', 900: '#6f6a61', 950: '#3b3833',
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        brand: {
          primary: "hsl(var(--brand-primary))",
          secondary: "hsl(var(--brand-secondary))",
        },
        status: {
          online: "hsl(var(--status-online))",
          away: "hsl(var(--status-away))",
          transit: "hsl(var(--status-transit))",
          offline: "hsl(var(--status-offline))",
          event: "hsl(var(--status-event))",
        },
        oni: {
          void: "hsl(var(--oni-void))",
          deep: "hsl(var(--oni-deep))",
          cyan: "hsl(var(--oni-cyan))",
          purple: "hsl(var(--oni-purple))",
          pink: "hsl(var(--oni-pink))",
          gold: "hsl(var(--oni-gold))",
        },
        omega: {
          void: "hsl(var(--omega-void))",
          deep: "hsl(var(--omega-deep))",
          cyan: "hsl(var(--omega-cyan))",
          purple: "hsl(var(--omega-purple))",
          pink: "hsl(var(--omega-pink))",
          gold: "hsl(var(--omega-gold))",
          green: "hsl(var(--omega-green))",
        },
        atlas: {
          void: "hsl(var(--atlas-void))",
          deep: "hsl(var(--atlas-deep))",
          cyan: "hsl(var(--atlas-cyan))",
          purple: "hsl(var(--atlas-purple))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      zIndex: {
        'base': 'var(--z-base)',
        'content': 'var(--z-content)',
        'dropdown': 'var(--z-dropdown)',
        'sticky': 'var(--z-sticky)',
        'fixed': 'var(--z-fixed)',
        'overlay': 'var(--z-overlay)',
        'modal': 'var(--z-modal)',
        'popover': 'var(--z-popover)',
        'tooltip': 'var(--z-tooltip)',
        'toast': 'var(--z-toast)',
        'zoe-orb': 'var(--z-zoe-orb)',
        'critical': 'var(--z-critical)',
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      spacing: {
        // Safe area insets
        'safe-top': 'env(safe-area-inset-top, 0px)',
        'safe-bottom': 'env(safe-area-inset-bottom, 0px)',
        'safe-left': 'env(safe-area-inset-left, 0px)',
        'safe-right': 'env(safe-area-inset-right, 0px)',
        // Bottom nav heights
        'nav': '4rem',
        'nav-safe': 'calc(4rem + env(safe-area-inset-bottom, 0px))',
        // Touch targets
        'touch-min': '44px',
        'touch-lg': '48px',
        // Foldable hinge gap
        'hinge': 'env(fold-width, 0px)',
      },
      fontSize: {
        // Responsive fluid typography
        'fluid-xs': 'clamp(0.625rem, 0.5rem + 0.5vw, 0.75rem)',
        'fluid-sm': 'clamp(0.75rem, 0.65rem + 0.5vw, 0.875rem)',
        'fluid-base': 'clamp(0.875rem, 0.75rem + 0.5vw, 1rem)',
        'fluid-lg': 'clamp(1rem, 0.85rem + 0.75vw, 1.125rem)',
        'fluid-xl': 'clamp(1.125rem, 0.9rem + 1vw, 1.25rem)',
        'fluid-2xl': 'clamp(1.25rem, 1rem + 1.25vw, 1.5rem)',
        'fluid-3xl': 'clamp(1.5rem, 1.1rem + 2vw, 1.875rem)',
        'fluid-4xl': 'clamp(1.875rem, 1.3rem + 2.5vw, 2.25rem)',
        'fluid-5xl': 'clamp(2.25rem, 1.5rem + 3vw, 3rem)',
        'fluid-hero': 'clamp(2.5rem, 1.5rem + 4vw, 4rem)',
      },
      // Dynamic Viewport Units (Fix jumpy backgrounds)
      height: {
        'dvh': '100dvh',
        'svh': '100svh',
        'lvh': '100lvh',
        'dvh-safe': 'calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))',
      },
      minHeight: {
        'touch': '44px',
        'screen-safe': 'calc(100vh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))',
        'dvh': '100dvh',
        'svh': '100svh',
      },
      maxHeight: {
        'dvh': '100dvh',
        'svh': '100svh',
      },
      width: {
        'dvw': '100dvw',
        'svw': '100svw',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 5px currentColor" },
          "50%": { boxShadow: "0 0 20px currentColor, 0 0 40px currentColor" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "float": "float 3s ease-in-out infinite",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "omega-scan": "omega-holo-scan 4s ease-in-out infinite",
        "omega-float": "omega-float 6s ease-in-out infinite",
        "omega-glitch": "omega-glitch 5s ease-in-out infinite",
      },
      fontFamily: {
        'orbitron': ['Orbitron', 'monospace'],
        'rajdhani': ['Rajdhani', 'sans-serif'],
        'share-tech': ['Share Tech Mono', 'monospace'],
      },
      maxWidth: {
        'screen-4k': '2560px',
        'screen-8k': '4320px',
      },
      // Container Query Sizes
      containers: {
        'xxs': '16rem',   // 256px
        'xs': '20rem',    // 320px
        'sm': '24rem',    // 384px
        'md': '28rem',    // 448px
        'lg': '32rem',    // 512px
        'xl': '36rem',    // 576px
        '2xl': '42rem',   // 672px
        '3xl': '48rem',   // 768px
        '4xl': '56rem',   // 896px
        '5xl': '64rem',   // 1024px
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    containerQueries,
  ],
} satisfies Config;

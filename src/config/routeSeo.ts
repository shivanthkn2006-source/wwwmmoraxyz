/**
 * Single source of truth for per-route head metadata.
 *
 * Every public, indexable route in `scripts/generate-sitemap.ts` must have an
 * entry here, and the page that renders the route must mount <PageSeo /> with
 * the entry's values. `src/test/routeSeo.test.ts` enforces both at build time.
 */

export interface RouteSeoEntry {
  /** Root-relative route path, matching the sitemap entry. */
  path: string;
  /** <title> — keep under 60 characters. */
  title: string;
  /** <meta name="description"> — keep under 160 characters. */
  description: string;
  /** Page component file (project-relative) that must mount <PageSeo />. */
  source: string;
}

export const ROUTE_SEO_LIST: RouteSeoEntry[] = [
  {
    path: "/",
    title: "MMora — Immersive AI Social Platform",
    description:
      "Share loops, selfies and timelines with friends on MMora, the immersive AI social platform powered by Zoe.",
    source: "src/pages/HomePage.tsx",
  },
  {
    path: "/about",
    title: "About Universe of Life — MMora",
    description:
      "Learn about Universe of Life, the team behind MMora and Zoe, our mission, contact details and platform principles.",
    source: "src/pages/AboutPage.tsx",
  },
  {
    path: "/auth",
    title: "Sign in to MMora — Secure Access",
    description:
      "Sign in or create your MMora account with email, passkey, Face ID or fingerprint to join the AI social platform.",
    source: "src/pages/AuthPage.tsx",
  },
  {
    path: "/zoe-infinity",
    title: "Zoe Infinity Workspace — MMora",
    description:
      "Talk, create and research with Zoe Infinity: a voice-first AI workspace for conversation, images and deep research.",
    source: "src/pages/ZoeInfinityUnlocked.tsx",
  },
  {
    path: "/genesis-imprint",
    title: "Genesis Imprint — Bio-Quantum Sign In",
    description:
      "Enter MMora through the Genesis Imprint gate: bio-quantum resonance sign in with biometric and voice verification.",
    source: "src/pages/ZoeIdentity.tsx",
  },
  {
    path: "/ear-link-blueprint",
    title: "Zoe Ear-Link Blueprint — Hardware Spec",
    description:
      "Download the Zoe Ear-Link hardware blueprint: chipset, wireless, audio and battery specifications for the wearable.",
    source: "src/pages/EarLinkBlueprintPage.tsx",
  },
  {
    path: "/install",
    title: "Install MMora — Add the App to Your Device",
    description:
      "Install MMora as an app on iPhone, Android, Mac or Windows and get instant, full-screen access to Zoe and your feed.",
    source: "src/pages/InstallApp.tsx",
  },
];

export const ROUTE_SEO: Record<string, RouteSeoEntry> = Object.fromEntries(
  ROUTE_SEO_LIST.map((entry) => [entry.path, entry]),
);

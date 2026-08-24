# M'MORA /home — COMPLETE DEEP SCAN (read-only)
Date: 2026-08-24 · No code changed · Build state at scan time: **build OK**

---

## 0. HEADLINE NUMBERS

| Metric | Value |
|---|---|
| `src/pages/HomePage.tsx` | **2,535 lines**, 65 imports, 57 `useState`, 33 `useEffect`, 24 `useMemo/useCallback`, 36 hook calls |
| Home-surface components | 21 files, **7,075 LOC** |
| `src/components/home/` | 13 components |
| Hooks in repo | **395** (36 mounted on Home) |
| Edge functions | **133** (4 reachable from Home) |
| Realtime channel files | 13 |
| Total `src` files | 1,405 (420,715 LOC) |
| npm deps | 84 (14 are heavy/3D/ML) |
| Lazy chunks in App.tsx | 73 routes lazy; **HomePage's own children are 90% eager** |

---

## 1. COMPONENT INVENTORY (home surface)

### 1.1 Eagerly imported by HomePage.tsx (loaded before first paint)
| Component | LOC | Cost |
|---|---|---|
| `SearchBar.tsx` | 1,336 | **Largest eager child.** Full search UI in the initial chunk |
| `GlobalZoeAssistant.tsx` | 1,002 | Mounted globally via DeferredComponentLoader (phase 1) |
| `PostCard.tsx` | 940 | **Per-post instance**; 8 effects + IntersectionObserver each |
| `HomeFloatingTools.tsx` | 495 | Search + camera + feed icons, drag logic |
| `HamburgerMenu.tsx` | 356 | Eager |
| `LoopVideoItem.tsx` | 355 | Per-loop instance |
| `NotificationMenu.tsx` | 332 | Eager |
| `HomeGlassDock.tsx` | 331 | Eager |
| `MmoraNeuralFeed.tsx` | 231 | Own queries to `mmora_feed_items` |
| `DraggableHomeControl.tsx` | 178 | resize + orientationchange listeners |
| `AuthorPreviewRail.tsx` | 164 | 2 extra queries |
| `PlaylistsSection.tsx` | 161 | |
| `HomeIconStatusPanel.tsx` | 146 | Diagnostics only — should not ship to users |
| `ExternalVideoCard.tsx` | 135 | YouTube iframe API per card |
| `HomeCollectionSheet.tsx` | 124 | Own `posts` query |
| `HomePostEditor.tsx` | 101 | |
| `MoraZoeDailyCard.tsx` | 95 | Astro slide |
| `DockBadgeBoundary.tsx` | 76 | Error boundary (good) |
| `SearchDebugPanel.tsx` | 64 | Debug only |
| `HomeMotivationSlide.tsx` | 50 | |
| `LiveStreamView.tsx` | 403 | Behind `LiveViewBoundary` |

Also eager from HomePage: `PostsGrid`, `PostModal`, `FriendRequestCard`, `InterestRecommendations`, `FullScreenVideoPlayer`, `PrivateTimelinesSheet`, `SelfieCityFeed`, `AtlasHUD`, `TutorialOverlay`, `OnboardingTour`, `SovereignQuickAccess`, `AdminFeedDebugger`, `FeedDiagnosticsBanner`, `NewContentBadge`, `StatusIconBadge`, `FuturisticCounter`.

> **Finding A (biggest single win):** only **5** `lazy()` calls exist inside a 2,535-line page that eagerly imports ~35 components. Everything above lands in one chunk on first paint — that is why low-RAM Android and iPad stall.

### 1.2 Hooks mounted on Home (36)
`useAuth`, `useAstroDailyPrediction`, `useDhfBrain`, `useZoeMotivation`, `useHomeDockBadges`, `useEventGlow`, `useSmartNotifications`, `useRealtimeBadgeNotifications`, `useUserOnlineNotifications`, `useDesktopNotifications`, `useNewPostNotifications`, `useZoeProactiveNotifications`, `useTutorial`, `useDailyBriefing`, `useFriendRequests`, plus 21 local/derived.

> **Finding B:** **six** independent notification hooks mount simultaneously. Each opens its own realtime subscription/poll. This is the main source of duplicate socket traffic and battery drain on mobile.

---

## 2. DATA LAYER — every query the Home page issues

### 2.1 Tables hit directly from the home surface
| Table | Call sites |
|---|---|
| `posts` | 12 (HomePage 1798/1806/1813/1818/1830/1919/1924/1931/1989 · PostCard 126/476/532 · HomeCollectionSheet 57 · AuthorPreviewRail 78) |
| `feed_posts_safe` | 4 (1209, 1331, 1413, 1962) |
| `post_likes` | 5 (1273, 1366, 1451, 1971, 1998 + PostCard 364/376) |
| `safe_public_profiles` | 4 (1264, 1362, 1442, 1970, 1997) |
| `post_preferences` | 3 · `post_ratings` 4 · `saved_posts` 4 (all PostCard) |
| `mmora_feed_items` | 3 (HomePage 255, MmoraNeuralFeed 53/95) |
| `feed_diagnostics_log` | 2 (612, 633) |
| `notifications` 1515 · `messages` 1536 · `friend_requests` 1584 · `friendships` 1185 · `profiles` 1496 · `voice_assistant_settings` 1157/1167 |

### 2.2 Query limits
`.limit(12)` line 258 · `.limit(50)` 1214 · `.limit(30)` 1337 · `.limit(50)` 1419.
> **Finding C:** feeds are **capped, not paginated** — no cursor/keyset. At 50 posts the page mounts 50 `PostCard` instances = **~400 effects and 50 IntersectionObservers** on mount. This is the #1 cause of jank on low-hardware devices.

### 2.3 Edge functions reachable from Home
| Function | Called from |
|---|---|
| `external-search` | `HomeFloatingTools.tsx:126` |
| `zoe-dhf-brain` | `useDhfBrain.ts:63, 97` |
| `zoe-motivation` | `useZoeMotivation.ts:55` |
| (`astro-engine` via `useAstroDailyPrediction` / cron) | indirect |

> **Finding D:** 133 edge functions exist; only 4 serve Home. The rest are dead weight for this surface but still bill and deploy.

### 2.4 Polling / timers
- `HomePage.tsx:1560` — `setInterval(poll, 30_000)` re-armed by `visibilitychange` (1564), `online` (1565), `focus` (1566).
- `DeferredComponentLoader` — 10-minute auto feature-scan interval.
- `AdaptiveProviderShell:155` — 15s memory-pressure interval.
- Console log confirms a **30-second heartbeat** running constantly: `[ZoeCore] Security status refreshed` + `[ZoeCore] DHF Health` every 30s, forever, even idle.

---

## 3. THE FEED COMPOSITION (why sections "disappear")

`HomePage.tsx` builds the snap-feed from **five slide sources**, memoised separately:

```
searchVideoSlides   (line 226)  ← YouTube results from external-search
neuralVideoSlides   (line 281)  ← mmora_feed_items (DHF brain)
loopSlides          (line 2023) ← platform loops, gated by `loopsHidden`
globalPosts / personalPosts     ← feed_posts_safe (50 / 50)
astroDaily + dailyMotivation    ← single injected slides
```

Render order, global tab (2153–2181) and personal tab (2204–2229):
```
searchVideoSlides → posts → (!loopsHidden && loopSlides) → neuralVideoSlides
```

Empty-state guard at **2148** and **2200** requires ALL of
`globalPosts.length === 0 && !astroDaily && !dailyMotivation && searchVideos.length === 0 && neuralVideos.length === 0 && loopSlides.length === 0`.

> **Finding E:** this is a single flat `<div>` of memoised arrays — **no virtualisation**. Every slide from every source is in the DOM at once. YouTube/Instagram both windowise (render ±2 slides). This is the structural change that unlocks smooth playback everywhere.

> **Finding F:** section visibility depends on `localStorage` flags, not state machine:
> `mmora.home.loopsHidden` (172, 371, 558, 578), `mmora.home.autoScroll` (1017, 1039, 374), `mmora.home.zoeDebugOverlay` (403, 2500), `mmora:saved-videos` + `mmora:saved-videos-meta` (133–149).
> A stale flag in one browser = "my loops vanished". That's the regression class you kept hitting.

---

## 4. HIDDEN WIRING — the custom event bus (undocumented)

Home is wired by **window CustomEvents**, not props. Full map:

**Emitted by HomePage:**
`mmora:restore-feed-playback` (183) · `mmora:feed-external-videos-ready` (211) · `mmora:zoe-open-with-context` (2368) · `mmora:open-home-search` (2398) · `mmora:analytics` (756, 902) · `mmora:home-command` (949)

**Emitted by HomeFloatingTools:**
`mmora:exit-search-videos` (273) · `mmora:feed-external-videos` (451) · `mmora:home-search-toggle` (83)

**Listened for:**
| Event | Listener |
|---|---|
| `mmora:feed-external-videos` | HomePage 214, HomeFloatingTools 103 |
| `mmora:exit-search-videos` | HomePage 222 |
| `mmora:dhf-feed-updated` | HomePage 274, MmoraNeuralFeed 65 |
| `mmora:zoe-chat-toggle` | HomePage 414 |
| `mmora:home-search-toggle` | HomePage 421 |
| `mmora:home-command` | HomePage 1076 |
| `feed-switch` | HomePage 1119 |
| `mmora:request-shorts-upload` | HomePage 1882 |
| `mmora:open-home-search` | HomeFloatingTools 78 |
| `mmora:home-dock-usage` | HomeGlassDock 76 |
| `post-action` | PostCard 290 |
| `zoe-orb-activate`, `zoe-speak`, `zoe-user-message`, `zoe-trigger-briefing`, `mmora:zoe-open-with-context`, `zoe-voice-input-start/end`, `zoe-handsfree-start/end`, `zoe-voice-system-activated` | GlobalZoeAssistant 139–825 |

Raw DOM listeners: `scroll` (514, 1705), `click`+`touchstart` (1132–1133), `mouseenter/mouseleave` (733–734), video `ended`/`timeupdate`/`loadedmetadata` (934–936), `pointerdown`/`keydown` (PostCard 190–191, HomeGlassDock 91–92, HomeFloatingTools 162), `resize`/`orientationchange` (DraggableHomeControl 97–98).

> **Finding G:** **~30 global event channels with no registry and no types.** Any rename silently breaks a feature with zero compile error. This is exactly why "the feed icon does nothing" kept recurring.

---

## 5. PROVIDER STACK ABOVE HOME (App.tsx, 1,183 lines)

```
QueryClientProvider → AuthProvider → GlobalMediaProvider → NavigationBusProvider
 → DevModeProvider → CorticalStackProvider → AdaptiveLearningProvider
 → ZoeUnifiedSelfHealerProvider → TooltipProvider
   → AdaptiveProviderShell            (device-tier gate: lite / standard / god)
     → AutoPhantomProvider → ShadowSentinelProvider → ZoeMonitorProvider
       → VoiceRuntimeGate (MicPermissionInitializer, PlatformPermissionsInitializer, VoiceSystemActivator)
       → LightActivityTracker, DHFHeartbeatPulse, MemoryLeakPlumberGlobal,
         AutoFixProvider, DeferredComponentLoader, HarvestIntegration
         → VelvetRopeProvider → PlanetaryIntentSelector, DevTestButton,
            ScreenTapController, AdminToolbar
            → GenesisIntroWrapper → QuantumGatekeeper → ErrorBoundary → Suspense → Routes → HomePage
```

**19 providers + 11 always-mounted side-effect components before HomePage even renders.**

`AdaptiveProviderShell` (good design, already lazy-splits GOD/STANDARD/LITE by device tier) is the right lever — but it only gates 3 providers; the other 16 mount unconditionally on a 2GB Android.

`DeferredComponentLoader` phases: 1s → SelfHealer + VoiceNotifications + EntityActivation + Freemium + GlobalZoeAssistant; 3s → ViralEngine + FeatureScanner; 5s → PlatformHealthMonitor. Each is a hook with its own network/interval.

---

## 6. ACTIVE ERRORS & RISKS FOUND

| # | Severity | Finding | Evidence |
|---|---|---|---|
| 1 | **HIGH** | `TypeError: Importing a module script failed` on a Vite dep chunk — a lazy chunk fails to load, blanking a section | runtime-errors.log |
| 2 | **HIGH** | No feed virtualisation; 50 PostCards × 8 effects + 1 IntersectionObserver each mount at once | HomePage 2148–2229, PostCard 138–295 |
| 3 | **HIGH** | ~35 eager component imports in the Home chunk (only 5 lazy) | HomePage imports 2–93 |
| 4 | **HIGH** | 6 concurrent notification hooks → duplicate realtime sockets | HomePage 47–52 |
| 5 | **MED** | 30s forever-poll + 15s memory poll + 10min scan, never suspended when tab hidden for all three | 1560, AdaptiveShell 155, DeferredLoader 129 |
| 6 | **MED** | Feed limited (50) not paginated — no infinite scroll cursor | 1214, 1419 |
| 7 | **MED** | Section state in `localStorage`, not derived state → stale-flag regressions | 172/371/558/578 |
| 8 | **MED** | Untyped 30-channel global event bus, no registry | §4 |
| 9 | **MED** | Debug surfaces shipped to users: `SearchDebugPanel`, `HomeIconStatusPanel`, `AdminFeedDebugger`, `FeedDiagnosticsBanner` | imports 67–68 |
| 10 | **MED** | `framer-motion` eager in PostCard — animation lib on the per-post critical path | PostCard:17 |
| 11 | **LOW** | Heavy deps present in the graph (three, @react-three/*, tfjs, coco-ssd, mediapipe, mapbox-gl, react-globe.gl, pdfjs, jspdf, recharts) — verify none is reachable from the Home chunk | package.json |
| 12 | **LOW** | `feed_diagnostics_log` writes on the render path (612, 633) | |
| 13 | **LOW** | 2,535-line page component — no container/presenter split; every state change re-renders the whole feed | |

---

## 7. HOW TO RE-ORGANISE INTO A YOUTUBE/INSTAGRAM-GRADE SURFACE

**Nothing below has been implemented. This is the ordered plan; each step is independently shippable and reversible.**

### Phase 1 — Stop the bleeding (no feature changes, biggest gain)
1. **Virtualise the snap feed.** Render only `activeIndex ± 2` slides. Everything else becomes a fixed-height placeholder. Expected: 50 PostCards → 5 mounted; ~90% fewer effects/observers.
2. **Lazy-split the 6 heaviest eager children** — `SearchBar` (1,336), `HamburgerMenu`, `NotificationMenu`, `PostsGrid`, `PostModal`, `SelfieCityFeed`, `PrivateTimelinesSheet` — behind `lazy()` + `Suspense`. They are all on-demand UI.
3. **Dev-gate the 4 debug surfaces** behind `import.meta.env.DEV || isAdmin`.
4. **Suspend all timers on `document.hidden`** — one shared `useVisibilityInterval` instead of 3 independent loops.

### Phase 2 — Data discipline
5. **One feed query, one cache.** Move `feed_posts_safe` / `posts` / `post_likes` / `safe_public_profiles` into a single React Query key with keyset pagination (`created_at < cursor`), page size 10, infinite scroll. Kills the 50-row wall and the duplicate profile/like round-trips.
6. **Batch per-post state.** `saved_posts`, `post_preferences`, `post_ratings`, `post_likes` are currently fetched *per PostCard*. Fetch once for the visible page as a map, pass down as props. 50 cards × 4 queries → 4 queries total.
7. **Collapse the 6 notification hooks** into one `useHomeNotifications` sharing a single realtime channel with multiple `on()` filters.

### Phase 3 — Architecture (the enterprise layer)
8. **Split `HomePage.tsx` (2,535 → ~250).**
   ```
   src/features/home/
     HomeScreen.tsx            // layout only
     feed/FeedVirtualizer.tsx  // windowing
     feed/slideRegistry.ts     // one typed union of every slide source
     feed/useHomeFeed.ts       // all data, one query client
     controls/                 // dock, floating tools, draggables
     events/homeEventBus.ts    // TYPED emitter replacing the 30 window events
     state/homeState.ts        // replaces the localStorage flags
   ```
9. **Typed event bus.** `emit('mmora:exit-search-videos')` becomes a compile-checked call. Ends the whole class of silent-break regressions.
10. **Slide registry.** Each source (search video / loop / post / neural / astro / motivation) registers `{ id, kind, priority, render, estimatedHeight }`. Ordering becomes data, not five hard-coded JSX blocks in two duplicated tabs (2153–2181 and 2204–2229 are near-identical — that duplication is why fixing one tab broke the other).

### Phase 4 — Device scaling (low-RAM / iPad / tablets)
11. **Extend `AdaptiveProviderShell`'s tier gate to the feed itself**, not just providers:
    - Tier C (≤2GB, M05-class): window ±1, posters only, no autoplay, no framer-motion, no neural feed.
    - Tier B: window ±2, autoplay muted, 480p.
    - Tier A/S: window ±3, autoplay, 720p, prefetch next 2.
12. **Responsive shell**: mobile = full-bleed 9:16 snap (current). Tablet/iPad = 2-column grid + rail. Desktop = YouTube layout (sidebar + grid + theater player). Same slide registry, three layout renderers.
13. **Media policy**: `preload="none"` off-screen, `preload="metadata"` at ±1, `play()` only at index 0 offset — enforced centrally, not per component.

### Phase 5 — Then add features safely
Once the registry + virtualizer exist, new features (playlists, live, shorts upload, channels) are one registry entry each and cannot regress the feed.

---

## 8. SUGGESTED FIX ORDER (1-by-1, safest first)
1. Dev-gate debug panels (zero risk)
2. Suspend timers on hidden tab
3. Lazy-split 6 heavy children
4. Virtualise feed (±2)
5. Batch per-post queries
6. Keyset pagination + infinite scroll
7. Merge notification hooks
8. Typed event bus
9. Slide registry + de-duplicate the two tab blocks
10. Split HomePage into `src/features/home/`
11. Tier-aware feed policy
12. Desktop/tablet layout renderers

Steps 1–4 alone should fix the load stalls on low-RAM devices without touching a single feature.

---

## 9. ADDENDUM — second-pass findings (deep subagent audit, verified)

### 9.1 Corrections to §1/§6
- Realtime is worse than first measured: **up to 8 concurrent Supabase Realtime channels** per Home session, not 6.
  `home-realtime:${user.id}:${rand}` (HomePage:1663-1685) · `home-dock-badges` (useHomeDockBadges:83) · `friend-status-changes:*:smart` (useSmartNotifications:153) · `friend-badge-notifications` (useRealtimeBadgeNotifications:15) · `friend-status-changes:*:online` (useUserOnlineNotifications:35) · desktop-notifications (useDesktopNotifications:60) · `new-posts-notifier-*` (useNewPostNotifications:18) · `friend_requests_changes` (useFriendRequests:224).
  Several listen to the **same tables** (`notifications`, `posts`, friend status).
- **Three independent polling loops**, not one: HomePage:1554-1575 (30s) · useHomeDockBadges:98 · useSmartNotifications:179.
- HomePage `useState` count is **27** (not 57 — earlier figure counted derived/ref declarations); `useEffect` **32**, `useMemo` **7**, `useCallback` **17**.
- Suspense boundaries **do exist** (`React.Suspense` at 2284, 2300, 2444, 2451, 2527) — the earlier concern is withdrawn.
- Edge functions confirmed present: `supabase/functions/zoe-dhf-brain`, `supabase/functions/zoe-motivation`, `supabase/functions/external-search`.
- `quantum-camera`/three.js is **NOT** reachable from `HomeFloatingTools`/`HomeGlassDock`/`DraggableHomeControl` — confirmed zero imports. Home's bundle is clean of three.js.
- There is a **third tab**: `TabsContent value="selfiecity"` (2236), in addition to `global` (2111) and `personal` (2187).

### 9.2 NEW findings
| # | Sev | Finding | Evidence |
|---|---|---|---|
| N1 | **HIGH** | `React.lazy()` called **inline inside render** — creates a brand-new component type on every render, forcing an unmount/remount + refetch of the chunk each time. This is a prime suspect for the live `TypeError: Importing a module script failed`. | `HomePage.tsx:2528` `React.createElement(React.lazy(() => import('@/components/dev/AutoScrollDebugOverlay')))` |
| N2 | **HIGH** | Realtime `postgres_changes` on `posts` INSERT is **unfiltered** — fires for *every* post by *every* user platform-wide, and each event triggers **3 refetches** (`fetchGlobalPosts` + `fetchPersonalPosts` + `fetchLoopPosts`). At scale this is a self-inflicted DDoS on the feed. | `HomePage.tsx:1680` |
| N3 | **MED** | Main feed queries use `(supabase as any)` casts, disabling type safety on the primary data path. | `HomePage.tsx:1208, 1330, 1412` |
| N4 | **MED** | Three `window` listeners (`visibilitychange`, `online`, `focus`) all re-fire the **same** `poll()` — a tab regaining focus can trigger it twice. | `HomePage.tsx:1561-1566` |
| N5 | **MED** | Follow-up joins (`safe_public_profiles`, `post_likes`, `post_preferences`) have **no `.limit()`** and use `.in('user_id', ids)` — they scale with feed size. | `1262-1276, 1360-1369, 1440-1450` |
| N6 | **MED** | `FeedErrorBoundary` wraps post/loop cards (2032, 2161) but **not** the astro / motivation / recommendation slides or the tab container — those can still blank the feed. | `2168-2181` |
| N7 | **LOW** | IntersectionObserver + per-slide 5s watch timers are rebuilt on every `searchVideos`/`neuralVideos`/`activeTab` change → observer churn on tab switching. | `305-350` |
| N8 | **LOW** | `useZoeProactiveNotifications.ts` is a **1-line re-export**; real behaviour lives in a Core file — polling behaviour unverified. | — |

### 9.3 Outer provider stack (above `App.tsx`, from `main.tsx:152-167`)
```
SystemFailureBoundary → HelmetProvider → LiquidUniverseProvider (3D/shader ctx)
  → ShapeShifterProvider → AutoHealProvider → DeviceTierProvider → ZoeProvider → App
```
So the true always-mounted count is **7 (main.tsx) + 19 (App.tsx) = 26 providers/side-effect mounts** before HomePage renders. `LiquidUniverseProvider`, `ZoeMonitorProvider`, `GlobalMediaProvider`, `ZoeUnifiedSelfHealerProvider`, `AutoHealProvider`, `MemoryLeakPlumberGlobal`, `DHFHeartbeatPulse` all run their own effects/intervals on every route.

### 9.4 Revised fix order
0. **Fix `HomePage.tsx:2528`** — hoist that `React.lazy` to module scope (1-line change, likely kills the module-script TypeError).
0b. **Filter the `posts` INSERT subscription** and debounce it to a single refetch instead of 3.
Then continue with §8 steps 1→12 unchanged.

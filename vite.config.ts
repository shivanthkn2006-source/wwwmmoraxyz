import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  assetsInclude: ['**/*.glb', '**/*.gltf', '**/*.usdz', '**/*.fbx'],
  define: {
    // In dev/preview, keep the app version STABLE across HMR restarts.
    // Otherwise every Vite restart changes __APP_VERSION__, which makes
    // checkAppVersion() purge SW + caches and force a `?v=...` reload on
    // every mount — the screen stays blank because React never finishes
    // mounting before the page is replaced.
    __APP_VERSION__: JSON.stringify(
      mode === 'production' ? new Date().toISOString() : 'dev-stable'
    ),
  },
  server: {
    host: "::",
    port: 8080,
    // Warm critical entry modules so the dev dep-optimizer settles BEFORE the
    // iframe starts requesting chunks. This prevents the "chunk-XXXX.js"
    // 404/import failures that happen when Vite re-bundles mid-session.
    warmup: {
      clientFiles: [
        './src/main.tsx',
        './src/App.tsx',
        './src/pages/Index.tsx',
      ],
    },
  },
  // ════════════════════════════════════════════════════════════════
  // STEP 1 — Vite Stabilization
  // Pre-declare heavy deps so the dev dep-optimizer does not re-discover
  // and re-hash them after the page has already loaded the old hash.
  // Root cause of: "Importing a module script failed.
  //   @ /node_modules/.vite/deps/chunk-XXXXX.js"
  // ════════════════════════════════════════════════════════════════
  optimizeDeps: {
    holdUntilCrawlEnd: true,
    include: [
      'react',
      'react-dom',
      'react-dom/client',
      'react-router-dom',
      'react/jsx-runtime',
      '@supabase/supabase-js',
      '@tanstack/react-query',
      'react-helmet-async',
      'lucide-react',
      'date-fns',
      'zod',
      'clsx',
      'tailwind-merge',
      'framer-motion',
      'sonner',
    ],
  },
  plugins: [
    react(), 
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: 'autoUpdate',
      // Guard: disable SW in dev and iframe preview contexts
      // Prevents stale chunk errors from skipWaiting + clientsClaim race in Lovable preview
      disable: mode === 'development',
      includeAssets: ['icon-512.png', 'icon-192.png'],
      manifest: {
        name: "Zoe Infinity",
        short_name: "Zoe",
        description: "The Infinite AI Companion - Ask Anything",
        theme_color: "#000000",
        background_color: "#000000",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        scope: "/",
        icons: [
          {
            src: "/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable"
          },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable"
          }
        ]
      },
      workbox: {
        // ═══════════════════════════════════════════════════════════════════════
        // HYBRID CACHING STRATEGY - Prevents "Offline Brain" from crashing browser
        // Pre-Cache: App Shell (HTML, JS, CSS, WASM) → Loads instantly
        // Runtime Cache: Heavy Brain Model (.bin) → Downloads on first chat, saves forever
        // ═══════════════════════════════════════════════════════════════════════
        
        // Include WASM engine files for instant offline capability
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,wasm}'],
        
        // OFFLINE FALLBACK: Show offline.html when no network and no cache
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api/, /^\/supabase/],
        
        // Increase limit to 5MB for WASM Engine (Executors) - NOT the 1GB model
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB for WASM, not brain model

        // Clean up old caches between deployments
        cleanupOutdatedCaches: true,

        // Immediate activation for offline-first experience
        clientsClaim: true,
        skipWaiting: true,

        // Precache offline fallback page
        additionalManifestEntries: [
          { url: '/offline.html', revision: '1.0.0' }
        ],

        // Avoid long-lived CacheFirst for JS/CSS (can cause stale-bundle -> "Importing a module script failed")
        // Prefer SWR/Network to keep bundles aligned after deployments.
        runtimeCaching: [
          // ═══════════════════════════════════════════════════════════════════
          // THE "BRAIN" CACHE RULE - CRITICAL FOR OFFLINE AI
          // This stops the 1GB model from blocking install.
          // It saves it to a special "zoe-brain-v1" cache ONLY after it 
          // successfully downloads once during runtime (lazy loading).
          // ═══════════════════════════════════════════════════════════════════
          {
            // Detect AI Model files (.bin) - Gemma, MediaPipe models
            urlPattern: ({ url }) => 
              url.pathname.endsWith('.bin') || 
              url.href.includes('mediapipe-models') ||
              url.href.includes('jmstore/kaggleweb'),
            
            // Strategy: "CacheFirst"
            // If it's in cache, use it (0 data). If not, download once.
            handler: 'CacheFirst',
            options: {
              cacheName: 'zoe-brain-v1',
              expiration: {
                maxEntries: 2, // Keep 2 brain versions max (save space)
                maxAgeSeconds: 60 * 60 * 24 * 365, // Keep for 1 Year
              },
              cacheableResponse: {
                statuses: [0, 200], // Cache even if server sends opaque response
              },
            },
          },
          // Do NOT runtime-cache backend API/auth traffic.
          // Caching these requests can cause stale/failed auth in normal browser profiles.
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkOnly',
          },
          // CSS files - NetworkFirst to avoid stale-bundle / Safari "Importing a module script failed"
          {
            urlPattern: /\.css$/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'css-cache',
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 2, // 2 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // JS files - NetworkFirst to keep HTML + chunks aligned after deployments
          {
            urlPattern: /\.(?:js|mjs)$/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'js-cache',
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 2, // 2 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },

          // FIX 1 companion: disable CacheFirst for media while debugging Safari cache mismatches
          // (keeps behavior consistent and reduces surprises during rollouts)
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'image-cache',
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },

          // 3D TEXTURE CACHING - TEMPORARILY NetworkFirst (debugging Safari stability)
          {
            urlPattern: /\.(?:gltf|glb|hdr|ktx2|bin|dds)$/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: '3d-texture-cache',
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 14 // 14 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          // Explicit Earth/Cloud textures from common CDNs
          {
            urlPattern: /(?:earth|cloud|globe|planet|atmosphere|starfield).*\.(?:jpg|png|webp)$/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: '3d-texture-cache',
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 14 // 14 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          // Google Fonts caching for offline typography
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /\/(registerSW\.js|~flock\.js)$/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'sw-scripts',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 7
              }
            }
          }
        ]
      }
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Stable, content-hashed chunk names. Same source ⇒ same hash across
        // deploys. Reduces the chance that a stale index.html references a
        // deleted chunk.
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        manualChunks: (id) => {
          // ════════════════════════════════════════════════════════════════
          // FIX #2 — Sovereign Zoe Infinity bundling
          // Force ALL Zoe Infinity sovereign sub-modules into a SINGLE
          // stable chunk. This prevents the cascade of lazy-chunk failures
          // ("Importing a module script failed.") that occurs when stale
          // index.html references deleted per-component chunks after a
          // deploy. One chunk = one filename to invalidate.
          // ════════════════════════════════════════════════════════════════
          if (
            id.includes('/pages/ZoeInfinity') ||
            id.includes('/components/zoe-infinity/') ||
            id.includes('/hooks/useZoeInfinity') ||
            id.includes('/hooks/useNanoStreamVoice') ||
            id.includes('/hooks/useNanoReflexArt') ||
            id.includes('/hooks/useAtmanArchive') ||
            id.includes('/hooks/useDestinyCompanion') ||
            id.includes('/hooks/useVedicEngine') ||
            id.includes('/hooks/useCircadianRhythm') ||
            id.includes('/hooks/useKarmicMemory') ||
            id.includes('/hooks/useZoeBioKernel') ||
            id.includes('/hooks/useEmotionalVoice') ||
            id.includes('/hooks/useOfflineWisdom') ||
            id.includes('/hooks/useZoeNickname') ||
            id.includes('/hooks/useZoeLanguage') ||
            id.includes('/hooks/useZoeInitiative') ||
            id.includes('/hooks/useGenesisConversation') ||
            id.includes('/hooks/useGenesisEffects') ||
            id.includes('/hooks/usePhantomMode') ||
            id.includes('/hooks/useHybridVoice') ||
            id.includes('/hooks/useWakeWord') ||
            id.includes('/hooks/useDocumentXray') ||
            id.includes('/hooks/useArtifactGenerator') ||
            id.includes('/hooks/useAutoProfiler') ||
            id.includes('/hooks/useZoeLocalContext') ||
            id.includes('/hooks/useConversationalOnboarding')
          ) {
            return 'zoe-infinity-sovereign';
          }
          // Vendor chunks
          if (id.includes('node_modules')) {
            if (id.includes('react-router') || id.includes('react-dom') || id.includes('/react/')) return 'react-vendor';
            if (id.includes('@radix-ui')) return 'ui-vendor';
            // Keep date helpers separate from Recharts. The previous shared
            // chart-vendor chunk loaded Recharts on every page that used
            // date-fns, and Recharts can trip a production circular-init crash
            // before React mounts, causing the live black screen.
            if (id.includes('date-fns')) return 'date-vendor';
            if (id.includes('recharts')) return 'recharts-vendor';
            if (id.includes('@supabase')) return 'supabase';
            if (id.includes('jspdf') || id.includes('html2canvas')) return 'pdf-vendor';
            if (id.includes('three') || id.includes('@react-three')) return 'three-vendor';
          }
        },
      },
    },
    chunkSizeWarningLimit: 1500,
  },
  test: {
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.{idea,git,cache,output,temp}/**',
      'tests/e2e/**',
    ],
  },
  esbuild: {
    // Strip console.log in production builds for performance
    drop: mode === 'production' ? ['console', 'debugger'] : [],
  },
}));

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
    // Dev only: the local dev server has no CDN asset route, so asset
    // pointers (/__l5e/assets-v1/...) returned the app page instead of the
    // 3D file. Forward them to the published site, which serves them.
    proxy: {
      '/__l5e': { target: 'https://www.mmora.xyz', changeOrigin: true, secure: true },
    },
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
      'scheduler',
      'react-router-dom',
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
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
      'recharts',
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
        navigateFallbackDenylist: [/^\/api/, /^\/supabase/, /^\/~oauth/],
        
        // Increase limit to 5MB for WASM Engine (Executors) - NOT the 1GB model
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB for WASM, not brain model

        // Clean up old caches between deployments
        cleanupOutdatedCaches: true,

        // Immediate activation for offline-first experience
        clientsClaim: true,
        skipWaiting: true,

        // Background ring handler for incoming calls (additive: only adds push events)
        importScripts: ['/push-handler.js'],

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
    // One React copy only: prevents "dispatcher.useState is null" when the
    // dep optimizer splits react into two chunks after a re-bundle.
    dedupe: [
      "react",
      "react-dom",
      "react-dom/client",
      "scheduler",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
    ],
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
          // Only Zoe Infinity pages/components are grouped. Shared hooks used
          // to live here too, which dragged this 2.2 MB bundle into startup
          // for every M'Mora visitor. Heavy libraries (3D, PDF, charts) are
          // left to Rollup's natural lazy chunks for the same reason.
          // Vendor chunks
          if (id.includes('node_modules')) {
            // React core + everything that touches React hooks at module scope
            // MUST live in ONE chunk. Splitting zustand into its own
            // "agent-vendor" chunk made it evaluate before React was
            // initialized in Safari -> "undefined is not an object (E.useState)".
            if (
              id.includes('node_modules/react/') ||
              id.includes('node_modules/react-dom/') ||
              id.includes('node_modules/scheduler/') ||
              id.includes('node_modules/use-sync-external-store/') ||
              id.includes('react-router') ||
              id.includes('zustand')
            ) {
              return 'react-vendor';
            }

            if (id.includes('@radix-ui')) return 'ui-vendor';
            if (id.includes('date-fns')) return 'date-vendor';
            if (id.includes('@supabase')) return 'supabase';
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

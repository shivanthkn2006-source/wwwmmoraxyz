import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  define: {
    __APP_VERSION__: JSON.stringify(new Date().toISOString()),
  },
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(), 
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: 'autoUpdate',
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
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-cache',
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
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
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-tabs'],
          'chart-vendor': ['recharts', 'date-fns'],
          'supabase': ['@supabase/supabase-js'],
          'pdf-vendor': ['jspdf', 'html2canvas'],
          'three-vendor': ['three', '@react-three/fiber', '@react-three/drei'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  esbuild: {
    // Strip console.log in production builds for performance
    drop: mode === 'production' ? ['console', 'debugger'] : [],
  },
}));

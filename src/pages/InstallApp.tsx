/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ZOE INFINITY — PWA INSTALL PAGE
 * Guides users through installing the app on their device
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Download, Smartphone, Monitor, CheckCircle, Share, Plus, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PageSeo from '@/components/seo/PageSeo';
import { ROUTE_SEO } from '@/config/routeSeo';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallApp() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [installStatus, setInstallStatus] = useState<'idle' | 'installing' | 'success'>('idle');

  useEffect(() => {
    // Detect platform
    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream);
    setIsAndroid(/Android/.test(ua));

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Listen for install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    
    // Listen for successful install
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setInstallStatus('success');
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    setInstallStatus('installing');
    
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setInstallStatus('success');
      } else {
        setInstallStatus('idle');
      }
    } catch (error) {
      console.error('Install failed:', error);
      setInstallStatus('idle');
    }
    
    setDeferredPrompt(null);
  };

  if (isInstalled) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md"
        >
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="text-2xl font-semibold mb-3">Already Installed!</h1>
          <p className="text-muted-foreground mb-6">
            Zoe Infinity is installed on your device. Open it from your home screen for the best experience.
          </p>
          <Button variant="outline" onClick={() => window.location.href = '/zoe-infinity'}>
            Open Zoe Infinity
          </Button>
        </motion.div>
      </div>
    );
  }

return (
    <>
      <PageSeo title={ROUTE_SEO['/install'].title} description={ROUTE_SEO['/install'].description} path="/install" />
    <div className="min-h-screen bg-gradient-to-b from-background to-background/95">
      {/* Hero */}
      <div className="px-6 pt-16 pb-12 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center border border-primary/20">
            <Download className="w-12 h-12 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-3 bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
            Install Zoe Infinity
          </h1>
          <p className="text-muted-foreground max-w-sm mx-auto">
            Get the full experience with offline access, faster loading, and native app features.
          </p>
        </motion.div>
      </div>

      {/* Install Options */}
      <div className="px-6 max-w-lg mx-auto space-y-6">
        {/* Chrome/Edge Install Button */}
        {deferredPrompt && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Button 
              onClick={handleInstall}
              disabled={installStatus === 'installing'}
              className="w-full h-14 text-lg bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90"
            >
              {installStatus === 'installing' ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Installing...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5 mr-2" />
                  Install Now
                </>
              )}
            </Button>
          </motion.div>
        )}

        {/* iOS Instructions */}
        {isIOS && !deferredPrompt && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-card border border-border rounded-xl p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <Smartphone className="w-6 h-6 text-primary" />
              <h2 className="font-semibold">Install on iPhone/iPad</h2>
            </div>
            <ol className="space-y-4 text-sm">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-medium">1</span>
                <span>Tap the <Share className="w-4 h-4 inline mx-1" /> Share button in Safari</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-medium">2</span>
                <span>Scroll down and tap <Plus className="w-4 h-4 inline mx-1" /> "Add to Home Screen"</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-medium">3</span>
                <span>Tap "Add" in the top right corner</span>
              </li>
            </ol>
          </motion.div>
        )}

        {/* Android Instructions (when no prompt) */}
        {isAndroid && !deferredPrompt && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-card border border-border rounded-xl p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <Smartphone className="w-6 h-6 text-primary" />
              <h2 className="font-semibold">Install on Android</h2>
            </div>
            <ol className="space-y-4 text-sm">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-medium">1</span>
                <span>Tap <MoreVertical className="w-4 h-4 inline mx-1" /> Menu in Chrome</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-medium">2</span>
                <span>Tap "Add to Home screen" or "Install app"</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-medium">3</span>
                <span>Tap "Install" to confirm</span>
              </li>
            </ol>
          </motion.div>
        )}

        {/* Desktop Instructions */}
        {!isIOS && !isAndroid && !deferredPrompt && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-card border border-border rounded-xl p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <Monitor className="w-6 h-6 text-primary" />
              <h2 className="font-semibold">Install on Desktop</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Look for the install icon in your browser's address bar, or:
            </p>
            <ol className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-medium">1</span>
                <span>Click the menu (⋮) in Chrome or Edge</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-medium">2</span>
                <span>Select "Install Zoe Infinity..."</span>
              </li>
            </ol>
          </motion.div>
        )}

        {/* Benefits */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-2 gap-3 pt-6"
        >
          {[
            { icon: '⚡', label: 'Instant Loading' },
            { icon: '📴', label: 'Works Offline' },
            { icon: '🔔', label: 'Notifications' },
            { icon: '🎯', label: 'Full Screen' },
          ].map((benefit, i) => (
            <div key={i} className="bg-card/50 border border-border/50 rounded-lg p-3 text-center">
              <div className="text-2xl mb-1">{benefit.icon}</div>
              <div className="text-xs text-muted-foreground">{benefit.label}</div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Skip Link */}
      <div className="text-center py-8">
        <a href="/zoe-infinity" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          Continue in browser →
        </a>
      </div>
    </div>
    </>
  );
}

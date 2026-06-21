import { useState, useEffect } from 'react';
import { Download, X, Smartphone, Share, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Detect iOS
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(ios);

    // Check if already installed
    const standalone = window.matchMedia('(display-mode: standalone)').matches 
      || (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    if (standalone) return;

    // Android/Chrome install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      const dismissed = localStorage.getItem('pwa-prompt-dismissed');
      const lastShown = localStorage.getItem('pwa-prompt-last-shown');
      const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
      
      if (!dismissed && (!lastShown || parseInt(lastShown) < dayAgo)) {
        setTimeout(() => setShowPrompt(true), 2000);
        localStorage.setItem('pwa-prompt-last-shown', Date.now().toString());
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Show iOS prompt after delay
    if (ios && !standalone) {
      const dismissed = localStorage.getItem('pwa-prompt-dismissed');
      if (!dismissed) {
        setTimeout(() => setShowPrompt(true), 3000);
      }
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowPrompt(false);
      localStorage.setItem('pwa-installed', 'true');
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-prompt-dismissed', 'true');
  };

  if (!showPrompt || isStandalone) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -50, scale: 0.9 }}
        className="fixed top-4 left-4 right-4 z-[9999]"
      >
        <div className="bg-background/95 backdrop-blur-xl border border-primary/30 rounded-2xl shadow-2xl shadow-primary/20 p-5 max-w-md mx-auto">
          <div className="flex items-start gap-4">
            {/* Animated Icon */}
            <motion.div
              animate={{ 
                boxShadow: ['0 0 20px rgba(139, 92, 246, 0.3)', '0 0 40px rgba(139, 92, 246, 0.6)', '0 0 20px rgba(139, 92, 246, 0.3)']
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="flex-shrink-0 w-14 h-14 bg-gradient-to-br from-primary via-purple-500 to-pink-500 rounded-xl flex items-center justify-center"
            >
              <Smartphone className="w-7 h-7 text-white" />
            </motion.div>
            
            <div className="flex-1">
              <h3 className="font-bold text-lg bg-gradient-to-r from-primary to-pink-500 bg-clip-text text-transparent">
                Install Zoe Infinity
              </h3>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                {isIOS 
                  ? "Add Zoe to your home screen for the full experience"
                  : "Get instant access with offline support & push notifications"
                }
              </p>
              
              {isIOS ? (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Share className="w-4 h-4 text-primary" />
                    <span>Tap <strong>Share</strong> button below</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Plus className="w-4 h-4 text-primary" />
                    <span>Select <strong>"Add to Home Screen"</strong></span>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2 mt-3">
                  <Button 
                    onClick={handleInstall} 
                    size="sm" 
                    className="bg-gradient-to-r from-primary to-pink-500 hover:from-primary/90 hover:to-pink-500/90 text-white font-medium"
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Install Now
                  </Button>
                  <Button 
                    onClick={handleDismiss} 
                    variant="ghost" 
                    size="sm"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Later
                  </Button>
                </div>
              )}
            </div>
            
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 p-1 rounded-full hover:bg-muted transition-colors"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default InstallPrompt;

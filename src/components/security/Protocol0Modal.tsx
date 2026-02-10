import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Shield, Lock, Server, Fingerprint, AlertTriangle } from 'lucide-react';

interface Protocol0ModalProps {
  trigger?: React.ReactNode;
  onAccept?: () => void;
}

const Protocol0Modal: React.FC<Protocol0ModalProps> = ({ trigger, onAccept }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [accepted, setAccepted] = useState(false);

  const handleAccept = () => {
    setAccepted(true);
    localStorage.setItem('protocol0-accepted', JSON.stringify({
      accepted: true,
      timestamp: new Date().toISOString()
    }));
    onAccept?.();
    setTimeout(() => setIsOpen(false), 1000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon" className="text-primary hover:bg-primary/10">
            <Shield className="w-5 h-5" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl bg-[hsl(var(--omega-void))] border border-primary/30 p-0 overflow-hidden">
        {/* Animated Grid Background */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `linear-gradient(hsl(var(--primary)/0.3) 1px, transparent 1px),
                              linear-gradient(90deg, hsl(var(--primary)/0.3) 1px, transparent 1px)`,
            backgroundSize: '20px 20px'
          }} />
        </div>

        {/* Rotating Padlock Icon - GPU Accelerated */}
        <div className="flex justify-center pt-8 pb-4 relative">
          <div className="relative animate-gpu-rotate-y-8s" style={{ transformStyle: 'preserve-3d' }}>
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/40">
              <Lock className="w-12 h-12 text-primary" />
            </div>
            <div className="absolute inset-0 rounded-full border-2 border-primary/50 animate-gpu-ring-expand" />
          </div>
        </div>

        {/* Terminal Content */}
        <div className="p-6 font-mono text-sm space-y-4 relative">
          <h2 className="text-destructive text-lg font-bold text-center tracking-wider uppercase">
            ⚠️ WARNING: YOU ARE LEAVING THE PUBLIC WEB
          </h2>

          <div className="space-y-4 text-green-400/90 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
            {/* Section 1 */}
            <div className="space-y-2">
              <p className="text-primary font-bold">1. THE PRINCIPLE OF ZERO KNOWLEDGE</p>
              <p className="leading-relaxed">
                M'mora defines your data not as "content," but as <span className="text-accent">Digital Human Freight (DHF)</span>. 
                When you enter, your memories are encrypted locally using your biometric signature. 
                <span className="text-yellow-400"> We hold the lock; only you hold the key.</span>
              </p>
            </div>

            {/* Section 2 - Permadeath Warning */}
            <div className="space-y-2 bg-destructive/10 border border-destructive/30 p-3 rounded">
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-4 h-4" />
                <p className="font-bold">2. THE PERMADEATH CLAUSE</p>
              </div>
              <p className="leading-relaxed text-destructive/80">
                Because we possess <span className="underline">no backdoor</span>, we CANNOT recover your account if 
                you lose your credentials. There is no "Forgot Password." If you lose your key, 
                <span className="text-destructive font-bold"> your digital soul is lost to the void</span>. 
                This is the price of true privacy.
              </p>
            </div>

            {/* Section 3 - Immunity */}
            <div className="space-y-2">
              <p className="text-primary font-bold">3. IMMUNITY</p>
              <p className="leading-relaxed">
                M'mora complies with government surveillance by strictly adhering to 
                the <span className="text-primary">IMPOSSIBILITY OF COMPLIANCE</span>. If served a warrant, 
                we can only provide <span className="text-muted-foreground">encrypted static</span>—unreadable, unbreakable code.
              </p>
            </div>

            {/* Final Declaration */}
            <div className="border-t border-primary/30 pt-4 mt-4">
              <p className="text-accent italic text-center text-base">
                By proceeding, you acknowledge that you are the sole custodian of your mind.
              </p>
            </div>
          </div>

          {/* Live Status Indicators - GPU Accelerated */}
          <div className="border-t border-primary/30 pt-4 mt-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-gpu-status-green" />
                <span className="text-green-400">Encryption: AES-256 [ACTIVE]</span>
              </div>
              <Lock className="w-3 h-3 text-green-400" />
            </div>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-gpu-status-red" />
                <span className="text-red-400">Server Access: [DENIED]</span>
              </div>
              <Server className="w-3 h-3 text-red-400" />
            </div>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary animate-gpu-status-primary" />
                <span className="text-primary">User Key: [HELD BY DEVICE]</span>
              </div>
              <Fingerprint className="w-3 h-3 text-primary" />
            </div>
          </div>

          {/* Accept Button */}
          <AnimatePresence>
            {!accepted ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <Button
                  onClick={handleAccept}
                  className="w-full bg-gradient-to-r from-primary/80 to-accent/80 hover:from-primary hover:to-accent text-foreground font-mono tracking-wider"
                >
                  I Accept the Risk. Encrypt My Soul.
                </Button>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center text-green-400 font-bold py-3"
              >
                ✓ SOUL ENCRYPTED. WELCOME TO THE EXODUS.
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default Protocol0Modal;

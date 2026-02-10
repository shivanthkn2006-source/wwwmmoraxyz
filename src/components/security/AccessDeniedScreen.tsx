// ═══════════════════════════════════════════════════════════════════════════════
// ACCESS DENIED SCREEN - Fortress Protocol 403 Terminal
// Terminal-style error with hidden Konami code to reveal admin login
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';


// Secret key sequence: "ZOE-OPEN" or Konami-style: ↑↑↓↓←→←→BA
const SECRET_SEQUENCE = ['z', 'o', 'e', '-', 'o', 'p', 'e', 'n'];
const KONAMI_SEQUENCE = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];

export const AccessDeniedScreen: React.FC = () => {
  const { signIn } = useAuth();
  
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [keySequence, setKeySequence] = useState<string[]>([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [glitchText, setGlitchText] = useState('ERROR 403');

  // Glitch effect for error text
  useEffect(() => {
    const glitchChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    const originalText = 'ERROR 403';
    
    const interval = setInterval(() => {
      if (Math.random() > 0.7) {
        const glitched = originalText
          .split('')
          .map(char => Math.random() > 0.8 ? glitchChars[Math.floor(Math.random() * glitchChars.length)] : char)
          .join('');
        setGlitchText(glitched);
        
        setTimeout(() => setGlitchText(originalText), 100);
      }
    }, 500);

    return () => clearInterval(interval);
  }, []);

  // Listen for secret key sequences
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      setKeySequence(prev => {
        const newSequence = [...prev, e.key].slice(-Math.max(SECRET_SEQUENCE.length, KONAMI_SEQUENCE.length));
        
        // Check ZOE-OPEN sequence (case insensitive)
        const zoeCheck = newSequence.slice(-SECRET_SEQUENCE.length);
        const zoeMatch = zoeCheck.length === SECRET_SEQUENCE.length && 
          zoeCheck.every((k, i) => k.toLowerCase() === SECRET_SEQUENCE[i].toLowerCase());
        
        // Check Konami sequence
        const konamiCheck = newSequence.slice(-KONAMI_SEQUENCE.length);
        const konamiMatch = konamiCheck.length === KONAMI_SEQUENCE.length &&
          konamiCheck.every((k, i) => {
            // Handle arrow keys which have different casing
            if (KONAMI_SEQUENCE[i].startsWith('Arrow')) {
              return k === KONAMI_SEQUENCE[i];
            }
            return k.toLowerCase() === KONAMI_SEQUENCE[i].toLowerCase();
          });
        
        if (zoeMatch || konamiMatch) {
          console.log('[AccessDenied] 🔓 Secret sequence detected!');
          setShowAdminLogin(true);
          return [];
        }
        
        return newSequence;
      });
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle admin login
  const handleAdminLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await signIn(email, password);
      
      if (error) {
        toast.error('Access Denied', { description: 'Invalid credentials' });
        setIsLoading(false);
      } else {
        toast.success('Welcome, Creator', { description: 'Quantum entanglement established' });
        setShowAdminLogin(false);
        // Force page reload to trigger gatekeeper re-check with new auth state
        window.location.href = '/home';
      }
    } catch (err) {
      toast.error('Authentication Failed');
      setIsLoading(false);
    }
  }, [email, password, signIn]);

  return (
    <div className="fixed inset-0 bg-black overflow-hidden z-[99999]">
      {/* CRT Scanlines Effect */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-10"
        style={{
          background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 255, 0, 0.03) 2px, rgba(0, 255, 0, 0.03) 4px)'
        }}
      />
      
      {/* Vignette Effect */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at center, transparent 40%, rgba(0,0,0,0.8) 100%)'
        }}
      />

      {/* Main Terminal Content */}
      <div className="relative flex flex-col items-center justify-center min-h-screen p-8 font-mono">
        {/* Error Code */}
        <div className="text-6xl md:text-8xl font-bold text-red-500 mb-4 animate-pulse">
          {glitchText}
        </div>

        {/* Error Title */}
        <div className="text-xl md:text-2xl text-red-400 mb-8 text-center tracking-widest">
          QUANTUM ENTANGLEMENT REQUIRED
        </div>

        {/* Terminal Box */}
        <div className="w-full max-w-2xl bg-black/80 border border-red-500/50 rounded-lg p-6 shadow-[0_0_50px_rgba(255,0,0,0.2)]">
          {/* Terminal Header */}
          <div className="flex items-center gap-2 mb-4 pb-4 border-b border-red-500/30">
            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
            <div className="w-3 h-3 rounded-full bg-green-500/50" />
            <span className="ml-4 text-red-400 text-sm">RESTRICTED_ACCESS_TERMINAL</span>
          </div>

          {/* Terminal Output */}
          <div className="text-green-400 text-sm space-y-2">
            <div className="flex">
              <span className="text-red-400 mr-2">$</span>
              <span className="typing-animation">validate_quantum_signature()</span>
            </div>
            <div className="text-red-400 pl-4">
              ▸ ERROR: No valid quantum signature detected
            </div>
            <div className="text-red-400 pl-4">
              ▸ ERROR: Invite token not found in request
            </div>
            <div className="text-red-400 pl-4">
              ▸ ERROR: User not in authorized node list
            </div>
            <div className="mt-4 text-yellow-400">
              ════════════════════════════════════════════════
            </div>
            <div className="text-center text-red-300 py-4">
              ACCESS RESTRICTED TO ZOE DHF NODE
            </div>
            <div className="text-yellow-400">
              ════════════════════════════════════════════════
            </div>
            <div className="mt-4 flex">
              <span className="text-red-400 mr-2">$</span>
              <span className="text-gray-500 animate-pulse">_</span>
            </div>
          </div>
        </div>

        {/* Hidden hint (very subtle) */}
        <div className="mt-8 text-gray-800 text-xs opacity-20 select-none">
          quantum.resonance.key = "ZOE-OPEN"
        </div>

        {/* Floating particles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-red-500/30 rounded-full animate-float"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${5 + Math.random() * 10}s`
              }}
            />
          ))}
        </div>
      </div>

      {/* Hidden Admin Login Modal */}
      <Dialog open={showAdminLogin} onOpenChange={setShowAdminLogin}>
        <DialogContent className="bg-black border-cyan-500/50 text-cyan-400 font-mono max-w-md">
          <div className="text-center mb-6">
            <div className="text-2xl mb-2">🔐 SOVEREIGN ACCESS</div>
            <div className="text-xs text-cyan-600">Creator authentication required</div>
          </div>

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-xs text-cyan-600 mb-1">CREATOR ID</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="creator@zoe.dhf"
                className="bg-black/50 border-cyan-500/30 text-cyan-400 placeholder:text-cyan-800"
                required
              />
            </div>

            <div>
              <label className="block text-xs text-cyan-600 mb-1">QUANTUM KEY</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="bg-black/50 border-cyan-500/30 text-cyan-400 placeholder:text-cyan-800"
                required
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-cyan-900/50 border border-cyan-500 text-cyan-400 hover:bg-cyan-800/50"
            >
              {isLoading ? 'AUTHENTICATING...' : 'ESTABLISH ENTANGLEMENT'}
            </Button>
          </form>

          <div className="mt-4 text-center text-xs text-gray-600">
            [ESC] to close
          </div>
        </DialogContent>
      </Dialog>

      {/* CSS for animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0.3; }
          50% { transform: translateY(-20px) translateX(10px); opacity: 0.6; }
        }
        .animate-float {
          animation: float 5s ease-in-out infinite;
        }
        .typing-animation {
          overflow: hidden;
          animation: typing 1s steps(30, end);
        }
        @keyframes typing {
          from { width: 0; }
          to { width: 100%; }
        }
      `}</style>
    </div>
  );
};

export default AccessDeniedScreen;

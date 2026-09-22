// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN TOOLBAR - "God Button" Floating Panel for Root Admins
// Visible only to ROOT_ADMINS, provides quick security toggles
// Draggable - positioned below ZOE-FLOATING-ORB by default
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ShieldOff, Eye, EyeOff, Trash2, Settings, X, Zap } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useDevMode } from './DevModeContext';

export const AdminToolbar: React.FC = () => {
  const location = useLocation();
  const constraintsRef = useRef<HTMLDivElement>(null);
  const {
    isAdmin,
    isDevMode,
    adminUsername,
    securityEnabled,
    simulateUserView,
    toggleDevMode,
    toggleSecurity,
    toggleSimulateUser,
    clearCache,
  } = useDevMode();

  const [isOpen, setIsOpen] = useState(false);

  // Listen for HUD trigger to open admin toolbar
  React.useEffect(() => {
    const handleOpenToolbar = () => {
      setIsOpen(true);
    };
    
    window.addEventListener('open-admin-toolbar', handleOpenToolbar);
    return () => window.removeEventListener('open-admin-toolbar', handleOpenToolbar);
  }, []);

  // Only show on home page
  if (location.pathname !== '/home') return null;

  // Only render for admins
  if (!isAdmin) return null;

  // Panel is triggered from HUD - no floating button needed
  return (
    <>
      {/* Invisible drag constraint boundary (kept for panel positioning) */}
      <div 
        ref={constraintsRef}
        className="fixed inset-0 pointer-events-none"
        style={{ zIndex: 99997 }}
      />

      {/* Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="admin-liquid-panel fixed bottom-20 right-4 z-[99998] w-72 overflow-hidden rounded-lg border"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b p-3">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                <span className="font-mono text-sm">SOVEREIGN CONTROL</span>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground" aria-label="Close sovereign control">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Admin Info */}
            <div className="border-b p-3">
              <div className="font-mono text-xs text-muted-foreground">LOGGED IN AS</div>
              <div className="font-mono">@{adminUsername}</div>
            </div>

            {/* Controls */}
            <div className="p-3 space-y-2">
              {/* Dev Mode Toggle */}
              <button
                onClick={toggleDevMode}
                className={`w-full flex items-center justify-between p-2 rounded ${
                  isDevMode ? 'border border-foreground/45 bg-foreground/10' : 'border border-foreground/20 bg-transparent'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  <span className="text-sm">Dev Mode</span>
                </div>
                <span className={`text-xs font-mono ${isDevMode ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {isDevMode ? 'ON' : 'OFF'}
                </span>
              </button>

              {/* Security Toggle */}
              <button
                onClick={toggleSecurity}
                className={`w-full flex items-center justify-between p-2 rounded ${
                  securityEnabled ? 'border border-foreground/45 bg-foreground/10' : 'border border-foreground/20 bg-transparent'
                }`}
              >
                <div className="flex items-center gap-2">
                  {securityEnabled ? <Shield className="w-4 h-4" /> : <ShieldOff className="w-4 h-4" />}
                  <span className="text-sm">Security Systems</span>
                </div>
                <span className={`text-xs font-mono ${securityEnabled ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {securityEnabled ? 'ON' : 'OFF'}
                </span>
              </button>

              {/* Simulate User View */}
              <button
                onClick={toggleSimulateUser}
                className={`w-full flex items-center justify-between p-2 rounded ${
                  simulateUserView ? 'border border-foreground/45 bg-foreground/10' : 'border border-foreground/20 bg-transparent'
                }`}
              >
                <div className="flex items-center gap-2">
                  {simulateUserView ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  <span className="text-sm">Simulate User View</span>
                </div>
                <span className={`text-xs font-mono ${simulateUserView ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {simulateUserView ? 'ON' : 'OFF'}
                </span>
              </button>

              {/* Clear Cache */}
              <button
                onClick={clearCache}
                className="flex w-full items-center justify-between rounded border border-foreground/20 bg-transparent p-2 transition-colors hover:border-foreground/45 hover:bg-foreground/10"
              >
                <div className="flex items-center gap-2">
                  <Trash2 className="w-4 h-4" />
                  <span className="text-sm">Clear Cache</span>
                </div>
              </button>
            </div>

            {/* Status Footer */}
            <div className="border-t p-2 text-center font-mono text-xs text-muted-foreground">
              {isDevMode ? '🔓 DEV MODE ACTIVE' : '🔒 PRODUCTION MODE'}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AdminToolbar;

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
            className="fixed bottom-20 right-4 z-[99998] w-72 bg-black/95 border border-purple-500/30 rounded-lg shadow-xl shadow-purple-500/20 overflow-hidden"
          >
            {/* Header */}
            <div className="p-3 border-b border-purple-500/30 flex items-center justify-between bg-purple-500/10">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-purple-400" />
                <span className="text-purple-300 font-mono text-sm">SOVEREIGN CONTROL</span>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Admin Info */}
            <div className="p-3 border-b border-purple-500/20">
              <div className="text-xs text-gray-500 font-mono">LOGGED IN AS</div>
              <div className="text-cyan-400 font-mono">@{adminUsername}</div>
            </div>

            {/* Controls */}
            <div className="p-3 space-y-2">
              {/* Dev Mode Toggle */}
              <button
                onClick={toggleDevMode}
                className={`w-full flex items-center justify-between p-2 rounded ${
                  isDevMode ? 'bg-green-500/20 border border-green-500/30' : 'bg-gray-800/50 border border-gray-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  <span className="text-sm">Dev Mode</span>
                </div>
                <span className={`text-xs font-mono ${isDevMode ? 'text-green-400' : 'text-gray-500'}`}>
                  {isDevMode ? 'ON' : 'OFF'}
                </span>
              </button>

              {/* Security Toggle */}
              <button
                onClick={toggleSecurity}
                className={`w-full flex items-center justify-between p-2 rounded ${
                  securityEnabled ? 'bg-cyan-500/20 border border-cyan-500/30' : 'bg-red-500/20 border border-red-500/30'
                }`}
              >
                <div className="flex items-center gap-2">
                  {securityEnabled ? <Shield className="w-4 h-4" /> : <ShieldOff className="w-4 h-4" />}
                  <span className="text-sm">Security Systems</span>
                </div>
                <span className={`text-xs font-mono ${securityEnabled ? 'text-cyan-400' : 'text-red-400'}`}>
                  {securityEnabled ? 'ON' : 'OFF'}
                </span>
              </button>

              {/* Simulate User View */}
              <button
                onClick={toggleSimulateUser}
                className={`w-full flex items-center justify-between p-2 rounded ${
                  simulateUserView ? 'bg-orange-500/20 border border-orange-500/30' : 'bg-gray-800/50 border border-gray-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  {simulateUserView ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  <span className="text-sm">Simulate User View</span>
                </div>
                <span className={`text-xs font-mono ${simulateUserView ? 'text-orange-400' : 'text-gray-500'}`}>
                  {simulateUserView ? 'ON' : 'OFF'}
                </span>
              </button>

              {/* Clear Cache */}
              <button
                onClick={clearCache}
                className="w-full flex items-center justify-between p-2 rounded bg-gray-800/50 border border-gray-700 hover:bg-red-500/20 hover:border-red-500/30 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Trash2 className="w-4 h-4" />
                  <span className="text-sm">Clear Cache</span>
                </div>
              </button>
            </div>

            {/* Status Footer */}
            <div className="p-2 bg-black/50 border-t border-purple-500/20 text-xs font-mono text-gray-500 text-center">
              {isDevMode ? '🔓 DEV MODE ACTIVE' : '🔒 PRODUCTION MODE'}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AdminToolbar;

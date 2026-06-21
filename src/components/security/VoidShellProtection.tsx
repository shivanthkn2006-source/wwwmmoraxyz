// ═══════════════════════════════════════════════════════════════════════════════
// VOID SHELL PROTECTION - Black Box Protocol Layer 1
// Frontend hardening: Context menu blocking, selection prevention, shortcut interception
// Neural Watermarking for forensic tracing
// Integrated with DHF Core via centralized security config
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useEffect, useCallback, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth';
import { useDevMode } from './DevModeContext';
import { 
  checkRootAdminStatus, 
  logSecurityEvent,
  SECURITY_EVENTS,
  SECURITY_CATEGORIES 
} from './securityConfig';

interface VoidShellProtectionProps {
  children: React.ReactNode;
  enabled?: boolean;
}

// Blocked key combinations
const BLOCKED_SHORTCUTS = [
  { key: 'I', ctrl: true, shift: true }, // DevTools
  { key: 'J', ctrl: true, shift: true }, // Console
  { key: 'C', ctrl: true, shift: true }, // Elements
  { key: 'U', ctrl: true, shift: false }, // View Source
  { key: 'S', ctrl: true, shift: false }, // Save Page
  { key: 'F12', ctrl: false, shift: false }, // DevTools
  { key: 'P', ctrl: true, shift: false }, // Print
];

export const VoidShellProtection: React.FC<VoidShellProtectionProps> = ({ 
  children, 
  enabled = true 
}) => {
  const { user } = useAuth();
  const { isAdmin, isDevMode, securityEnabled, simulateUserView } = useDevMode();
  const [flashRed, setFlashRed] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);

  // Determine if protection should be active
  // Admin bypass: Only bypass if admin AND (devMode active OR security disabled) AND NOT simulating user
  const shouldBypass = isAdmin && (isDevMode || !securityEnabled) && !simulateUserView;

  // Log intrusion attempt to database
  const logIntrusionAttempt = useCallback(async (type: string, details: string) => {
    if (!user || shouldBypass) return;
    
    await logSecurityEvent(
      user.id,
      SECURITY_EVENTS.INTRUSION_ATTEMPT,
      SECURITY_CATEGORIES.VIOLATION,
      `${type}: ${details}`,
      { attempt_type: type, details }
    );
  }, [user, shouldBypass]);

  // Play error sound effect
  const playErrorSound = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 150;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.1;
      
      oscillator.start();
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (e) {
      // Audio not available
    }
  }, []);

  // Flash red screen effect
  const triggerFlash = useCallback(() => {
    setFlashRed(true);
    playErrorSound();
    setAttemptCount(prev => prev + 1);
    
    setTimeout(() => setFlashRed(false), 200);
  }, [playErrorSound]);

  // Block context menu (right-click)
  const handleContextMenu = useCallback((e: MouseEvent) => {
    // Allow for admins with dev mode
    if (!enabled || shouldBypass) return;
    
    e.preventDefault();
    triggerFlash();
    
    toast.error('🔒 Access Denied', {
      description: 'Restricted. Zoe ID logged.',
      duration: 2000
    });
    
    logIntrusionAttempt('context_menu', 'Right-click attempt blocked');
  }, [enabled, shouldBypass, triggerFlash, logIntrusionAttempt]);

  // Block keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Allow for admins with dev mode
    if (!enabled || shouldBypass) return;
    
    const isBlocked = BLOCKED_SHORTCUTS.some(shortcut => {
      const keyMatch = e.key.toUpperCase() === shortcut.key.toUpperCase() || 
                       e.code === shortcut.key;
      const ctrlMatch = shortcut.ctrl ? (e.ctrlKey || e.metaKey) : true;
      const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;
      
      return keyMatch && ctrlMatch && shiftMatch;
    });
    
    if (isBlocked) {
      e.preventDefault();
      e.stopPropagation();
      triggerFlash();
      
      toast.error('🔒 Shortcut Blocked', {
        description: 'Security protocol active. Action logged.',
        duration: 2000
      });
      
      logIntrusionAttempt('keyboard_shortcut', `Blocked: ${e.key} with Ctrl:${e.ctrlKey} Shift:${e.shiftKey}`);
    }
  }, [enabled, shouldBypass, triggerFlash, logIntrusionAttempt]);

  // Block copy attempts on protected content
  const handleCopy = useCallback((e: ClipboardEvent) => {
    // Allow for admins with dev mode
    if (!enabled || shouldBypass) return;
    
    const selection = window.getSelection();
    const selectedText = selection?.toString() || '';
    
    // Allow copying from input fields
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
      return;
    }
    
    if (selectedText.length > 0) {
      e.preventDefault();
      triggerFlash();
      
      toast.error('🔒 Copy Blocked', {
        description: 'Content is protected. Incident logged.',
        duration: 2000
      });
      
      logIntrusionAttempt('copy_attempt', `Tried to copy ${selectedText.length} characters`);
    }
  }, [enabled, shouldBypass, triggerFlash, logIntrusionAttempt]);

  // Block drag events
  const handleDragStart = useCallback((e: DragEvent) => {
    // Allow for admins with dev mode
    if (!enabled || shouldBypass) return;
    
    const target = e.target as HTMLElement;
    if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
      e.preventDefault();
    }
  }, [enabled, shouldBypass]);

  // Attach event listeners
  useEffect(() => {
    // Don't attach if disabled or admin with dev mode
    if (!enabled || shouldBypass) return;

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('dragstart', handleDragStart);

    // Inject global styles for text selection prevention
    const style = document.createElement('style');
    style.id = 'void-shell-styles';
    style.textContent = `
      body:not(input):not(textarea):not([contenteditable="true"]) {
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
      }
      input, textarea, [contenteditable="true"] {
        -webkit-user-select: text;
        -moz-user-select: text;
        -ms-user-select: text;
        user-select: text;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('dragstart', handleDragStart);
      
      const existingStyle = document.getElementById('void-shell-styles');
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, [enabled, shouldBypass, handleContextMenu, handleKeyDown, handleCopy, handleDragStart]);

  return (
    <>
      {/* Neural Watermark - Invisible forensic tracing layer (not for admins with dev mode) */}
      {user && enabled && !shouldBypass && (
        <div
          className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden select-none"
          style={{ opacity: 0.001 }}
          aria-hidden="true"
        >
          <div className="w-full h-full flex flex-wrap text-[6px] text-black dark:text-white">
            {Array.from({ length: 500 }).map((_, i) => (
              <span key={i} className="p-1">
                {user.id}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Flash Red Overlay */}
      {flashRed && (
        <div 
          className="fixed inset-0 bg-red-600/30 pointer-events-none z-[10000] animate-pulse"
          aria-hidden="true"
        />
      )}

      {/* Attempt Counter Warning */}
      {attemptCount >= 3 && !shouldBypass && (
        <div className="fixed top-4 right-4 z-[10001] bg-red-900/90 text-white px-4 py-2 rounded-lg text-sm animate-pulse">
          ⚠️ Security Alert: {attemptCount} violations detected
        </div>
      )}

      {children}
    </>
  );
};

export default VoidShellProtection;

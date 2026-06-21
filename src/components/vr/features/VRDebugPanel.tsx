/**
 * VR Debug Panel - Hidden debug UI + global JS test hooks
 * Exposes window.vrDebug.toggleDayNight(), forceHorn(), teleportToTrain1()
 * Toggle visibility with Ctrl+Shift+D or "Zoe debug"
 */

import React, { useEffect, useState, useCallback } from 'react';
import { generateVRWorldAuditPDF } from '@/utils/vrWorldAuditPdf';

declare global {
  interface Window {
    vrDebug: {
      toggleDayNight: () => void;
      forceHorn: () => void;
      teleportToTrain1: () => void;
      downloadAuditPDF: () => void;
      boardTrain: () => void;
      exitTrain: () => void;
      goToMetroEntrance: () => void;
    };
  }
}

const VRDebugPanel: React.FC = () => {
  const [visible, setVisible] = useState(false);

  const toggleDayNight = useCallback(() => {
    window.dispatchEvent(new CustomEvent('vr-toggle-day-night'));
    console.log('[VRDebug] Toggled day/night');
  }, []);

  const forceHorn = useCallback(() => {
    window.dispatchEvent(new CustomEvent('vr-force-horn'));
    console.log('[VRDebug] Forced 5-second metro horn');
  }, []);

  const teleportToTrain1 = useCallback(() => {
    window.dispatchEvent(new CustomEvent('vr-teleport', {
      detail: { x: -748, y: 9, z: -755 }
    }));
    console.log('[VRDebug] Teleported to Train #1');
  }, []);

  const boardTrain = useCallback(() => {
    window.dispatchEvent(new CustomEvent('vr-voice-command', {
      detail: { action: 'board_train' }
    }));
    console.log('[VRDebug] Board train command');
  }, []);

  const exitTrain = useCallback(() => {
    window.dispatchEvent(new CustomEvent('vr-voice-command', {
      detail: { action: 'exit_train' }
    }));
    console.log('[VRDebug] Exit train command');
  }, []);

  const goToMetroEntrance = useCallback(() => {
    window.dispatchEvent(new CustomEvent('vr-teleport', {
      detail: { x: -740, y: 0, z: -743, cinematic: true }
    }));
    console.log('[VRDebug] Navigate to metro entrance');
  }, []);

  const downloadAuditPDF = useCallback(() => {
    generateVRWorldAuditPDF();
    console.log('[VRDebug] Downloading VR audit PDF');
  }, []);

  // Expose global debug functions
  useEffect(() => {
    window.vrDebug = {
      toggleDayNight,
      forceHorn,
      teleportToTrain1,
      downloadAuditPDF,
      boardTrain,
      exitTrain,
      goToMetroEntrance,
    };
    console.log('[VRDebug] Debug hooks registered. Use window.vrDebug.toggleDayNight() etc.');
    return () => { delete (window as any).vrDebug; };
  }, [toggleDayNight, forceHorn, teleportToTrain1, downloadAuditPDF, boardTrain, exitTrain, goToMetroEntrance]);

  // Ctrl+Shift+D to toggle debug panel
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setVisible(v => !v);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 12, left: 12, zIndex: 9999,
      background: 'rgba(0,0,0,0.85)', borderRadius: 8, padding: '10px 14px',
      color: '#fff', fontSize: 11, fontFamily: 'monospace',
      border: '1px solid rgba(100,200,255,0.3)', maxWidth: 260,
    }}>
      <div style={{ fontWeight: 'bold', color: '#60a5fa', marginBottom: 6, fontSize: 12 }}>
        🛠 VR DEBUG PANEL
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <button onClick={toggleDayNight} style={btnStyle}>🌅 Toggle Day/Night</button>
        <button onClick={forceHorn} style={btnStyle}>📯 Force 5s Horn</button>
        <button onClick={teleportToTrain1} style={btnStyle}>🚇 Teleport → Train #1</button>
        <button onClick={boardTrain} style={btnStyle}>🚪 Board Train</button>
        <button onClick={exitTrain} style={btnStyle}>🚶 Exit Train</button>
        <button onClick={goToMetroEntrance} style={btnStyle}>🏗️ Go to Metro Entrance</button>
        <button onClick={downloadAuditPDF} style={btnStyle}>📄 Download Audit PDF</button>
      </div>
      <div style={{ color: '#94a3b8', fontSize: 9, marginTop: 6 }}>
        Ctrl+Shift+D to toggle | window.vrDebug.*
      </div>
    </div>
  );
};

const btnStyle: React.CSSProperties = {
  background: 'rgba(30,64,175,0.4)', border: '1px solid rgba(96,165,250,0.3)',
  color: '#bfdbfe', borderRadius: 4, padding: '4px 8px', cursor: 'pointer',
  fontSize: 10, textAlign: 'left',
};

export default VRDebugPanel;

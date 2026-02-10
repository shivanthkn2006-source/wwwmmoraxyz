// ═══════════════════════════════════════════════════════════════════════════════
// FORTRESS WATERMARK - Visible forensic tracing layer
// Displays user invite code + IP across screen for photo detection
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { useDevMode } from './DevModeContext';

interface FortressWatermarkProps {
  enabled?: boolean;
}

export const FortressWatermark: React.FC<FortressWatermarkProps> = ({ enabled = true }) => {
  const { user } = useAuth();
  const { isAdmin, isDevMode, securityEnabled, simulateUserView } = useDevMode();
  const [inviteCode, setInviteCode] = useState<string>('');
  const [ipAddress, setIpAddress] = useState<string>('');

  // Admin bypass logic
  const shouldBypass = isAdmin && (isDevMode || !securityEnabled) && !simulateUserView;

  useEffect(() => {
    if (!user || !enabled || shouldBypass) return;

    // Fetch user's invite code
    const fetchInviteCode = async () => {
      const { data } = await supabase
        .from('invite_codes')
        .select('code')
        .eq('used_by', user.id)
        .maybeSingle();
      
      if (data?.code) {
        setInviteCode(data.code);
      }
    };

    // Get IP address (using a simple approach)
    const fetchIP = async () => {
      try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        setIpAddress(data.ip || 'HIDDEN');
      } catch {
        setIpAddress('PROTECTED');
      }
    };

    fetchInviteCode();
    fetchIP();
  }, [user, enabled, shouldBypass]);

  if (!enabled || !user || shouldBypass) return null;

  const watermarkText = `${inviteCode || user.id.slice(0, 8)} • ${ipAddress}`;

  return (
    <div
      className="fixed inset-0 pointer-events-none z-[9998] overflow-hidden select-none"
      style={{ opacity: 0.03 }}
      aria-hidden="true"
    >
      <div 
        className="w-full h-full"
        style={{
          backgroundImage: `repeating-linear-gradient(
            -45deg,
            transparent,
            transparent 100px,
            rgba(255,255,255,0.02) 100px,
            rgba(255,255,255,0.02) 200px
          )`,
        }}
      >
        {Array.from({ length: 50 }).map((_, row) => (
          <div key={row} className="flex whitespace-nowrap" style={{ transform: `translateX(${(row % 2) * 50}px)` }}>
            {Array.from({ length: 20 }).map((_, col) => (
              <span 
                key={col} 
                className="text-foreground/30 text-[10px] font-mono px-8 py-4"
                style={{ transform: 'rotate(-15deg)' }}
              >
                {watermarkText}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default FortressWatermark;

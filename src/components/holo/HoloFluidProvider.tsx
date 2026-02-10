// ═══════════════════════════════════════════════════════════════════════════════
// HOLO-FLUID PROVIDER - PROJECT EXODUS 2120
// Unified state management for the 2120 interface layer
// Connects Chat, VR, Security into ONE living system
// HUD Navigation: ONLY shows on home page to prevent overlay issues
// ═══════════════════════════════════════════════════════════════════════════════

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { ZoeFloatingOrb, ZoeState } from './ZoeFloatingOrb';
import { AdaptiveScreenGlow, GlowState } from './AdaptiveScreenGlow';
import { NeuralHUD, HUDItem } from './NeuralHUD';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, MessageCircle, Shield, Settings, Globe, Activity, Sparkles, Camera, Users, Share2, Crown, User, ChevronUp, ChevronDown, Play, Pause, Zap, MapPin, Shirt, Coffee, Cpu, Heart, ShoppingBag } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { useDevMode } from '@/components/security/DevModeContext';
import { useMenuNotifications } from '@/hooks/useMenuNotifications';
import { useRealTimeChat } from '@/hooks/useRealTimeChat';
import { useNewMatches } from '@/hooks/useNewMatches';

interface HoloFluidContextType {
  // Zoe Orb State
  zoeState: ZoeState;
  setZoeState: (state: ZoeState) => void;
  
  // Screen Glow
  glowState: GlowState;
  triggerGlow: (state: GlowState, duration?: number) => void;
  
  // Neural HUD
  isHUDEnabled: boolean;
  toggleHUD: () => void;
  
  // VR Sync
  isVRActive: boolean;
  setVRActive: (active: boolean) => void;
  
  // Security State
  securityLevel: 'normal' | 'elevated' | 'lockdown';
  setSecurityLevel: (level: 'normal' | 'elevated' | 'lockdown') => void;
  
  // Singularity Events
  dispatchSingularityEvent: (event: string, data?: any) => void;
  
  // Integration Health
  integrationHealth: {
    database: boolean;
    edgeFunctions: boolean;
    ecn: boolean;
    dhf: boolean;
  };
  runHealthCheck: () => Promise<void>;
}

const HoloFluidContext = createContext<HoloFluidContextType | null>(null);

export const useHoloFluid = () => {
  const context = useContext(HoloFluidContext);
  if (!context) {
    // Return safe defaults instead of throwing
    return {
      zoeState: 'idle' as ZoeState,
      setZoeState: () => {},
      glowState: 'idle' as GlowState,
      triggerGlow: () => {},
      isHUDEnabled: false,
      toggleHUD: () => {},
      isVRActive: false,
      setVRActive: () => {},
      securityLevel: 'normal' as const,
      setSecurityLevel: () => {},
      dispatchSingularityEvent: () => {},
      integrationHealth: { database: true, edgeFunctions: true, ecn: true, dhf: true },
      runHealthCheck: async () => {},
    };
  }
  return context;
};

interface HoloFluidProviderProps {
  children: React.ReactNode;
  enableOrb?: boolean;
  enableGlow?: boolean;
  enableHUD?: boolean;
}

export const HoloFluidProvider: React.FC<HoloFluidProviderProps> = ({
  children,
  enableOrb = true,
  enableGlow = true,
  enableHUD = true,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { notifications } = useMenuNotifications();
  const { chatUsers } = useRealTimeChat();
  const { newMatchesCount, markMatchesAsSeen } = useNewMatches();
  
  // Calculate unread chat count
  const totalUnread = chatUsers.filter(user => (user.unread_count || 0) > 0).length;
  
  // Orb visibility state - shown on hover at top of page
  const [isOrbVisible, setIsOrbVisible] = useState(false);
  const [orbHideTimeout, setOrbHideTimeout] = useState<NodeJS.Timeout | null>(null);
  
  // Page detection
  const isHomePage = location.pathname === '/home';
  const isSelfieCityPage = location.pathname === '/selfie-city';
  const authPaths = ['/', '/auth', '/password-recovery', '/access-denied'];
  const isAuthPage = authPaths.includes(location.pathname);
  
  // Hide orb on pages that have their own UI, don't need it, or auth pages
  const hiddenOrbPaths = ['/mmora', '/camera', '/zoe-omega', '/', '/auth', '/password-recovery', '/access-denied'];

  // TEMPORARILY DISABLED: Floating orb is hidden across the entire platform
  // Set to false to completely hide the orb - can be re-enabled later
  const shouldShowOrb = false; // Was: enableOrb && !!user && !hiddenOrbPaths.includes(location.pathname) && isOrbVisible;
  
  // Hover at top-of-screen to reveal orb, then auto-hide in 5 seconds
  useEffect(() => {
    if (!enableOrb || !user) return;
    if (hiddenOrbPaths.includes(location.pathname)) return;

    const handlePointerMove = (e: PointerEvent) => {
      // Show orb when pointer is near the top edge
      if ((e as any).clientY !== undefined && (e as any).clientY <= 80) {
        setIsOrbVisible(true);

        if (orbHideTimeout) {
          clearTimeout(orbHideTimeout);
        }

        const timeout = setTimeout(() => {
          setIsOrbVisible(false);
        }, 5000);
        setOrbHideTimeout(timeout);
      }
    };

    // Pointer events cover mouse + pen + touch
    window.addEventListener('pointermove', handlePointerMove);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      if (orbHideTimeout) clearTimeout(orbHideTimeout);
    };
  }, [enableOrb, user, location.pathname, orbHideTimeout]);
  
  // Core States
  const [zoeState, setZoeState] = useState<ZoeState>('idle');
  const [glowState, setGlowState] = useState<GlowState>('idle');
  const [isHUDEnabled, setIsHUDEnabled] = useState(enableHUD);
  const [isVRActive, setVRActive] = useState(false);
  const [securityLevel, setSecurityLevel] = useState<'normal' | 'elevated' | 'lockdown'>('normal');
  // Default orb position: top center, tucked under the top border
  const [orbPosition, setOrbPosition] = useState({ x: typeof window !== 'undefined' ? (window.innerWidth / 2 - 32) : 200, y: 8 });
  const [userProfilePhoto, setUserProfilePhoto] = useState<string | null>(null);
  
  // HUD shows on all protected pages (home button integrated into left HUD for non-home pages)
  const shouldShowHUD = isHUDEnabled && !!user && !isAuthPage;
  
  const [integrationHealth, setIntegrationHealth] = useState({
    database: true,
    edgeFunctions: true,
    ecn: true,
    dhf: true,
  });

  // Fetch user profile photo
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('profiles')
        .select('profile_photo_url')
        .eq('user_id', user.id)
        .single();
      
      if (data?.profile_photo_url) {
        setUserProfilePhoto(data.profile_photo_url);
      }
    };
    
    fetchUserProfile();
  }, [user]);

  // Run health check for all Zoe integrations (debounced)
  const runHealthCheck = useCallback(async () => {
    if (!user) return;
    
    // Check if we already ran health check this session
    const lastCheck = sessionStorage.getItem('mmora_health_check');
    if (lastCheck) {
      const elapsed = Date.now() - parseInt(lastCheck, 10);
      if (elapsed < 5 * 60 * 1000) { // Skip if checked within 5 minutes
        return;
      }
    }
    
    try {
      // Check database connectivity (single lightweight query)
      const { error: dbError } = await supabase
        .from('behavioral_events')
        .select('id')
        .limit(1);

      setIntegrationHealth({
        database: !dbError,
        edgeFunctions: true,
        ecn: true, // Assume healthy - detailed check is expensive
        dhf: true,
      });

      // Cache the check time
      sessionStorage.setItem('mmora_health_check', Date.now().toString());

      console.log('[HoloFluid] Integration health check complete');
    } catch (error) {
      console.error('[HoloFluid] Health check failed:', error);
      setIntegrationHealth(prev => ({ ...prev, database: false }));
    }
  }, [user]);

  // Run health check after delay (not on immediate mount)
  useEffect(() => {
    if (user) {
      const timer = setTimeout(() => {
        runHealthCheck();
      }, 5000); // Delay health check by 5 seconds
      return () => clearTimeout(timer);
    }
  }, [user, runHealthCheck]);

  // Trigger glow with optional auto-dismiss
  const triggerGlow = useCallback((state: GlowState, duration?: number) => {
    setGlowState(state);
    if (duration) {
      setTimeout(() => setGlowState('idle'), duration);
    }
  }, []);

  // Toggle HUD visibility
  const toggleHUD = useCallback(() => {
    setIsHUDEnabled(prev => !prev);
  }, []);

  // Dispatch singularity events that sync across Chat/VR/Security
  const dispatchSingularityEvent = useCallback((event: string, data?: any) => {
    window.dispatchEvent(new CustomEvent('zoe-singularity', {
      detail: { event, data, timestamp: Date.now() }
    }));
    
    // Auto-sync VR if active
    if (isVRActive) {
      window.dispatchEvent(new CustomEvent('vr-singularity-sync', {
        detail: { event, data }
      }));
    }
  }, [isVRActive]);

  // Listen for external state changes
  useEffect(() => {
    const handleZoeStateChange = (e: CustomEvent<{ state: ZoeState }>) => {
      setZoeState(e.detail.state);
      
      // Map Zoe states to glow states
      if (e.detail.state === 'thinking') {
        setGlowState('thinking');
      } else if (e.detail.state === 'alert') {
        setGlowState('alert');
      } else if (e.detail.state === 'success') {
        triggerGlow('success', 2000);
      }
    };

    const handleSecurityEvent = (e: CustomEvent<{ level: 'normal' | 'elevated' | 'lockdown' }>) => {
      setSecurityLevel(e.detail.level);
      if (e.detail.level === 'lockdown') {
        setGlowState('security');
      } else if (e.detail.level === 'elevated') {
        setGlowState('alert');
      }
    };

    window.addEventListener('zoe-state-change', handleZoeStateChange as EventListener);
    window.addEventListener('security-level-change', handleSecurityEvent as EventListener);
    
    return () => {
      window.removeEventListener('zoe-state-change', handleZoeStateChange as EventListener);
      window.removeEventListener('security-level-change', handleSecurityEvent as EventListener);
    };
  }, [triggerGlow]);

  // HUD navigation items - includes bottom nav with notifications
  // On non-home pages, show "Back to Home" at the top of the left HUD
  const leftHUDItems: HUDItem[] = [
    // "Back to Home" button - only shows on non-home pages
    ...(!isHomePage ? [{ id: 'back-home', icon: Home, label: 'Back to Home', color: 'text-omega-cyan', onClick: () => navigate('/home') }] : []),
    // Regular menu items only on home page
    ...(isHomePage ? [
      { id: 'home', icon: Home, label: 'Home', color: 'text-omega-cyan', onClick: () => navigate('/home'), badge: notifications.home, badgeColor: 'bg-gradient-to-r from-pink-500 to-rose-500' },
      { id: 'camera', icon: Camera, label: 'Camera', color: 'text-amber-400', onClick: () => navigate('/camera'), badge: notifications.camera, badgeColor: 'bg-gradient-to-r from-amber-500 to-orange-500' },
      { id: 'chat', icon: MessageCircle, label: 'Chat', color: 'text-omega-purple', onClick: () => navigate('/chat'), badge: totalUnread + notifications.chat, badgeColor: 'bg-gradient-to-r from-blue-500 to-cyan-500' },
      { id: 'huddle', icon: Users, label: 'Huddle', color: 'text-green-400', onClick: () => { markMatchesAsSeen(); navigate('/huddle'); }, badge: newMatchesCount + notifications.huddle, badgeColor: 'bg-gradient-to-r from-green-500 to-emerald-500' },
      { id: 'webdrop', icon: Share2, label: 'Webdrop', color: 'text-violet-400', onClick: () => navigate('/webdrop'), badge: notifications.webdrop, badgeColor: 'bg-gradient-to-r from-purple-500 to-violet-500' },
    ] : []),
  ];

  // Right HUD items - different for Selfie City page vs other pages
  const rightHUDItems: HUDItem[] = isSelfieCityPage ? [
    // Selfie City specific items - Camera button and category filters
    { id: 'selfie-camera', icon: Camera, label: 'Take Selfie', color: 'text-primary', onClick: () => window.dispatchEvent(new CustomEvent('selfie-city-action', { detail: 'camera' })) },
    { id: 'filter-fashion', icon: Shirt, label: 'Fashion', color: 'text-purple-400', onClick: () => window.dispatchEvent(new CustomEvent('selfie-city-filter', { detail: 'fashion' })) },
    { id: 'filter-food', icon: Coffee, label: 'Food', color: 'text-orange-400', onClick: () => window.dispatchEvent(new CustomEvent('selfie-city-filter', { detail: 'food' })) },
    { id: 'filter-tech', icon: Cpu, label: 'Tech', color: 'text-cyan-400', onClick: () => window.dispatchEvent(new CustomEvent('selfie-city-filter', { detail: 'tech' })) },
    { id: 'filter-beauty', icon: Heart, label: 'Beauty', color: 'text-pink-400', onClick: () => window.dispatchEvent(new CustomEvent('selfie-city-filter', { detail: 'beauty' })) },
    { id: 'filter-shopping', icon: ShoppingBag, label: 'Shopping', color: 'text-green-400', onClick: () => window.dispatchEvent(new CustomEvent('selfie-city-filter', { detail: 'shopping' })) },
  ] : [
    // Default right HUD items for other pages
    { id: 'sovereign', icon: Crown, label: 'Sovereign', color: 'text-amber-500', onClick: () => navigate('/sovereign-control') },
    { id: 'evolution', icon: Sparkles, label: 'Evolution', color: 'text-amber-400', onClick: () => navigate('/omega-evolution') },
    { id: 'vr', icon: Globe, label: 'VR World', color: 'text-omega-pink', onClick: () => navigate('/zoe-omega') },
    { id: 'health', icon: Activity, label: 'Health', color: integrationHealth.database && integrationHealth.ecn ? 'text-green-400' : 'text-amber-400', onClick: runHealthCheck },
    { id: 'security', icon: Shield, label: 'Security', color: 'text-amber-400', onClick: () => navigate('/security') },
    { id: 'settings', icon: Settings, label: 'Settings', color: 'text-slate-400', onClick: () => navigate('/profile') },
  ];

  // Top-right corner HUD items - Profile only
  const topRightHUDItems: HUDItem[] = [
    { id: 'profile', icon: User, label: 'Profile', color: 'text-omega-cyan', onClick: () => navigate('/profile'), profilePhotoUrl: userProfilePhoto || undefined },
  ];

  // Top-left corner HUD items - Feed Selector (Global / Friends)
  const topLeftHUDItems: HUDItem[] = [
    { 
      id: 'global-feed', 
      icon: Globe, 
      label: 'Global Feed', 
      color: 'text-omega-cyan',
      onClick: () => window.dispatchEvent(new CustomEvent('feed-switch', { detail: 'global' }))
    },
    { 
      id: 'friends-feed', 
      icon: Users, 
      label: 'Friends Feed', 
      color: 'text-omega-pink',
      onClick: () => window.dispatchEvent(new CustomEvent('feed-switch', { detail: 'personal' }))
    },
  ];

  // Admin mode check (Sovereign Controls now handled by SovereignQuickAccess component)
  const { isAdmin } = useDevMode();

  // Auto-scroll state for HUD controls
  const [isAutoScrolling, setIsAutoScrolling] = React.useState(false);

  // Auto scroll controls for RIGHT HUD utility panel (compact, above Sovereign Control)
  const autoScrollHUDItems: HUDItem[] = [
    { 
      id: 'scroll-up', 
      icon: ChevronUp, 
      label: 'Up', 
      color: 'text-omega-cyan', 
      onClick: () => window.scrollBy({ top: -window.innerHeight * 0.8, behavior: 'smooth' }) 
    },
    { 
      id: 'auto-scroll', 
      icon: isAutoScrolling ? Pause : Play, 
      label: isAutoScrolling ? 'Stop' : 'Auto', 
      color: isAutoScrolling ? 'text-amber-400' : 'text-green-400', 
      onClick: () => {
        setIsAutoScrolling(prev => !prev);
        if (!isAutoScrolling) {
          const scrollInterval = setInterval(() => {
            if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 100) {
              setIsAutoScrolling(false);
              clearInterval(scrollInterval);
            } else {
              window.scrollBy({ top: 300, behavior: 'smooth' });
            }
          }, 3000);
          (window as any).__autoScrollInterval = scrollInterval;
        } else {
          clearInterval((window as any).__autoScrollInterval);
        }
      }
    },
    { 
      id: 'scroll-down', 
      icon: ChevronDown, 
      label: 'Down', 
      color: 'text-omega-cyan', 
      onClick: () => window.scrollBy({ top: window.innerHeight * 0.8, behavior: 'smooth' }) 
    },
  ];

  const handleOrbClick = () => {
    // Toggle Zoe state or open quick menu
    if (zoeState === 'idle') {
      setZoeState('listening');
      triggerGlow('thinking', 500);
    } else {
      setZoeState('idle');
    }
    dispatchSingularityEvent('orb_clicked', { previousState: zoeState });
  };

  const contextValue: HoloFluidContextType = {
    zoeState,
    setZoeState,
    glowState,
    triggerGlow,
    isHUDEnabled,
    toggleHUD,
    isVRActive,
    setVRActive,
    securityLevel,
    setSecurityLevel,
    dispatchSingularityEvent,
    integrationHealth,
    runHealthCheck,
  };

  return (
    <HoloFluidContext.Provider value={contextValue}>
      {children}
      
      {/* Floating Zoe Orb - Hidden on M'mora page (has its own SmithOrb) */}
      {shouldShowOrb && (
        <ZoeFloatingOrb
          state={zoeState}
          onClick={handleOrbClick}
          onDragEnd={(x, y) => setOrbPosition({ x, y })}
          initialPosition={orbPosition}
          size="md"
          showPulse={true}
        />
      )}
      
      {/* Adaptive Screen Glow */}
      {enableGlow && (
        <AdaptiveScreenGlow
          state={glowState}
          intensity={securityLevel === 'lockdown' ? 'high' : 'medium'}
        />
      )}
      
      
      {/* Neural HUD with Proximity Detection - ONLY on home page */}
      {shouldShowHUD && (
        <NeuralHUD
          leftItems={leftHUDItems}
          rightItems={rightHUDItems}
          topLeftItems={topLeftHUDItems}
          topRightItems={topRightHUDItems}
          utilityRightItems={autoScrollHUDItems}
        />
      )}
    </HoloFluidContext.Provider>
  );
};

export default HoloFluidProvider;

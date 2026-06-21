import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ═══════════════════════════════════════════════════════════════════════════════
// SOVEREIGN ROUTE ENGINE - Battery-Efficient Geofence Tracking
// "Divine Intervention" notifications for liked/tagged products
// Updates every 5 minutes for battery efficiency
// ═══════════════════════════════════════════════════════════════════════════════

export interface OnRouteNotification {
  id: string;
  type: 'deal' | 'friend' | 'brand' | 'premium' | 'divine';
  title: string;
  description: string;
  brandName: string;
  brandLogo?: string;
  distance: number;
  direction: 'left' | 'right' | 'ahead';
  discount?: string;
  expiresIn?: string;
  category: string;
  isNew?: boolean;
  isPremium?: boolean;
  isDivineIntervention?: boolean;
  timestamp: string;
  matchReason?: string;
}

interface OnRouteDeal {
  id: string;
  title: string;
  brandLogo?: string;
  distance: number;
  discount: string;
}

interface UserLocation {
  lat: number;
  lng: number;
  timestamp: number;
  accuracy?: number;
}

interface RouteEngineConfig {
  updateIntervalMs: number;
  searchRadiusMeters: number;
  enableDivineIntervention: boolean;
  batteryEfficient: boolean;
}

const DEFAULT_CONFIG: RouteEngineConfig = {
  updateIntervalMs: 5 * 60 * 1000, // 5 minutes for battery efficiency
  searchRadiusMeters: 500,
  enableDivineIntervention: true,
  batteryEfficient: true,
};

// Calculate distance between two coordinates in meters
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Predict user path based on movement history
function predictPath(locations: UserLocation[]): { lat: number; lng: number }[] {
  if (locations.length < 2) return [];
  
  const recent = locations.slice(-5);
  const points: { lat: number; lng: number }[] = [];
  
  // Calculate average velocity
  let avgDLat = 0, avgDLng = 0;
  for (let i = 1; i < recent.length; i++) {
    avgDLat += recent[i].lat - recent[i - 1].lat;
    avgDLng += recent[i].lng - recent[i - 1].lng;
  }
  avgDLat /= (recent.length - 1);
  avgDLng /= (recent.length - 1);
  
  // Project 3 points ahead
  const lastLoc = recent[recent.length - 1];
  for (let i = 1; i <= 3; i++) {
    points.push({
      lat: lastLoc.lat + avgDLat * i,
      lng: lastLoc.lng + avgDLng * i,
    });
  }
  
  return points;
}

export function useOnRouteEngine(config: Partial<RouteEngineConfig> = {}) {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  
  const [activeNotifications, setActiveNotifications] = useState<OnRouteNotification[]>([]);
  const [onRouteDeals, setOnRouteDeals] = useState<OnRouteDeal[]>([]);
  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<UserLocation | null>(null);
  const [locationHistory, setLocationHistory] = useState<UserLocation[]>([]);
  const [lastScanTime, setLastScanTime] = useState<number>(0);
  
  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isActiveRef = useRef(false);

  // Fetch user's liked/tagged products for Divine Intervention
  const fetchUserPreferences = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { likedBrands: [], taggedProducts: [] };

      const [brandsRes, selfiesRes] = await Promise.all([
        supabase
          .from('user_brand_preferences')
          .select('brand_name, affinity_score')
          .eq('user_id', user.id)
          .order('affinity_score', { ascending: false })
          .limit(20),
        supabase
          .from('selfie_city_pins')
          .select('detected_products')
          .eq('user_id', user.id)
          .not('detected_products', 'is', null)
          .limit(50),
      ]);

      const likedBrands = (brandsRes.data || []).map(b => b.brand_name.toLowerCase());
      
      // Extract product names from selfies
      const taggedProducts: string[] = [];
      for (const selfie of selfiesRes.data || []) {
        const products = selfie.detected_products as any[];
        if (Array.isArray(products)) {
          products.forEach(p => {
            if (p.name) taggedProducts.push(p.name.toLowerCase());
            if (p.brand) taggedProducts.push(p.brand.toLowerCase());
          });
        }
      }

      return { likedBrands, taggedProducts: [...new Set(taggedProducts)] };
    } catch (error) {
      console.error('[SovereignRoute] Failed to fetch preferences:', error);
      return { likedBrands: [], taggedProducts: [] };
    }
  }, []);

  // Query deals within radius and match with preferences
  const scanForDeals = useCallback(async (location: UserLocation) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      console.log('[SovereignRoute] Scanning at', location.lat, location.lng);

      // Get user preferences for Divine Intervention
      const { likedBrands, taggedProducts } = await fetchUserPreferences();

      // Call edge function for deal matching
      const { data, error } = await supabase.functions.invoke('selfie-city-on-route', {
        body: {
          location: { lat: location.lat, lng: location.lng },
          radius: mergedConfig.searchRadiusMeters,
          limit: 15,
        },
      });

      if (error) {
        console.error('[SovereignRoute] Edge function error:', error);
        return;
      }

      if (data?.notifications) {
        const notifications: OnRouteNotification[] = data.notifications.map((n: any) => {
          // Check for Divine Intervention match
          const brandLower = n.brandName?.toLowerCase() || '';
          const isLikedBrand = likedBrands.includes(brandLower);
          const hasTaggedProduct = taggedProducts.some(tag => 
            n.title?.toLowerCase().includes(tag) || 
            n.description?.toLowerCase().includes(tag) ||
            brandLower.includes(tag)
          );
          
          const isDivine = mergedConfig.enableDivineIntervention && (isLikedBrand || hasTaggedProduct);
          
          return {
            ...n,
            type: isDivine ? 'divine' : n.type,
            isDivineIntervention: isDivine,
            matchReason: isDivine 
              ? isLikedBrand 
                ? 'You liked this brand before' 
                : 'Matches products you tagged'
              : undefined,
          };
        });

        // Sort divine interventions first
        notifications.sort((a, b) => {
          if (a.isDivineIntervention && !b.isDivineIntervention) return -1;
          if (!a.isDivineIntervention && b.isDivineIntervention) return 1;
          return 0;
        });

        setActiveNotifications(notifications);
        
        // Extract quick deals for HUD
        setOnRouteDeals(notifications.slice(0, 5).map(n => ({
          id: n.id,
          title: n.title,
          brandLogo: n.brandLogo,
          distance: n.distance,
          discount: n.discount || 'Deal',
        })));

        // Trigger Divine Intervention notification
        const divineDeals = notifications.filter(n => n.isDivineIntervention);
        if (divineDeals.length > 0) {
          const top = divineDeals[0];
          const minutesAway = Math.ceil(top.distance / 80); // ~80m per minute walking
          
          toast('🌟 Divine Intervention', {
            description: `Detour suggested: ${top.title} at ${top.brandName}, ${minutesAway} min away!`,
            action: {
              label: 'Navigate',
              onClick: () => {
                // Use proper Google Maps directions URL
                window.open(`https://www.google.com/maps/dir/?api=1&destination=${location.lat},${location.lng}&travelmode=walking`, '_blank');
              },
            },
            duration: 10000,
          });

          // Log behavioral event
          await supabase.from('behavioral_events').insert({
            user_id: user.id,
            event_type: 'divine_intervention_triggered',
            event_category: 'ar_commerce',
            context_snippet: `${top.brandName}: ${top.title}`,
            metadata: {
              deal_id: top.id,
              distance: top.distance,
              match_reason: top.matchReason,
            },
            sentiment_score: 0.9,
            dhf_logged: true,
          });
        }

        setLastScanTime(Date.now());
        console.log(`[SovereignRoute] Found ${notifications.length} deals, ${divineDeals.length} divine`);
      }
    } catch (error) {
      console.error('[SovereignRoute] Scan error:', error);
    }
  }, [fetchUserPreferences, mergedConfig.searchRadiusMeters, mergedConfig.enableDivineIntervention]);

  // Handle location update
  const handleLocationUpdate = useCallback((position: GeolocationPosition) => {
    const newLocation: UserLocation = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      timestamp: Date.now(),
      accuracy: position.coords.accuracy,
    };

    setCurrentLocation(newLocation);
    setLocationHistory(prev => [...prev.slice(-20), newLocation]); // Keep last 20 points

    // Check if enough time has passed for a scan
    const timeSinceLastScan = Date.now() - lastScanTime;
    if (timeSinceLastScan >= mergedConfig.updateIntervalMs || lastScanTime === 0) {
      scanForDeals(newLocation);
    }
  }, [lastScanTime, mergedConfig.updateIntervalMs, scanForDeals]);

  // Start tracking
  const startRouteTracking = useCallback(async () => {
    if (!navigator.geolocation || isTracking) return;

    try {
      // Request permission first
      const permission = await navigator.permissions?.query({ name: 'geolocation' });
      if (permission && permission.state === 'denied') {
        toast.error('Location access denied', {
          description: 'Enable location to discover deals on your route',
        });
        return;
      }

      setIsTracking(true);
      isActiveRef.current = true;
      console.log('[SovereignRoute] Started tracking with Divine Intervention');

      // Get initial position
      navigator.geolocation.getCurrentPosition(
        (position) => {
          handleLocationUpdate(position);
          toast.success('Sovereign Route Active', {
            description: 'Zoe is watching for deals matching your style',
          });
        },
        (error) => {
          console.error('[SovereignRoute] Initial position error:', error);
          toast.error('Could not get location');
        },
        { enableHighAccuracy: !mergedConfig.batteryEfficient, timeout: 10000 }
      );

      // Start watching position (battery efficient mode uses lower accuracy)
      watchIdRef.current = navigator.geolocation.watchPosition(
        handleLocationUpdate,
        (error) => console.error('[SovereignRoute] Watch error:', error),
        {
          enableHighAccuracy: !mergedConfig.batteryEfficient,
          maximumAge: mergedConfig.batteryEfficient ? 60000 : 0, // Allow cached positions in battery mode
          timeout: 30000,
        }
      );

      // Set up interval for periodic scans (backup if watchPosition is slow)
      intervalRef.current = setInterval(() => {
        if (currentLocation && isActiveRef.current) {
          scanForDeals(currentLocation);
        }
      }, mergedConfig.updateIntervalMs);

    } catch (error) {
      console.error('[SovereignRoute] Start tracking error:', error);
      setIsTracking(false);
    }
  }, [isTracking, handleLocationUpdate, mergedConfig.batteryEfficient, mergedConfig.updateIntervalMs, currentLocation, scanForDeals]);

  // Stop tracking
  const stopRouteTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    isActiveRef.current = false;
    setIsTracking(false);
    setActiveNotifications([]);
    setOnRouteDeals([]);
    
    console.log('[SovereignRoute] Stopped tracking');
    toast.info('Route tracking stopped');
  }, []);

  // Manually trigger scan
  const forceRescan = useCallback(() => {
    if (currentLocation) {
      setLastScanTime(0); // Reset to force immediate scan
      scanForDeals(currentLocation);
    }
  }, [currentLocation, scanForDeals]);

  // Get predicted path
  const getPredictedPath = useCallback(() => {
    return predictPath(locationHistory);
  }, [locationHistory]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    // State
    activeNotifications,
    onRouteDeals,
    isTracking,
    currentLocation,
    locationHistory,
    lastScanTime,
    
    // Actions
    startRouteTracking,
    stopRouteTracking,
    forceRescan,
    getPredictedPath,
  };
}

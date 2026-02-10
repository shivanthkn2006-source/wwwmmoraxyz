import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SponsorshipAlert {
  id: string;
  pin_id: string;
  brand_name: string;
  brand_category: string | null;
  sponsorship_score: number;
  location_name: string | null;
  status: string;
  expires_at: string;
  payout_amount: number | null;
  created_at: string;
}

export interface HighValueZone {
  id: string;
  zone_name: string;
  zone_type: string;
  location_lat: number;
  location_lng: number;
  radius_meters: number;
  value_multiplier: number;
}

export const useSponsorshipData = (userId?: string) => {
  const [alerts, setAlerts] = useState<SponsorshipAlert[]>([]);
  const [zones, setZones] = useState<HighValueZone[]>([]);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadAlerts = useCallback(async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('brand_sponsorship_alerts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const typedAlerts = (data || []) as unknown as SponsorshipAlert[];
      setAlerts(typedAlerts);
      
      // Calculate stats
      const pending = typedAlerts.filter(a => a.status === 'pending').length;
      const earnings = typedAlerts
        .filter(a => a.status === 'claimed')
        .reduce((sum, a) => sum + (a.payout_amount || 0), 0);
      
      setPendingCount(pending);
      setTotalEarnings(earnings);
    } catch (err) {
      console.error('[useSponsorshipData] Error loading alerts:', err);
    }
  }, [userId]);

  const loadZones = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('high_value_zones')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;
      
      const typedZones = (data || []).map(z => ({
        ...z,
        location_lat: typeof z.location_lat === 'string' ? parseFloat(z.location_lat) : Number(z.location_lat),
        location_lng: typeof z.location_lng === 'string' ? parseFloat(z.location_lng) : Number(z.location_lng),
        value_multiplier: typeof z.value_multiplier === 'string' ? parseFloat(z.value_multiplier) : Number(z.value_multiplier),
      })) as HighValueZone[];
      
      setZones(typedZones);
    } catch (err) {
      console.error('[useSponsorshipData] Error loading zones:', err);
    }
  }, []);

  const isInHighValueZone = useCallback((lat: number, lng: number): HighValueZone | null => {
    for (const zone of zones) {
      const distance = calculateDistance(lat, lng, zone.location_lat, zone.location_lng);
      if (distance <= zone.radius_meters) {
        return zone;
      }
    }
    return null;
  }, [zones]);

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([loadAlerts(), loadZones()]);
      setLoading(false);
    };
    loadAll();
  }, [loadAlerts, loadZones]);

  // Subscribe to new alerts
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('sponsorship-alerts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'brand_sponsorship_alerts',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('[useSponsorshipData] New alert:', payload);
          setAlerts(prev => [payload.new as unknown as SponsorshipAlert, ...prev]);
          setPendingCount(prev => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return {
    alerts,
    zones,
    totalEarnings,
    pendingCount,
    loading,
    isInHighValueZone,
    refreshAlerts: loadAlerts,
  };
};

// Haversine formula for distance calculation
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

export default useSponsorshipData;

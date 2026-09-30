import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { attachDirectoryProfiles } from '@/lib/friendDirectory';
import { useAuth } from '@/lib/auth';

export interface DetectedProduct {
  name: string;
  brand: string;
  category: string;
  confidence: number;
  isPremium: boolean;
  estimatedPrice?: string;
}

export interface SelfieCityPin {
  id: string;
  userId: string;
  imageUrl: string;
  caption?: string;
  location: { lat: number; lng: number; name?: string };
  detectedProducts: DetectedProduct[];
  isPremium?: boolean;
  userName?: string;
  avatarUrl?: string;
  createdAt: string;
  isFriend?: boolean;
}

export interface NearbyDeal {
  id: string;
  storeName: string;
  brandName: string;
  brandLogo?: string;
  location: { lat: number; lng: number };
  discount?: string;
  description?: string;
  category: string;
  isPremium?: boolean;
  hasProducts?: boolean;
  imageUrl?: string;
  distance?: number;
}

export function useSelfieCityStore() {
  const { user } = useAuth();
  const [selfies, setSelfies] = useState<SelfieCityPin[]>([]);
  const [nearbyDeals, setNearbyDeals] = useState<NearbyDeal[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Reuse location only after the explicit universal permission action.
  useEffect(() => {
    const loadGrantedLocation = async () => {
      if (!navigator.geolocation || !navigator.permissions?.query) return;
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      if (permission.state !== 'granted') return;
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          console.log('[SelfieCityStore] Location acquired:', pos.coords.latitude, pos.coords.longitude);
        },
        (err) => console.warn('[SelfieCityStore] Location error:', err),
        { enableHighAccuracy: true }
      );
      watchId = navigator.geolocation.watchPosition(
        (pos) => setUserLocation((prev) => {
          const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          // Only update after ~500 m movement to avoid constant writes
          return prev && Math.abs(prev.lat - next.lat) < 0.005 && Math.abs(prev.lng - next.lng) < 0.005 ? prev : next;
        }),
        () => undefined, { enableHighAccuracy: false, maximumAge: 60_000 }
      );
    };
    let watchId: number | null = null;
    void loadGrantedLocation();
    return () => { if (watchId !== null) navigator.geolocation.clearWatch(watchId); };
  }, []);

  // Load real pins: Selfie City pins + located posts, friends' activity first.
  const loadSelfies = useCallback(async () => {
    setIsLoading(true);
    try {
      const [postsRes, pinsRes, friendsRes] = await Promise.all([
        supabase.from('posts')
          .select('id,user_id,content,media_url,location_lat,location_lng,location_name,metadata,created_at')
          .not('location_lat', 'is', null).not('location_lng', 'is', null)
          .order('created_at', { ascending: false }).limit(100),
        supabase.from('selfie_city_pins')
          .select('id,user_id,image_url,caption,location_lat,location_lng,location_name,detected_products,is_premium,created_at')
          .order('created_at', { ascending: false }).limit(200),
        user
          ? supabase.from('friendships').select('user1_id,user2_id').or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
          : Promise.resolve({ data: [] as { user1_id: string; user2_id: string }[] }),
      ]);
      const friendIds = new Set(((friendsRes.data ?? []) as { user1_id: string; user2_id: string }[])
        .map((f) => (f.user1_id === user?.id ? f.user2_id : f.user1_id)));

      const rows = [
        ...((postsRes.data ?? []) as any[]).map((p) => ({
          id: p.id, user_id: p.user_id, image_url: p.media_url, caption: p.content,
          lat: Number(p.location_lat), lng: Number(p.location_lng), name: p.location_name,
          products: p.metadata?.detected_products || [], premium: !!p.metadata?.is_premium, created_at: p.created_at,
        })),
        ...((pinsRes.data ?? []) as any[]).map((p) => ({
          id: p.id, user_id: p.user_id, image_url: p.image_url, caption: p.caption,
          lat: Number(p.location_lat), lng: Number(p.location_lng), name: p.location_name,
          products: Array.isArray(p.detected_products) ? p.detected_products : [], premium: !!p.is_premium, created_at: p.created_at,
        })),
      ].filter((r) => Number.isFinite(r.lat) && Number.isFinite(r.lng));

      const withAuthors = await attachDirectoryProfiles(rows as any[], 'user_id', 'profiles');
      const mapped: SelfieCityPin[] = (withAuthors || []).map((r: any) => ({
        id: r.id, userId: r.user_id, imageUrl: r.image_url || '/placeholder.svg', caption: r.caption,
        location: { lat: r.lat, lng: r.lng, name: r.name },
        detectedProducts: r.products, isPremium: r.premium,
        userName: r.profiles?.display_name || r.profiles?.username || 'Member',
        avatarUrl: r.profiles?.profile_photo_url, createdAt: r.created_at,
        isFriend: friendIds.has(r.user_id),
      }));
      mapped.sort((a, b) => Number(!!b.isFriend) - Number(!!a.isFriend) || b.createdAt.localeCompare(a.createdAt));
      setSelfies(mapped);
    } catch (error) {
      console.error('[SelfieCityStore] Error loading selfies:', error);
      setSelfies([]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Local place name for the member's location via OpenStreetMap (free, no key).
  const [localPlace, setLocalPlace] = useState<string | null>(null);
  useEffect(() => {
    if (!userLocation) return;
    const ctrl = new AbortController();
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&zoom=10&lat=${userLocation.lat}&lon=${userLocation.lng}`, { signal: ctrl.signal, headers: { Accept: 'application/json' } })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { const a = j?.address; setLocalPlace(a?.city || a?.town || a?.state_district || a?.state || null); })
      .catch(() => undefined);
    return () => ctrl.abort();
  }, [userLocation]);

  // Share own rounded location (from the permission granted at start) and
  // show every member who shared theirs in the last 30 minutes, live.
  const [liveMembers, setLiveMembers] = useState<SelfieCityPin[]>([]);
  useEffect(() => {
    if (!user || !userLocation) return;
    void supabase.from('member_live_locations' as any)
      .upsert({ user_id: user.id, lat: userLocation.lat, lng: userLocation.lng, place: localPlace } as any);
  }, [user, userLocation, localPlace]);

  const loadLive = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('member_live_locations' as any)
      .select('user_id,lat,lng,place,updated_at')
      .gt('updated_at', new Date(Date.now() - 30 * 60_000).toISOString()).limit(500);
    const rows = await attachDirectoryProfiles(((data ?? []) as any[]), 'user_id', 'profiles');
    setLiveMembers((rows || []).map((r: any) => ({
      id: `live-${r.user_id}`, userId: r.user_id,
      imageUrl: r.profiles?.profile_photo_url || '/placeholder.svg',
      caption: r.user_id === user.id ? 'You are here' : 'Live now',
      location: { lat: Number(r.lat), lng: Number(r.lng), name: r.place || undefined },
      detectedProducts: [], userName: r.profiles?.display_name || r.profiles?.username || 'Member',
      avatarUrl: r.profiles?.profile_photo_url, createdAt: r.updated_at,
    })));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    void loadLive();
    const ch = supabase.channel('selfie-city-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'member_live_locations' }, () => void loadLive())
      .subscribe();
    const t = window.setInterval(() => void loadLive(), 60_000);
    return () => { window.clearInterval(t); void supabase.removeChannel(ch); };
  }, [user, loadLive]);

  // Load nearby deals based on user location
  const loadNearbyDeals = useCallback(async () => {
    if (!userLocation) return;

    // No invented store deals: only real partner data may appear here.
    setNearbyDeals([]);
  }, [userLocation]);

  // Add a new selfie to the map
  const addSelfie = useCallback(async (selfie: Omit<SelfieCityPin, 'id' | 'createdAt'>) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase.functions.invoke('selfie-city-post', {
        body: {
          imageUrl: selfie.imageUrl,
          caption: selfie.caption,
          location: selfie.location,
          detectedProducts: selfie.detectedProducts,
          isPremium: selfie.isPremium
        }
      });

      if (error) throw error;

      if (data?.post) {
        const newPin: SelfieCityPin = {
          ...data.post,
          userId: user.id,
          userName: selfie.userName,
          avatarUrl: selfie.avatarUrl
        };
        setSelfies(prev => [newPin, ...prev]);
        return newPin;
      }
    } catch (error) {
      console.error('[SelfieCityStore] Error adding selfie:', error);
    }
    return null;
  }, [user]);

  return { 
    selfies, 
    nearbyDeals, 
    userLocation, 
    localPlace,
    liveMembers,
    isLoading, 
    loadSelfies, 
    loadNearbyDeals,
    addSelfie 
  };
}

// Helper function to calculate distance between two points
function calculateDistance(
  point1: { lat: number; lng: number },
  point2: { lat: number; lng: number }
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = point1.lat * Math.PI / 180;
  const φ2 = point2.lat * Math.PI / 180;
  const Δφ = (point2.lat - point1.lat) * Math.PI / 180;
  const Δλ = (point2.lng - point1.lng) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distance in meters
}

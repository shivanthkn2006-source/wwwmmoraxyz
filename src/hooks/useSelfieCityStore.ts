import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
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

  // Get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          console.log('[SelfieCityStore] Location acquired:', pos.coords.latitude, pos.coords.longitude);
        },
        (err) => console.warn('[SelfieCityStore] Location error:', err),
        { enableHighAccuracy: true }
      );
    }
  }, []);

  // Load selfies from database
  const loadSelfies = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: posts, error } = await supabase
        .from('posts')
        .select(`
          id,
          user_id,
          content,
          media_url,
          location_lat,
          location_lng,
          location_name,
          metadata,
          created_at,
          profiles!posts_user_id_fkey (
            display_name,
            username,
            profile_photo_url
          )
        `)
        .not('location_lat', 'is', null)
        .not('location_lng', 'is', null)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const mappedSelfies: SelfieCityPin[] = (posts || []).map((post: any) => ({
        id: post.id,
        userId: post.user_id,
        imageUrl: post.media_url || '/placeholder.svg',
        caption: post.content,
        location: { 
          lat: post.location_lat, 
          lng: post.location_lng,
          name: post.location_name 
        },
        detectedProducts: (post.metadata as any)?.detected_products || [],
        isPremium: (post.metadata as any)?.is_premium || false,
        userName: post.profiles?.display_name || post.profiles?.username || 'Anonymous',
        avatarUrl: post.profiles?.profile_photo_url,
        createdAt: post.created_at
      }));

      setSelfies(mappedSelfies);
      console.log('[SelfieCityStore] Loaded selfies:', mappedSelfies.length);
    } catch (error) {
      console.error('[SelfieCityStore] Error loading selfies:', error);
      // Fallback demo data
      setSelfies([
        {
          id: '1', userId: 'demo1', imageUrl: '/placeholder.svg',
          caption: 'Weekend vibes ✨', userName: 'Priya',
          location: { lat: (userLocation?.lat || 8.556) + Math.random() * 0.01, lng: (userLocation?.lng || 76.956) + Math.random() * 0.01 },
          detectedProducts: [{ name: 'Kurta', brand: 'Fabindia', category: 'Fashion', confidence: 0.9, isPremium: false }], 
          isPremium: false, createdAt: new Date().toISOString()
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [userLocation]);

  // Load nearby deals based on user location
  const loadNearbyDeals = useCallback(async () => {
    if (!userLocation) return;

    // Indian brand deals organized by category
    const brandDeals: NearbyDeal[] = [
      // Cafes & Food
      { id: 'd1', storeName: 'Chai Point', brandName: 'Chai Point', category: 'Cafes', discount: '30% OFF', description: 'Masala Chai Special', location: { lat: userLocation.lat + 0.002, lng: userLocation.lng + 0.001 }, hasProducts: true, isPremium: false },
      { id: 'd2', storeName: 'Haldiram\'s', brandName: 'Haldiram\'s', category: 'Food', discount: '20% OFF', description: 'Festival Sweets Box', location: { lat: userLocation.lat - 0.001, lng: userLocation.lng + 0.003 }, hasProducts: true, isPremium: false },
      { id: 'd3', storeName: 'Saravana Bhavan', brandName: 'Saravana Bhavan', category: 'Food', discount: '15% OFF', description: 'Lunch Thali', location: { lat: userLocation.lat + 0.003, lng: userLocation.lng - 0.002 }, hasProducts: true, isPremium: false },
      
      // Fashion - Day to Day
      { id: 'd4', storeName: 'Fabindia', brandName: 'Fabindia', category: 'Fashion', discount: '40% OFF', description: 'Ethnic Collection', location: { lat: userLocation.lat - 0.002, lng: userLocation.lng - 0.001 }, hasProducts: true, isPremium: false },
      { id: 'd5', storeName: 'Biba', brandName: 'Biba', category: 'Fashion', discount: '50% OFF', description: 'Kurta Sets', location: { lat: userLocation.lat + 0.001, lng: userLocation.lng + 0.002 }, hasProducts: true, isPremium: false },
      { id: 'd6', storeName: 'W', brandName: 'W', category: 'Fashion', discount: '35% OFF', description: 'Fusion Wear', location: { lat: userLocation.lat - 0.003, lng: userLocation.lng + 0.001 }, hasProducts: true, isPremium: false },
      { id: 'd7', storeName: 'Allen Solly', brandName: 'Allen Solly', category: 'Fashion', discount: '45% OFF', description: 'Formal Shirts', location: { lat: userLocation.lat + 0.002, lng: userLocation.lng - 0.003 }, hasProducts: true, isPremium: false },
      
      // Beauty
      { id: 'd8', storeName: 'Lakmé Salon', brandName: 'Lakmé', category: 'Beauty', discount: '25% OFF', description: 'Hair Treatment', location: { lat: userLocation.lat - 0.001, lng: userLocation.lng - 0.002 }, hasProducts: true, isPremium: false },
      { id: 'd9', storeName: 'Forest Essentials', brandName: 'Forest Essentials', category: 'Beauty', discount: '20% OFF', description: 'Ayurvedic Skincare', location: { lat: userLocation.lat + 0.003, lng: userLocation.lng + 0.003 }, hasProducts: true, isPremium: true },
      { id: 'd10', storeName: 'Nykaa Store', brandName: 'Nykaa', category: 'Beauty', discount: '30% OFF', description: 'Makeup Essentials', location: { lat: userLocation.lat - 0.002, lng: userLocation.lng + 0.002 }, hasProducts: true, isPremium: false },
      
      // Electronics
      { id: 'd11', storeName: 'Croma', brandName: 'Croma', category: 'Electronics', discount: '15% OFF', description: 'Smart TVs', location: { lat: userLocation.lat + 0.001, lng: userLocation.lng - 0.001 }, hasProducts: true, isPremium: false },
      { id: 'd12', storeName: 'Vijay Sales', brandName: 'Vijay Sales', category: 'Electronics', discount: '10% OFF', description: 'Mobile Phones', location: { lat: userLocation.lat - 0.003, lng: userLocation.lng - 0.003 }, hasProducts: true, isPremium: false },
      
      // Jewelry
      { id: 'd13', storeName: 'Tanishq', brandName: 'Tanishq', category: 'Jewelry', discount: '10% OFF', description: 'Gold Collection', location: { lat: userLocation.lat + 0.002, lng: userLocation.lng + 0.002 }, hasProducts: true, isPremium: true },
      { id: 'd14', storeName: 'Kalyan Jewellers', brandName: 'Kalyan Jewellers', category: 'Jewelry', discount: '12% OFF', description: 'Diamond Rings', location: { lat: userLocation.lat - 0.001, lng: userLocation.lng + 0.001 }, hasProducts: true, isPremium: true },
      
      // PREMIUM Section - Luxury Brands
      { id: 'p1', storeName: 'Louis Vuitton', brandName: 'Louis Vuitton', category: 'Premium', discount: 'Exclusive Access', description: 'New Collection Preview', location: { lat: userLocation.lat + 0.004, lng: userLocation.lng + 0.001 }, hasProducts: true, isPremium: true },
      { id: 'p2', storeName: 'Gucci', brandName: 'Gucci', category: 'Premium', discount: 'VIP Event', description: 'Members Only Sale', location: { lat: userLocation.lat - 0.004, lng: userLocation.lng - 0.001 }, hasProducts: true, isPremium: true },
      { id: 'p3', storeName: 'Rolex', brandName: 'Rolex', category: 'Premium', discount: 'Private Viewing', description: 'Oyster Perpetual', location: { lat: userLocation.lat + 0.001, lng: userLocation.lng + 0.004 }, hasProducts: true, isPremium: true },
      { id: 'p4', storeName: 'Mercedes-Benz', brandName: 'Mercedes-Benz', category: 'Premium', discount: 'Test Drive', description: 'EQS Launch', location: { lat: userLocation.lat - 0.002, lng: userLocation.lng + 0.004 }, hasProducts: true, isPremium: true },
      { id: 'p5', storeName: 'Apple Store', brandName: 'Apple', category: 'Premium', discount: 'Today at Apple', description: 'Free Workshop', location: { lat: userLocation.lat + 0.003, lng: userLocation.lng - 0.001 }, hasProducts: true, isPremium: true },
    ];

    // Calculate distances
    const dealsWithDistance = brandDeals.map(deal => ({
      ...deal,
      distance: calculateDistance(userLocation, deal.location)
    })).sort((a, b) => (a.distance || 0) - (b.distance || 0));

    setNearbyDeals(dealsWithDistance);
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

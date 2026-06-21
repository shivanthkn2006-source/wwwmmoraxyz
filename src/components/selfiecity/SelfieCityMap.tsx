import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useOnlinePresence } from '@/hooks/useOnlinePresence';
import { Input } from '@/components/ui/input';
import { Search, Mic, MicOff, Sparkles } from 'lucide-react';
import { useSelfieCitySearch } from '@/hooks/useSelfieCitySearch';
import { useSelfieCityVoice } from '@/hooks/useSelfieCityVoice';
import { Button } from '@/components/ui/button';

interface SelfieCityMapProps {
  filter: 'friends' | 'sales' | 'products' | 'premium';
  selfies: any[];
  deals: any[];
  onPinClick: (pin: any) => void;
  userLocation: { lat: number; lng: number } | null;
}

interface MapUser {
  id: string;
  user_id: string;
  username: string;
  avatar_url?: string;
  location: { lat: number; lng: number };
  isActive: boolean;
  isLive: boolean;
  category?: string;
}

interface SearchResult {
  type: string;
  name: string;
  brand?: string;
  category: string;
  description?: string;
  discount?: string;
  relevance_score: number;
  thumbnail?: string;
}

// Brand thumbnails mapping for common Indian brands
const BRAND_THUMBNAILS: Record<string, string> = {
  'Aashirvaad': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Aashirvaad_Logo.svg/200px-Aashirvaad_Logo.svg.png',
  'Tata Salt': 'https://www.tatasalt.com/assets/images/logo.png',
  'Fortune': 'https://www.fortunefoods.com/images/fortune-logo.png',
  'Patanjali': 'https://upload.wikimedia.org/wikipedia/en/thumb/0/04/Patanjali_Ayurved.svg/200px-Patanjali_Ayurved.svg.png',
  'MDH': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/MDH_logo.svg/200px-MDH_logo.svg.png',
  'Amul': 'https://upload.wikimedia.org/wikipedia/en/thumb/2/24/Amul_official_logo.svg/200px-Amul_official_logo.svg.png',
  'Britannia': 'https://upload.wikimedia.org/wikipedia/en/thumb/5/5d/Britannia_Industries_logo.svg/200px-Britannia_Industries_logo.svg.png',
  'Parle': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/Parle_Products_Logo.svg/200px-Parle_Products_Logo.svg.png',
  'Haldiram': 'https://haldirams.com/wp-content/uploads/2020/12/logo.png',
  'Lakme': 'https://upload.wikimedia.org/wikipedia/en/thumb/9/96/Lakme_brand.svg/200px-Lakme_brand.svg.png',
  'Himalaya': 'https://upload.wikimedia.org/wikipedia/en/thumb/d/d9/Himalaya_Drug_Company_logo.svg/200px-Himalaya_Drug_Company_logo.svg.png',
  'Boat': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Boat_logo.svg/200px-Boat_logo.svg.png',
  'Realme': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Realme_Logo.svg/200px-Realme_Logo.svg.png',
  'OnePlus': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/OnePlus_logo.svg/200px-OnePlus_logo.svg.png',
  'Fabindia': 'https://upload.wikimedia.org/wikipedia/en/thumb/4/48/Fabindia_logo.svg/200px-Fabindia_logo.svg.png',
  'Raymond': 'https://upload.wikimedia.org/wikipedia/en/thumb/2/2a/Raymond_Group_Logo.svg/200px-Raymond_Group_Logo.svg.png',
  'Godrej': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Godrej_Logo.svg/200px-Godrej_Logo.svg.png',
  'Dabur': 'https://upload.wikimedia.org/wikipedia/en/thumb/1/1f/Dabur_logo.svg/200px-Dabur_logo.svg.png',
  'ITC': 'https://upload.wikimedia.org/wikipedia/en/thumb/3/3e/ITC_Limited_Logo.svg/200px-ITC_Limited_Logo.svg.png',
  'Zomato': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/Zomato_logo.png/200px-Zomato_logo.png',
  'Swiggy': 'https://upload.wikimedia.org/wikipedia/en/thumb/1/12/Swiggy_logo.svg/200px-Swiggy_logo.svg.png',
};

// Get thumbnail for a brand/product
const getBrandThumbnail = (name: string, category: string): string => {
  if (BRAND_THUMBNAILS[name]) return BRAND_THUMBNAILS[name];
  
  for (const [brand, url] of Object.entries(BRAND_THUMBNAILS)) {
    if (name.toLowerCase().includes(brand.toLowerCase())) return url;
  }
  
  const categoryIcons: Record<string, string> = {
    grocery: '🛒',
    fashion: '👔',
    electronics: '📱',
    beauty: '💄',
    food: '🍽️',
    home: '🏠',
    health: '💊',
    services: '🛎️',
  };
  const icon = categoryIcons[category.toLowerCase()] || '📦';
  return `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect fill="%23222" width="40" height="40" rx="6"/><text x="50%" y="50%" font-size="20" text-anchor="middle" dy=".35em">${icon}</text></svg>`;
};

// Custom hook to handle map center updates without forcing zoom (keeps user zoom intact)
const MapController: React.FC<{ center: [number, number] }> = ({ center }) => {
  const map = useMap();

  useEffect(() => {
    const current = map.getCenter();
    const latDiff = Math.abs(current.lat - center[0]);
    const lngDiff = Math.abs(current.lng - center[1]);
    if (latDiff < 1e-6 && lngDiff < 1e-6) return;

    map.panTo(center, { animate: true, duration: 0.6 });
  }, [map, center]);

  return null;
};

// Fix for initial 0px render and tab/overlay layout changes
const MapResizeFixer: React.FC = () => {
  const map = useMap();

  useEffect(() => {
    window.setTimeout(() => map.invalidateSize(), 50);
    window.setTimeout(() => map.invalidateSize(), 250);
  }, [map]);

  return null;
};

// Create custom marker icons
const createUserIcon = (isLive: boolean, isActive: boolean) => {
  const color = isLive ? '#00f0ff' : isActive ? '#10b981' : '#6b7280';
  const pulse = isLive ? 'animation: pulse 1.5s infinite;' : '';
  
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: ${color};
        border: 3px solid white;
        box-shadow: 0 0 15px ${color}80;
        ${pulse}
      "></div>
      <style>
        @keyframes pulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 15px ${color}80; }
          50% { transform: scale(1.1); box-shadow: 0 0 25px ${color}; }
        }
      </style>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

const createUserLocationIcon = () => {
  return L.divIcon({
    className: 'user-location-marker',
    html: `
      <div style="
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: hsl(185, 100%, 50%);
        border: 4px solid white;
        box-shadow: 0 0 20px hsla(185, 100%, 50%, 0.8);
        animation: userPulse 1.5s infinite;
      "></div>
      <style>
        @keyframes userPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.2); }
        }
      </style>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
};

const SelfieCityMap: React.FC<SelfieCityMapProps> = ({
  filter,
  selfies,
  deals,
  onPinClick,
  userLocation
}) => {
  const [defaultLocation, setDefaultLocation] = useState<{ lat: number; lng: number; city?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [mapUsers, setMapUsers] = useState<MapUser[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [zoeInsight, setZoeInsight] = useState('');

  // Use Google Maps-like bright, clear tiles
  const [tileUrl, setTileUrl] = useState(
    'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}'
  );
  const [tileAttribution, setTileAttribution] = useState(
    '&copy; Google Maps'
  );
  
  const { isUserOnline } = useOnlinePresence();
  const { search, quickSearch, results, zoeInsight: searchZoeInsight } = useSelfieCitySearch();
  const { isListening, toggleListening, transcript, registerCallbacks } = useSelfieCityVoice();

  // Default center (Trivandrum, India)
  const mapCenter: [number, number] = useMemo(() => {
    if (userLocation) return [userLocation.lat, userLocation.lng];
    if (defaultLocation) return [defaultLocation.lat, defaultLocation.lng];
    return [8.5241, 76.9366];
  }, [userLocation?.lat, userLocation?.lng, defaultLocation?.lat, defaultLocation?.lng]);

  // Register voice callbacks
  useEffect(() => {
    registerCallbacks({
      onSearch: (query, results) => {
        setSearchQuery(query);
        setSearchResults(results);
        setShowSearchResults(true);
        // Dispatch to Zoe Orb
        window.dispatchEvent(new CustomEvent('selfie-city-search-results', { 
          detail: { query, results, zoeInsight: searchZoeInsight } 
        }));
      },
      onAction: (action, data) => {
        window.dispatchEvent(new CustomEvent('selfie-city-voice-action', { detail: { action, data } }));
      },
    });
  }, [registerCallbacks, searchZoeInsight]);

  // Sync search results
  useEffect(() => {
    if (results.length > 0) {
      setSearchResults(results);
      setShowSearchResults(true);
      // Dispatch to Zoe Orb for integration
      window.dispatchEvent(new CustomEvent('selfie-city-search-results', { 
        detail: { query: searchQuery, results, zoeInsight: searchZoeInsight } 
      }));
    }
    if (searchZoeInsight) {
      setZoeInsight(searchZoeInsight);
    }
  }, [results, searchZoeInsight, searchQuery]);

  // Listen for HUD filter events
  useEffect(() => {
    const handleFilterEvent = (e: CustomEvent<string>) => {
      const filter = e.detail;
      setCategoryFilter(prev => prev === filter ? null : filter);
    };
    
    window.addEventListener('selfie-city-filter', handleFilterEvent as EventListener);
    return () => window.removeEventListener('selfie-city-filter', handleFilterEvent as EventListener);
  }, []);

  // Fetch default location from IP
  useEffect(() => {
    const fetchDefaultLocation = async () => {
      try {
        const { data } = await supabase.functions.invoke('get-user-location');
        if (data?.lat && data?.lng) {
          setDefaultLocation({ lat: data.lat, lng: data.lng, city: data.city });
        }
      } catch (err) {
        console.error('[SelfieCityMap] Location fetch error:', err);
        setDefaultLocation({ lat: 8.5241, lng: 76.9366, city: 'Thiruvananthapuram' });
      } finally {
        setIsLoading(false);
      }
    };
    fetchDefaultLocation();
  }, []);

  // Load brand deals with logos immediately based on user location/IP
  const [brandDeals, setBrandDeals] = useState<any[]>([]);
  
  useEffect(() => {
    const loadBrandDeals = async () => {
      try {
        const { data: deals } = await supabase
          .from('brand_deals')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);
        
        if (deals) {
          setBrandDeals(deals);
          console.log('[SelfieCityMap] Loaded', deals.length, 'brand deals');
        }
      } catch (err) {
        console.warn('[SelfieCityMap] Brand deals error:', err);
      }
    };
    
    // Load immediately
    loadBrandDeals();
  }, []);

  // Load users from selfie_city_pins with robust fallback - IMMEDIATE
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const { data: pins } = await supabase
          .from('selfie_city_pins')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);

        if (pins && pins.length > 0) {
          const users: MapUser[] = pins.map((pin: any) => ({
            id: pin.id,
            user_id: pin.user_id,
            username: pin.username || 'Anonymous',
            avatar_url: pin.image_url,
            location: { lat: pin.location_lat, lng: pin.location_lng },
            isActive: isUserOnline(pin.user_id),
            isLive: Math.random() > 0.7,
            category: pin.detected_products?.[0]?.category || 'general',
          }));
          setMapUsers(users);
          return;
        }
        
        setMapUsers(generateDemoUsers());
      } catch (err) {
        setMapUsers(generateDemoUsers());
      }
    };
    
    loadUsers();
  }, [isUserOnline, defaultLocation, userLocation]);

  // Generate demo users near current location for fallback
  const generateDemoUsers = useCallback((): MapUser[] => {
    const baseLocation = userLocation || defaultLocation || { lat: 8.524139, lng: 76.936638 };
    const categories = ['fashion', 'food', 'tech', 'beauty', 'shopping'];
    const names = ['Priya', 'Rahul', 'Ananya', 'Vikram', 'Meera', 'Arjun', 'Divya', 'Karthik', 'Sneha', 'Rohan'];
    const demoUsers: MapUser[] = [];

    // Generate 20-40 users near the current location
    const userCount = 20 + Math.floor(Math.random() * 20);
    for (let i = 0; i < userCount; i++) {
      demoUsers.push({
        id: `demo-${i}`,
        user_id: `user-${i}`,
        username: names[i % names.length] + (Math.floor(i / names.length) || ''),
        avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=selfiecity-${i}`,
        location: {
          lat: baseLocation.lat + (Math.random() - 0.5) * 0.05,
          lng: baseLocation.lng + (Math.random() - 0.5) * 0.05,
        },
        isActive: Math.random() > 0.4,
        isLive: Math.random() > 0.75,
        category: categories[Math.floor(Math.random() * categories.length)],
      });
    }
    return demoUsers;
  }, [userLocation, defaultLocation]);

  // Handle search input
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    if (value.length >= 2) {
      quickSearch(value);
      setShowSearchResults(true);
    } else {
      setShowSearchResults(false);
    }
  }, [quickSearch]);

  // Handle search submit
  const handleSearchSubmit = useCallback(async () => {
    if (searchQuery.length >= 2) {
      const location = userLocation || defaultLocation;
      await search(searchQuery, location || undefined);
      setShowSearchResults(true);
    }
  }, [searchQuery, search, userLocation, defaultLocation]);

  // Filter users based on category
  const filteredUsers = categoryFilter 
    ? mapUsers.filter(u => u.category === categoryFilter)
    : mapUsers;

  if (isLoading) {
    return (
      <div className="absolute inset-0 bg-background flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-gpu-spin-2s" />
      </div>
    );
  }

  return (
    <>
      {/* Leaflet Map - Free, fast, no API key needed */}
      <MapContainer
        center={mapCenter}
        zoom={12}
        minZoom={0}
        maxZoom={18}
        className="absolute inset-0 z-0"
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
        attributionControl={false}
        worldCopyJump={true}
        scrollWheelZoom={true}
        touchZoom={true}
        doubleClickZoom={true}
        dragging={true}
      >
        <MapController center={mapCenter} />
        <MapResizeFixer />

        <TileLayer
          key={tileUrl}
          url={tileUrl}
          attribution={tileAttribution}
          eventHandlers={{
            tileerror: () => {
              // Fallback to bright OpenStreetMap if CARTO is blocked
              if (tileUrl.includes('cartocdn.com')) {
                setTileUrl('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');
                setTileAttribution(
                  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                );
              }
            },
          }}
          className="leaflet-tile-layer-bright"
        />
        
        {/* User markers */}
        {filteredUsers.map(user => (
          <Marker
            key={user.id}
            position={[user.location.lat, user.location.lng]}
            icon={createUserIcon(user.isLive, user.isActive)}
            eventHandlers={{
              click: () => onPinClick(user),
            }}
          >
            <Popup className="selfie-city-popup">
              <div className="text-sm">
                <strong>{user.username}</strong>
                <br />
                <span className="text-muted-foreground">{user.category}</span>
              </div>
            </Popup>
          </Marker>
        ))}
        
        {/* Brand Deal Markers with Logos */}
        {brandDeals.filter(d => d.location_lat && d.location_lng).map(deal => (
          <Marker
            key={deal.id}
            position={[deal.location_lat, deal.location_lng]}
            icon={L.divIcon({
              className: 'brand-deal-marker',
              html: `
                <div style="
                  width: 44px;
                  height: 44px;
                  border-radius: 12px;
                  background: linear-gradient(135deg, hsl(280 80% 50%), hsl(320 80% 50%));
                  border: 2px solid white;
                  box-shadow: 0 4px 15px rgba(168,85,247,0.5);
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  overflow: hidden;
                ">
                  <img 
                    src="${deal.brand_logo_url || `https://logo.clearbit.com/${deal.brand_name.toLowerCase().replace(/\s/g, '')}.com`}" 
                    alt="${deal.brand_name}"
                    style="width: 32px; height: 32px; object-fit: contain; border-radius: 6px; background: white;"
                    onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
                  />
                  <span style="display: none; font-size: 10px; color: white; font-weight: bold; text-align: center;">${deal.brand_name.substring(0,3)}</span>
                </div>
                ${deal.discount_text ? `<div style="position: absolute; top: -8px; right: -8px; background: hsl(142 80% 45%); color: white; font-size: 8px; font-weight: bold; padding: 2px 4px; border-radius: 4px; white-space: nowrap;">${deal.discount_text}</div>` : ''}
              `,
              iconSize: [44, 44],
              iconAnchor: [22, 22],
            })}
            eventHandlers={{
              click: () => onPinClick({ ...deal, type: 'deal', isPremium: deal.is_premium }),
            }}
          >
            <Popup className="selfie-city-popup">
              <div className="text-sm">
                <strong>{deal.brand_name}</strong>
                <br />
                <span className="text-primary">{deal.discount_text}</span>
                <br />
                <span className="text-muted-foreground text-xs">{deal.store_name}</span>
              </div>
            </Popup>
          </Marker>
        ))}
        
        {userLocation && (
          <>
            <Marker
              position={[userLocation.lat, userLocation.lng]}
              icon={createUserLocationIcon()}
            />
            <Circle
              center={[userLocation.lat, userLocation.lng]}
              radius={500}
              pathOptions={{
                color: 'hsl(185, 100%, 50%)',
                fillColor: 'hsl(185, 100%, 50%)',
                fillOpacity: 0.1,
                weight: 1,
              }}
            />
          </>
        )}
      </MapContainer>
      
      {/* Search Bar with Voice - Bottom Center - Borderless top design */}
      <motion.div 
        className="fixed bottom-6 left-0 right-0 z-50 flex justify-center px-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="relative w-full max-w-sm flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/60" />
            <Input
              placeholder="Search products, brands, offers..."
              className="w-full pl-12 pr-4 py-3 bg-background/80 backdrop-blur-2xl border-0 border-b border-primary/20 rounded-none rounded-b-2xl text-foreground placeholder:text-muted-foreground focus:ring-0 focus:border-primary/40 transition-all shadow-lg"
              value={isListening ? transcript : searchQuery}
              onChange={handleSearchChange}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit()}
            />
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={toggleListening}
            className={`rounded-full w-11 h-11 backdrop-blur-xl border-0 ${isListening ? 'bg-primary/20 text-primary animate-pulse' : 'bg-background/80'}`}
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </Button>
        </div>
      </motion.div>

      {/* Search Results Dropdown - 10 items with thumbnails */}
      <AnimatePresence>
        {showSearchResults && searchResults.length > 0 && (
          <motion.div
            className="fixed bottom-24 left-0 right-0 z-50 flex justify-center px-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
          >
            <div className="w-full max-w-sm bg-background/95 backdrop-blur-xl rounded-b-xl border-0 border-b border-x border-border/30 shadow-xl max-h-[420px] overflow-y-auto">
              {zoeInsight && (
                <div className="p-3 border-b border-border/30 flex items-center gap-2 text-sm text-primary">
                  <Sparkles className="w-4 h-4" />
                  <span>{zoeInsight}</span>
                </div>
              )}
              {searchResults.slice(0, 10).map((result, i) => (
                <div
                  key={i}
                  className="p-3 hover:bg-primary/10 cursor-pointer border-b border-border/20 last:border-0 flex items-center gap-3"
                  onClick={() => {
                    setSearchQuery(result.name);
                    setShowSearchResults(false);
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground truncate">{result.name}</span>
                      {result.discount && <span className="text-xs text-primary shrink-0">{result.discount}</span>}
                    </div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">{result.category} • {result.type}</div>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-background/50 border border-border/30 overflow-hidden shrink-0 flex items-center justify-center">
                    <img 
                      src={getBrandThumbnail(result.name, result.category)} 
                      alt={result.name}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect fill="%23333" width="40" height="40" rx="6"/><text x="50%" y="50%" font-size="14" fill="%23888" text-anchor="middle" dy=".35em">${result.name.charAt(0)}</text></svg>`;
                      }}
                    />
                  </div>
                </div>
              ))}
              <button
                onClick={() => setShowSearchResults(false)}
                className="w-full p-2 text-xs text-muted-foreground hover:text-foreground"
              >
                Close
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* User Count Indicator */}
      <motion.div
        className="absolute top-4 right-4 bg-background/80 backdrop-blur-xl rounded-lg px-3 py-2 border border-border/50 z-10"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
      >
        <div className="flex items-center gap-2 text-sm">
          <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
          <span className="text-muted-foreground">
            {mapUsers.filter(u => u.isLive).length} Live
          </span>
          <span className="text-border">|</span>
          <span className="text-foreground font-medium">
            {mapUsers.length} Users
          </span>
        </div>
      </motion.div>

      {/* Map Overlays */}
      <div className="absolute inset-0 pointer-events-none z-[1]">
        <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(0,240,255,0.01)_2px,rgba(0,240,255,0.01)_4px)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.3)_100%)]" />
      </div>

      {/* Custom styles for Leaflet */}
      <style>{`
        .leaflet-container {
          background: hsl(var(--background)) !important;
        }
        /* Ensure tiles are not affected by global img styles */
        .leaflet-container img {
          max-width: none !important;
        }
        .leaflet-popup-content-wrapper {
          background: hsl(var(--background) / 0.95);
          backdrop-filter: blur(12px);
          border: 1px solid hsl(var(--border) / 0.5);
          border-radius: 12px;
          color: hsl(var(--foreground));
        }
        .leaflet-popup-tip {
          background: hsl(var(--background) / 0.95);
          border: 1px solid hsl(var(--border) / 0.5);
        }
        .leaflet-control-zoom {
          border: 1px solid hsl(var(--border) / 0.5);
          box-shadow: 0 10px 30px -12px hsl(var(--foreground) / 0.25);
          border-radius: 12px;
          overflow: hidden;
        }
        .leaflet-control-zoom a {
          background: hsl(var(--background) / 0.85);
          color: hsl(var(--foreground));
          backdrop-filter: blur(12px);
        }
        .leaflet-control-zoom a:hover {
          background: hsl(var(--accent) / 0.2);
        }
        .custom-marker, .user-location-marker {
          background: transparent !important;
          border: none !important;
        }
      `}</style>
    </>
  );
};

export default SelfieCityMap;

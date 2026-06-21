/**
 * LOCATION-BASED AVATAR DRESSING SYSTEM
 * Detects user's region via IP geolocation and applies appropriate traditional attire overlay.
 * Kerala → Saree/Mundu style, North India → Salwar/Kurta, etc.
 * Uses static regional images as fallback, with optional AI-generated dynamic avatars.
 */

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Regional avatar images
import imgSouthIndian from '@/assets/zoe-regional/south-indian.png';
import imgNorthIndian from '@/assets/zoe-regional/north-indian.png';
import imgBengali from '@/assets/zoe-regional/bengali.png';
import imgGujarati from '@/assets/zoe-regional/gujarati.png';
import imgPunjabi from '@/assets/zoe-regional/punjabi.png';
import imgNortheast from '@/assets/zoe-regional/northeast.png';
import imgWestern from '@/assets/zoe-regional/western.png';
import imgEastAsian from '@/assets/zoe-regional/east-asian.png';
import imgMiddleEastern from '@/assets/zoe-regional/middle-eastern.png';
import imgSoutheastAsian from '@/assets/zoe-regional/southeast-asian.png';
import imgAfrican from '@/assets/zoe-regional/african.png';
import imgLatin from '@/assets/zoe-regional/latin.png';

export type RegionalDressStyle = 
  | 'south-indian-saree'     // Kerala, Tamil Nadu, Karnataka, AP, Telangana
  | 'north-indian-traditional' // UP, MP, Rajasthan, Bihar, Delhi, Haryana
  | 'bengali-traditional'    // West Bengal, Odisha
  | 'gujarati-traditional'   // Gujarat, Maharashtra  
  | 'punjabi-traditional'    // Punjab, Chandigarh
  | 'northeast-traditional'  // NE India
  | 'western-casual'         // US, UK, Europe, Australia
  | 'east-asian'             // Japan, Korea, China
  | 'middle-eastern'         // UAE, Saudi, etc.
  | 'southeast-asian'        // Thailand, Indonesia, Malaysia
  | 'african-traditional'    // Africa
  | 'latin-traditional'      // Latin America
  | 'default';

export interface RegionalDressInfo {
  style: RegionalDressStyle;
  label: string;
  description: string;
  colorAccent: string; // CSS color for UI accent
  overlayFilter: string; // CSS filter to tint avatar
  avatarImage: string; // Regional avatar image URL
  region: string;
  country: string;
}

const INDIAN_STATE_MAP: Record<string, RegionalDressStyle> = {
  'kerala': 'south-indian-saree',
  'tamil nadu': 'south-indian-saree',
  'karnataka': 'south-indian-saree',
  'andhra pradesh': 'south-indian-saree',
  'telangana': 'south-indian-saree',
  'puducherry': 'south-indian-saree',
  'uttar pradesh': 'north-indian-traditional',
  'madhya pradesh': 'north-indian-traditional',
  'rajasthan': 'north-indian-traditional',
  'bihar': 'north-indian-traditional',
  'delhi': 'north-indian-traditional',
  'haryana': 'north-indian-traditional',
  'uttarakhand': 'north-indian-traditional',
  'himachal pradesh': 'north-indian-traditional',
  'jharkhand': 'north-indian-traditional',
  'chhattisgarh': 'north-indian-traditional',
  'west bengal': 'bengali-traditional',
  'odisha': 'bengali-traditional',
  'gujarat': 'gujarati-traditional',
  'maharashtra': 'gujarati-traditional',
  'goa': 'gujarati-traditional',
  'punjab': 'punjabi-traditional',
  'chandigarh': 'punjabi-traditional',
  'jammu and kashmir': 'punjabi-traditional',
  'ladakh': 'punjabi-traditional',
  'assam': 'northeast-traditional',
  'meghalaya': 'northeast-traditional',
  'manipur': 'northeast-traditional',
  'mizoram': 'northeast-traditional',
  'nagaland': 'northeast-traditional',
  'tripura': 'northeast-traditional',
  'arunachal pradesh': 'northeast-traditional',
  'sikkim': 'northeast-traditional',
};

const COUNTRY_MAP: Record<string, RegionalDressStyle> = {
  'us': 'western-casual', 'united states': 'western-casual',
  'uk': 'western-casual', 'united kingdom': 'western-casual',
  'canada': 'western-casual', 'australia': 'western-casual',
  'germany': 'western-casual', 'france': 'western-casual',
  'italy': 'western-casual', 'spain': 'western-casual',
  'netherlands': 'western-casual', 'sweden': 'western-casual',
  'japan': 'east-asian', 'south korea': 'east-asian', 'china': 'east-asian',
  'taiwan': 'east-asian',
  'uae': 'middle-eastern', 'united arab emirates': 'middle-eastern',
  'saudi arabia': 'middle-eastern', 'qatar': 'middle-eastern',
  'kuwait': 'middle-eastern', 'bahrain': 'middle-eastern', 'oman': 'middle-eastern',
  'thailand': 'southeast-asian', 'indonesia': 'southeast-asian',
  'malaysia': 'southeast-asian', 'philippines': 'southeast-asian',
  'vietnam': 'southeast-asian', 'singapore': 'southeast-asian',
  'nigeria': 'african-traditional', 'south africa': 'african-traditional',
  'kenya': 'african-traditional', 'ghana': 'african-traditional',
  'ethiopia': 'african-traditional', 'egypt': 'african-traditional',
  'brazil': 'latin-traditional', 'mexico': 'latin-traditional',
  'argentina': 'latin-traditional', 'colombia': 'latin-traditional',
};

const DRESS_INFO: Record<RegionalDressStyle, Omit<RegionalDressInfo, 'style' | 'region' | 'country'>> = {
  'south-indian-saree': {
    label: 'South Indian Traditional',
    description: 'Elegant silk saree with temple jewelry',
    colorAccent: '#d4af37',
    overlayFilter: 'sepia(0.12) hue-rotate(8deg) saturate(1.15)',
    avatarImage: imgSouthIndian,
  },
  'north-indian-traditional': {
    label: 'North Indian Traditional',
    description: 'Vibrant lehenga choli with kundan jewelry',
    colorAccent: '#e74c3c',
    overlayFilter: 'sepia(0.08) hue-rotate(-5deg) saturate(1.2)',
    avatarImage: imgNorthIndian,
  },
  'bengali-traditional': {
    label: 'Bengali Traditional',
    description: 'Red & white tant saree with gold borders',
    colorAccent: '#c0392b',
    overlayFilter: 'sepia(0.1) hue-rotate(-8deg) saturate(1.18)',
    avatarImage: imgBengali,
  },
  'gujarati-traditional': {
    label: 'Gujarati Traditional',
    description: 'Bandhani saree with mirror work',
    colorAccent: '#e67e22',
    overlayFilter: 'sepia(0.1) hue-rotate(12deg) saturate(1.22)',
    avatarImage: imgGujarati,
  },
  'punjabi-traditional': {
    label: 'Punjabi Traditional',
    description: 'Phulkari dupatta with salwar kameez',
    colorAccent: '#f39c12',
    overlayFilter: 'sepia(0.06) hue-rotate(15deg) saturate(1.25)',
    avatarImage: imgPunjabi,
  },
  'northeast-traditional': {
    label: 'Northeast Traditional',
    description: 'Mekhela chador with tribal patterns',
    colorAccent: '#27ae60',
    overlayFilter: 'sepia(0.05) hue-rotate(20deg) saturate(1.1)',
    avatarImage: imgNortheast,
  },
  'western-casual': {
    label: 'Western Contemporary',
    description: 'Modern elegant outfit',
    colorAccent: '#3498db',
    overlayFilter: 'saturate(1.05)',
    avatarImage: imgWestern,
  },
  'east-asian': {
    label: 'East Asian Traditional',
    description: 'Elegant kimono-inspired attire',
    colorAccent: '#e84393',
    overlayFilter: 'sepia(0.08) hue-rotate(5deg) saturate(1.12)',
    avatarImage: imgEastAsian,
  },
  'middle-eastern': {
    label: 'Middle Eastern Traditional',
    description: 'Elegant abaya with gold accents',
    colorAccent: '#2c3e50',
    overlayFilter: 'sepia(0.15) saturate(0.95) brightness(0.98)',
    avatarImage: imgMiddleEastern,
  },
  'southeast-asian': {
    label: 'Southeast Asian Traditional',
    description: 'Colorful batik-inspired outfit',
    colorAccent: '#16a085',
    overlayFilter: 'sepia(0.06) hue-rotate(25deg) saturate(1.15)',
    avatarImage: imgSoutheastAsian,
  },
  'african-traditional': {
    label: 'African Traditional',
    description: 'Vibrant ankara print dress',
    colorAccent: '#e74c3c',
    overlayFilter: 'sepia(0.08) saturate(1.3) hue-rotate(-3deg)',
    avatarImage: imgAfrican,
  },
  'latin-traditional': {
    label: 'Latin Traditional',
    description: 'Colorful traditional dress',
    colorAccent: '#e91e63',
    overlayFilter: 'sepia(0.05) saturate(1.2) hue-rotate(8deg)',
    avatarImage: imgLatin,
  },
  'default': {
    label: 'Zoe Default',
    description: 'Signature Zoe Infinity style',
    colorAccent: '#00e5ff',
    overlayFilter: '',
    avatarImage: '',
  },
};

function resolveStyle(country: string, region: string): RegionalDressStyle {
  const countryLower = country.toLowerCase();
  const regionLower = region.toLowerCase();
  
  // India - check state first
  if (countryLower === 'india' || countryLower === 'in') {
    return INDIAN_STATE_MAP[regionLower] || 'south-indian-saree';
  }
  
  return COUNTRY_MAP[countryLower] || 'default';
}

async function fetchGeoWithFallback(): Promise<{ country: string; region: string }> {
  // Primary: ipapi.co
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch('https://ipapi.co/json/', { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      return { country: data.country_name || '', region: data.region || '' };
    }
  } catch { /* fall through */ }

  // Fallback: ip-api.com (free, no key needed)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch('http://ip-api.com/json/?fields=country,regionName', { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      console.log('[ZoeRegionalDress] Used fallback ip-api.com');
      return { country: data.country || '', region: data.regionName || '' };
    }
  } catch { /* fall through */ }

  throw new Error('All geo services failed');
}

const DYNAMIC_AVATAR_CACHE: Record<string, string> = {};

async function tryDynamicAvatar(style: RegionalDressStyle): Promise<string | null> {
  // Check memory cache first
  if (DYNAMIC_AVATAR_CACHE[style]) return DYNAMIC_AVATAR_CACHE[style];

  // Check localStorage cache (persists across sessions)
  try {
    const cached = localStorage.getItem(`zoe_dynamic_avatar_${style}`);
    if (cached) {
      DYNAMIC_AVATAR_CACHE[style] = cached;
      return cached;
    }
  } catch { /* ignore */ }

  try {
    const { data, error } = await supabase.functions.invoke('generate-regional-avatar', {
      body: { style, mood: 'idle', provider: 'pollinations' },
    });

    if (error || !data?.imageUrl) return null;

    // Cache the result
    DYNAMIC_AVATAR_CACHE[style] = data.imageUrl;
    try {
      localStorage.setItem(`zoe_dynamic_avatar_${style}`, data.imageUrl);
    } catch { /* storage full */ }

    return data.imageUrl;
  } catch {
    return null;
  }
}

export function useZoeRegionalDress(): RegionalDressInfo & { isLoading: boolean } {
  const [info, setInfo] = useState<RegionalDressInfo>({
    style: 'default',
    ...DRESS_INFO['default'],
    region: '',
    country: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const fetched = useRef(false);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;

    const detect = async () => {
      try {
        const geoData = await fetchGeoWithFallback();
        const country = geoData.country;
        const region = geoData.region;
        const style = resolveStyle(country, region);
        const dressInfo = DRESS_INFO[style];
        
        console.log(`[ZoeRegionalDress] Detected: ${region}, ${country} → ${style}`);
        
        // Set static avatar immediately
        setInfo({
          style,
          ...dressInfo,
          region,
          country,
        });
        setIsLoading(false);

        // Keep Zoe's identity visually stable in chat mode.
        // Regional detection stays wired, but we do not swap to AI-generated alternate people here.
      } catch (err) {
        console.warn('[ZoeRegionalDress] All geolocation services failed, using default:', err);
        setIsLoading(false);
      }
    };

    detect();
  }, []);

  return { ...info, isLoading };
}

export default useZoeRegionalDress;

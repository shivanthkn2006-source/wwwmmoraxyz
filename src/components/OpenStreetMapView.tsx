import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ScrollArea } from "@/components/ui/scroll-area";
import { NotificationBadgeOverlay } from './NotificationBadgeOverlay';

// Fix for default marker icons in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface User {
  user_id: string;
  display_name: string;
  username: string;
  profile_photo_url?: string;
  city?: string;
  hobbies: string[];
  status?: string;
  notifications?: Array<{
    symbolId: string;
    count?: number;
    timestamp: Date;
  }>;
}

interface Landmark {
  name: string;
  coordinates: [number, number];
  type: 'monument' | 'mountain' | 'waterfall' | 'volcano' | 'meteorite';
}

interface OpenStreetMapViewProps {
  users: User[];
  onUserClick: (userId: string) => void;
  onAddFriend?: (userId: string, e: React.MouseEvent) => void;
  onSendMessage?: (userId: string, e: React.MouseEvent) => void;
  isUserOnline?: (userId: string) => boolean;
  currentUserId?: string;
}

const landmarks: Landmark[] = [
  // Famous Monuments & Wonders
  { name: 'Great Wall of China', coordinates: [40.4319, 116.5704], type: 'monument' },
  { name: 'Colosseum', coordinates: [41.8902, 12.4922], type: 'monument' },
  { name: 'Taj Mahal', coordinates: [27.1751, 78.0421], type: 'monument' },
  { name: 'Eiffel Tower', coordinates: [48.8584, 2.2945], type: 'monument' },
  { name: 'Statue of Liberty', coordinates: [40.6892, -74.0445], type: 'monument' },
  { name: 'Petra', coordinates: [30.3285, 35.4444], type: 'monument' },
  { name: 'Machu Picchu', coordinates: [-13.1631, -72.5450], type: 'monument' },
  { name: 'Christ the Redeemer', coordinates: [-22.9519, -43.2105], type: 'monument' },
  { name: 'Chichen Itza', coordinates: [20.6843, -88.5678], type: 'monument' },
  { name: 'Stonehenge', coordinates: [51.1789, -1.8262], type: 'monument' },
  { name: 'Angkor Wat', coordinates: [13.4125, 103.8670], type: 'monument' },
  { name: 'Acropolis', coordinates: [37.9715, 23.7257], type: 'monument' },
  { name: 'Forbidden City', coordinates: [39.9163, 116.3972], type: 'monument' },
  { name: 'Big Ben', coordinates: [51.5007, -0.1246], type: 'monument' },
  { name: 'Brandenburg Gate', coordinates: [52.5163, 13.3777], type: 'monument' },
  { name: 'Sydney Opera House', coordinates: [-33.8568, 151.2153], type: 'monument' },
  { name: 'Burj Khalifa', coordinates: [25.1972, 55.2744], type: 'monument' },
  { name: 'Leaning Tower of Pisa', coordinates: [43.7230, 10.3966], type: 'monument' },
  { name: 'Neuschwanstein Castle', coordinates: [47.5576, 10.7498], type: 'monument' },
  { name: 'Golden Gate Bridge', coordinates: [37.8199, -122.4783], type: 'monument' },
  
  // Mountains
  { name: 'Mount Everest', coordinates: [27.9881, 86.9250], type: 'mountain' },
  { name: 'Mount Kilimanjaro', coordinates: [-3.0674, 37.3556], type: 'mountain' },
  { name: 'Mount Fuji', coordinates: [35.3606, 138.7274], type: 'mountain' },
  { name: 'Mont Blanc', coordinates: [45.8326, 6.8652], type: 'mountain' },
  { name: 'Denali', coordinates: [63.0695, -151.0074], type: 'mountain' },
  { name: 'Matterhorn', coordinates: [45.9763, 7.6586], type: 'mountain' },
  { name: 'Mount Elbrus', coordinates: [43.3499, 42.4387], type: 'mountain' },
  { name: 'Mount McKinley', coordinates: [63.0695, -151.0074], type: 'mountain' },
  { name: 'Table Mountain', coordinates: [-33.9628, 18.4098], type: 'mountain' },
  { name: 'Mount Olympus', coordinates: [40.0854, 22.3583], type: 'mountain' },
  
  // Waterfalls
  { name: 'Niagara Falls', coordinates: [43.0828, -79.0763], type: 'waterfall' },
  { name: 'Victoria Falls', coordinates: [-17.9243, 25.8572], type: 'waterfall' },
  { name: 'Angel Falls', coordinates: [5.9681, -62.5369], type: 'waterfall' },
  { name: 'Iguazu Falls', coordinates: [-25.6953, -54.4367], type: 'waterfall' },
  { name: 'Yosemite Falls', coordinates: [37.7563, -119.5969], type: 'waterfall' },
  { name: 'Gullfoss', coordinates: [64.3271, -20.1211], type: 'waterfall' },
  { name: 'Plitvice Falls', coordinates: [44.8806, 15.6139], type: 'waterfall' },
  
  // Volcanoes
  { name: 'Mount Vesuvius', coordinates: [40.8214, 14.4260], type: 'volcano' },
  { name: 'Krakatoa', coordinates: [-6.1021, 105.4230], type: 'volcano' },
  { name: 'Mount Etna', coordinates: [37.7510, 14.9934], type: 'volcano' },
  { name: 'Mount St. Helens', coordinates: [46.1912, -122.1944], type: 'volcano' },
  { name: 'Mauna Loa', coordinates: [19.4756, -155.6054], type: 'volcano' },
  { name: 'Popocatépetl', coordinates: [19.0232, -98.6278], type: 'volcano' },
  
  // Meteorite Sites
  { name: 'Meteor Crater', coordinates: [35.0275, -111.0225], type: 'meteorite' },
  { name: 'Tunguska', coordinates: [60.8864, 101.8940], type: 'meteorite' },
  { name: 'Chicxulub', coordinates: [21.4, -89.5167], type: 'meteorite' },
];

const getCityCoordinates = (city: string): [number, number] | null => {
  const cityMap: { [key: string]: [number, number] } = {
    // Major World Cities & Capitals - Europe
    London: [51.5074, -0.1278], Paris: [48.8566, 2.3522], Berlin: [52.52, 13.405],
    Rome: [41.9028, 12.4964], Madrid: [40.4168, -3.7038], Barcelona: [41.3874, 2.1686],
    Amsterdam: [52.3676, 4.9041], Brussels: [50.8503, 4.3517], Vienna: [48.2082, 16.3738],
    Prague: [50.0755, 14.4378], Budapest: [47.4979, 19.0402], Warsaw: [52.2297, 21.0122],
    Athens: [37.9838, 23.7275], Lisbon: [38.7223, -9.1393], Copenhagen: [55.6761, 12.5683],
    Stockholm: [59.3293, 18.0686], Oslo: [59.9139, 10.7522], Helsinki: [60.1699, 24.9384],
    Dublin: [53.3498, -6.2603], Edinburgh: [55.9533, -3.1883], Manchester: [53.4808, -2.2426],
    Munich: [48.1351, 11.582], Hamburg: [53.5511, 9.9937], Frankfurt: [50.1109, 8.6821],
    Milan: [45.4642, 9.19], Venice: [45.4408, 12.3155], Florence: [43.7696, 11.2558],
    Naples: [40.8518, 14.2681], Lyon: [45.764, 4.8357], Marseille: [43.2965, 5.3698],
    Zurich: [47.3769, 8.5417], Geneva: [46.2044, 6.1432],
    
    // Asia - East Asia
    Tokyo: [35.6762, 139.6503], Osaka: [34.6937, 135.5023], Kyoto: [35.0116, 135.7681],
    Yokohama: [35.4437, 139.638], Nagoya: [35.1815, 136.9066], Sapporo: [43.0642, 141.347],
    Beijing: [39.9042, 116.4074], Shanghai: [31.2304, 121.4737], Guangzhou: [23.1291, 113.2644],
    Shenzhen: [22.5431, 114.0579], Chengdu: [30.5728, 104.0668], Hangzhou: [30.2741, 120.1551],
    Wuhan: [30.5928, 114.3055], Xian: [34.3416, 108.9398], Chongqing: [29.4316, 106.9123],
    'Hong Kong': [22.3193, 114.1694], Macau: [22.1987, 113.5439], Taipei: [25.033, 121.5654],
    Seoul: [37.5665, 126.978], Busan: [35.1796, 129.0756], Incheon: [37.4563, 126.7052],
    
    // Asia - Southeast Asia
    Bangkok: [13.7563, 100.5018], Singapore: [1.3521, 103.8198], 'Kuala Lumpur': [3.139, 101.6869],
    Jakarta: [6.2088, 106.8456], Manila: [14.5995, 120.9842], Hanoi: [21.0285, 105.8542],
    'Ho Chi Minh': [10.8231, 106.6297], Yangon: [16.8661, 96.1951], Phnom: [11.5564, 104.9282],
    'Phnom Penh': [11.5564, 104.9282], Vientiane: [17.9757, 102.6331], Denpasar: [-8.6705, 115.2126],
    Surabaya: [-7.2575, 112.7521], Bandung: [-6.9175, 107.6191], Cebu: [10.3157, 123.8854],
    
    // India - Major Cities
    Delhi: [28.6139, 77.209], 'New Delhi': [28.6139, 77.209], Mumbai: [19.076, 72.8777],
    Bangalore: [12.9716, 77.5946], Bengaluru: [12.9716, 77.5946], Chennai: [13.0827, 80.2707],
    Hyderabad: [17.385, 78.4867], Kolkata: [22.5726, 88.3639], Pune: [18.5204, 73.8567],
    Ahmedabad: [23.0225, 72.5714], Jaipur: [26.9124, 75.7873], Surat: [21.1702, 72.8311],
    Lucknow: [26.8467, 80.9462], Kanpur: [26.4499, 80.3319], Nagpur: [21.1458, 79.0882],
    Indore: [22.7196, 75.8577], Bhopal: [23.2599, 77.4126], Visakhapatnam: [17.6868, 83.2185],
    Trivandrum: [8.5241, 76.9366], Thiruvananthapuram: [8.5241, 76.9366], Kochi: [9.9312, 76.2673],
    Coimbatore: [11.0168, 76.9558], Madurai: [9.9252, 78.1198], Mysore: [12.2958, 76.6394],
    Chandigarh: [30.7333, 76.7794], Guwahati: [26.1445, 91.7362], Patna: [25.5941, 85.1376],
    
    // Middle East
    Dubai: [25.2048, 55.2708], 'Abu Dhabi': [24.4539, 54.3773], Sharjah: [25.3463, 55.4209],
    Istanbul: [41.0082, 28.9784], Ankara: [39.9334, 32.8597], Izmir: [38.4237, 27.1428],
    Tehran: [35.6892, 51.389], Baghdad: [33.3152, 44.3661], Riyadh: [24.7136, 46.6753],
    Jeddah: [21.5433, 39.1728], Mecca: [21.3891, 39.8579], Damascus: [33.5138, 36.2765],
    Beirut: [33.8886, 35.4955], Amman: [31.9454, 35.9284], Jerusalem: [31.7683, 35.2137],
    'Tel Aviv': [32.0853, 34.7818], Doha: [25.2854, 51.531], Muscat: [23.588, 58.3829],
    Kuwait: [29.3759, 47.9774], Manama: [26.0667, 50.5577],
    
    // Africa
    Cairo: [30.0444, 31.2357], Alexandria: [31.2001, 29.9187], Giza: [30.0131, 31.2089],
    Lagos: [6.5244, 3.3792], Abuja: [9.0765, 7.3986], 'Cape Town': [-33.9249, 18.4241],
    Johannesburg: [-26.2041, 28.0473], Durban: [-29.8587, 31.0218], Nairobi: [-1.2864, 36.8172],
    Addis: [9.032, 38.7469], 'Addis Ababa': [9.032, 38.7469], Casablanca: [33.5731, -7.5898],
    Tunis: [36.8065, 10.1815], Algiers: [36.7538, 3.0588], Dakar: [14.7167, -17.4677],
    Accra: [5.6037, -0.187], Kinshasa: [-4.4419, 15.2663], Luanda: [-8.8383, 13.2344],
    Khartoum: [15.5007, 32.5599], Kampala: [0.3476, 32.5825], 'Dar es Salaam': [-6.7924, 39.2083],
    
    // Americas - USA
    'New York': [40.7128, -74.006], 'Los Angeles': [34.0522, -118.2437], Chicago: [41.8781, -87.6298],
    Houston: [29.7604, -95.3698], Phoenix: [33.4484, -112.074], Philadelphia: [39.9526, -75.1652],
    'San Antonio': [29.4241, -98.4936], 'San Diego': [32.7157, -117.1611], Dallas: [32.7767, -96.797],
    'San Francisco': [37.7749, -122.4194], Seattle: [47.6062, -122.3321], Boston: [42.3601, -71.0589],
    Miami: [25.7617, -80.1918], Atlanta: [33.749, -84.388], Washington: [38.9072, -77.0369],
    Denver: [39.7392, -104.9903], Portland: [45.5152, -122.6784], Detroit: [42.3314, -83.0458],
    Austin: [30.2672, -97.7431], Nashville: [36.1627, -86.7816], 'Las Vegas': [36.1699, -115.1398],
    
    // Canada
    Toronto: [43.6532, -79.3832], Montreal: [45.5017, -73.5673], Vancouver: [49.2827, -123.1207],
    Calgary: [51.0447, -114.0719], Ottawa: [45.4215, -75.6972], Edmonton: [53.5461, -113.4938],
    Quebec: [46.8139, -71.208], Winnipeg: [49.8951, -97.1384], Hamilton: [43.2557, -79.8711],
    
    // Latin America
    'Mexico City': [19.4326, -99.1332], Guadalajara: [20.6597, -103.3496], Monterrey: [25.6866, -100.3161],
    'São Paulo': [-23.5505, -46.6333], 'Rio de Janeiro': [-22.9068, -43.1729], Brasília: [-15.8267, -47.9218],
    Salvador: [-12.9714, -38.5014], Fortaleza: [-3.7172, -38.5433], Belo: [-19.9167, -43.9345],
    'Buenos Aires': [-34.6037, -58.3816], Cordoba: [-31.4201, -64.1888], Rosario: [-32.9468, -60.6393],
    Santiago: [-33.4489, -70.6693], Lima: [-12.0464, -77.0428], Bogotá: [4.711, -74.0721],
    Caracas: [10.4806, -66.9036], Quito: [-0.1807, -78.4678], Havana: [23.1136, -82.3666],
    'San Juan': [18.4655, -66.1057], Panama: [8.9824, -79.5199],
    
    // Oceania
    Sydney: [-33.8688, 151.2093], Melbourne: [-37.8136, 144.9631], Brisbane: [-27.4698, 153.0251],
    Perth: [-31.9505, 115.8605], Adelaide: [-34.9285, 138.6007], Auckland: [-36.8485, 174.7633],
    Wellington: [-41.2865, 174.7762], Canberra: [-35.2809, 149.13], Christchurch: [-43.5321, 172.6362],
    
    // Russia & Eastern Europe
    Moscow: [55.7558, 37.6173], 'Saint Petersburg': [59.9311, 30.3609], 'Nizhny Novgorod': [56.2965, 43.9361],
    Yekaterinburg: [56.8389, 60.6057], Kazan: [55.8304, 49.0661], Vladivostok: [43.1155, 131.8855],
    Kiev: [50.4501, 30.5234], Kyiv: [50.4501, 30.5234], Minsk: [53.9006, 27.559],
    Bucharest: [44.4268, 26.1025], Sofia: [42.6977, 23.3219], Belgrade: [44.7866, 20.4489],
    
    // China - Additional
    Tianjin: [39.3434, 117.3616], Nanjing: [32.0603, 118.7969], Suzhou: [31.2989, 120.5853],
    Dalian: [38.9140, 121.6147], Qingdao: [36.0671, 120.3826], Harbin: [45.8038, 126.5340],
    
    // Small towns & villages (representative samples)
    Santorini: [36.3932, 25.4615], Hallstatt: [47.5622, 13.6493], Giethoorn: [52.7387, 6.0765],
    Positano: [40.628, 14.485], Cinque: [44.1273, 9.7043], Rothenburg: [49.3779, 10.1786],
    Bruges: [51.2093, 3.2247], Colmar: [48.0778, 7.3584], Annecy: [45.8992, 6.1294],
    Bled: [46.3683, 14.1146], Grindelwald: [46.6244, 8.0419], Zermatt: [46.0207, 7.7491],
    Reine: [67.9325, 13.0876], Gjirokastër: [40.0758, 20.1389], Kotor: [42.4247, 18.7712],
  };

  return cityMap[city] || null;
};

const getLandmarkIcon = (type: Landmark['type']) => {
  const iconMap = {
    monument: '🏛️',
    mountain: '⛰️',
    waterfall: '💧',
    volcano: '🌋',
    meteorite: '☄️',
  } as const;
  return iconMap[type];
};

const getLandmarkColor = (type: Landmark['type']) => {
  const colorMap = {
    monument: '#e74c3c',
    mountain: '#8e44ad',
    waterfall: '#3498db',
    volcano: '#e67e22',
    meteorite: '#95a5a6',
  } as const;
  return colorMap[type];
};

const createLandmarkIcon = (type: Landmark['type']) => {
  return L.divIcon({
    className: 'custom-landmark-icon',
    html: `<div style="background-color: ${getLandmarkColor(type)}; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; border: 2px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">${getLandmarkIcon(type)}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
};

// Helper to create notification badge HTML for map markers
const createNotificationBadgesHTML = (notifications?: Array<{ symbolId: string; count?: number; timestamp: Date }>) => {
  if (!notifications || notifications.length === 0) return '';
  
  // Import symbol data inline for this helper
  const getSymbol = (id: string) => {
    const symbols: Record<string, { symbol: string; color: string }> = {
      'message': { symbol: '💌', color: 'hsl(320, 85%, 60%)' },
      'new_post': { symbol: '✨', color: 'hsl(262, 83%, 58%)' },
      'badge_earned': { symbol: '🏆', color: 'hsl(45, 93%, 47%)' },
      'friend_request': { symbol: '🤝', color: 'hsl(45, 93%, 47%)' },
      'like': { symbol: '❤️', color: 'hsl(0, 100%, 50%)' },
      'birthday': { symbol: '🎂', color: 'hsl(320, 85%, 60%)' },
    };
    return symbols[id] || { symbol: '⭐', color: 'hsl(45, 93%, 47%)' };
  };
  
  const priority: Record<string, number> = {
    'birthday': 10, 'badge_earned': 8, 'message': 6, 'friend_request': 5, 'new_post': 3, 'like': 2,
  };
  
  const sorted = [...notifications]
    .sort((a, b) => (priority[b.symbolId] || 0) - (priority[a.symbolId] || 0))
    .slice(0, 3);
  
  return sorted.map((notif, index) => {
    const { symbol, color } = getSymbol(notif.symbolId);
    const countBadge = notif.count && notif.count > 1 
      ? `<div style="position: absolute; top: -4px; right: -4px; background: linear-gradient(135deg, #ef4444, #dc2626); color: white; border-radius: 50%; min-width: 14px; height: 14px; font-size: 8px; font-weight: bold; display: flex; align-items: center; justify-content: center; padding: 1px 3px; border: 1px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">${notif.count > 9 ? '9+' : notif.count}</div>`
      : '';
    
    return `<div style="
      position: absolute;
      top: -6px;
      right: ${-6 + (index * 22)}px;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: linear-gradient(135deg, ${color}20, ${color}40);
      border: 1.5px solid ${color}80;
      backdrop-filter: blur(12px);
      display: flex;
      align-items: center;
      justify-center;
      font-size: 11px;
      box-shadow: 0 0 12px ${color}40, 0 2px 6px rgba(0,0,0,0.2);
      animation: notifPulse 2s ease-in-out infinite;
      animation-delay: ${index * 0.1}s;
      z-index: ${10 - index};
    ">${symbol}${countBadge}</div>`;
  }).join('');
};

const createUserIcon = (photoUrl?: string, status?: string, isCurrentUser: boolean = false, notifications?: Array<{ symbolId: string; count?: number; timestamp: Date }>) => {
  // Status indicator colors and styles with brighter, more visible colors
  const getStatusIndicator = () => {
    if (status === 'online') {
      return `<div style="position: absolute; top: -3px; right: -3px; width: 16px; height: 16px; background: #10b981; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 20px rgba(16, 185, 129, 1), 0 0 40px rgba(16, 185, 129, 0.6); animation: pulse 1.5s infinite;"></div>`;
    } else if (status === 'away') {
      return '<div style="position: absolute; top: -3px; right: -3px; width: 16px; height: 16px; background: #fbbf24; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 15px rgba(251, 191, 36, 0.8);"></div>';
    } else if (status === 'busy') {
      return '<div style="position: absolute; top: -3px; right: -3px; width: 16px; height: 16px; background: #ef4444; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 15px rgba(239, 68, 68, 0.8);"></div>';
    }
    return '<div style="position: absolute; top: -3px; right: -3px; width: 16px; height: 16px; background: #9ca3af; border: 3px solid white; border-radius: 50%;"></div>';
  };

  const statusIndicator = getStatusIndicator();
  const borderColor = status === 'online' ? '#10b981' : 
                      status === 'away' ? '#fbbf24' : 
                      status === 'busy' ? '#ef4444' : '#3b82f6';
  
  // Current user gets 41px size with extra glow
  const iconSize = isCurrentUser ? 41 : 45;
  const borderWidth = isCurrentUser ? '3px' : '4px';
  const extraGlow = isCurrentUser && status === 'online' ? ', 0 0 30px rgba(16, 185, 129, 0.4)' : '';

  if (photoUrl) {
    return L.divIcon({
      className: 'custom-user-icon',
      html: `<style>
        @keyframes pulse { 
          0%, 100% { 
            opacity: 1; 
            transform: scale(1);
          } 
          50% { 
            opacity: 0.5; 
            transform: scale(1.15);
          } 
        }
        @keyframes notifPulse {
          0%, 100% { 
            opacity: 1; 
            transform: scale(1);
          }
          50% { 
            opacity: 0.85; 
            transform: scale(1.08);
          }
        }
      </style>
        <div style="position: relative; width: ${iconSize}px; height: ${iconSize}px; border-radius: 50%; overflow: hidden; border: ${borderWidth} solid ${borderColor}; box-shadow: 0 4px 12px rgba(0,0,0,0.4)${extraGlow};">
        <img src="${photoUrl}" style="width: 100%; height: 100%; object-fit: cover;" />
        ${statusIndicator}
        ${createNotificationBadgesHTML(notifications)}
      </div>`,
      iconSize: [iconSize, iconSize],
      iconAnchor: [iconSize / 2, iconSize / 2],
    });
  }

  return L.divIcon({
    className: 'custom-user-icon',
    html: `<style>
      @keyframes pulse { 
        0%, 100% { 
          opacity: 1; 
          transform: scale(1);
        } 
        50% { 
          opacity: 0.5; 
          transform: scale(1.15);
        } 
      }
      @keyframes notifPulse {
        0%, 100% { 
          opacity: 1; 
          transform: scale(1);
        }
        50% { 
          opacity: 0.85; 
          transform: scale(1.08);
        }
      }
    </style>
      <div style="position: relative; width: ${iconSize}px; height: ${iconSize}px; border-radius: 50%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border: ${borderWidth} solid ${borderColor}; box-shadow: 0 4px 12px rgba(0,0,0,0.4)${extraGlow}; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 20px;">
      👤
      ${statusIndicator}
      ${createNotificationBadgesHTML(notifications)}
    </div>`,
    iconSize: [iconSize, iconSize],
    iconAnchor: [iconSize / 2, iconSize / 2],
  });
};

const escapeHtml = (unsafe: string) =>
  unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

export const OpenStreetMapView: React.FC<OpenStreetMapViewProps> = ({
  users,
  onUserClick,
  onAddFriend,
  onSendMessage,
  isUserOnline,
  currentUserId,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const usersLayerRef = useRef<L.LayerGroup | null>(null);
  const previousUsersRef = useRef<Set<string>>(new Set());
  
  // Legend state
  const [legendPosition, setLegendPosition] = React.useState(() => {
    const saved = localStorage.getItem('huddle-legend-position');
    return saved ? JSON.parse(saved) : { x: window.innerWidth - 180, y: window.innerHeight - 200 };
  });
  const [isLegendDragging, setIsLegendDragging] = React.useState(false);
  const [legendDragOffset, setLegendDragOffset] = React.useState({ x: 0, y: 0 });
  const [isLegendMinimized, setIsLegendMinimized] = React.useState(false);
  const legendRef = useRef<HTMLDivElement>(null);

  // Save legend position
  React.useEffect(() => {
    localStorage.setItem('huddle-legend-position', JSON.stringify(legendPosition));
  }, [legendPosition]);

  // Handle window resize for legend
  React.useEffect(() => {
    const handleResize = () => {
      setLegendPosition(prev => ({
        x: Math.min(prev.x, window.innerWidth - 180),
        y: Math.min(prev.y, window.innerHeight - 100)
      }));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Legend drag handlers
  const handleLegendMouseDown = (e: React.MouseEvent) => {
    if (legendRef.current && !isLegendMinimized) {
      setIsLegendDragging(true);
      const rect = legendRef.current.getBoundingClientRect();
      setLegendDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isLegendDragging) {
        const newX = Math.max(0, Math.min(e.clientX - legendDragOffset.x, window.innerWidth - 180));
        const newY = Math.max(0, Math.min(e.clientY - legendDragOffset.y, window.innerHeight - 100));
        setLegendPosition({ x: newX, y: newY });
      }
    };

    const handleEnd = () => {
      setIsLegendDragging(false);
    };

    if (isLegendDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleEnd);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleEnd);
      };
    }
  }, [isLegendDragging, legendDragOffset]);

  // Initialize map once
  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) return;

    const initialCenter: [number, number] = [20, 0];

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: 2,
      worldCopyJump: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 18,
    }).addTo(map);

    // Landmarks
    const landmarksLayer = L.layerGroup();
    landmarks.forEach((landmark) => {
      const marker = L.marker(landmark.coordinates, {
        icon: createLandmarkIcon(landmark.type),
      });

      const popupHtml = `
        <div style="text-align: center; padding: 4px 8px;">
          <div style="font-size: 20px; margin-bottom: 4px;">${getLandmarkIcon(landmark.type)}</div>
          <div style="font-weight: 600;">${escapeHtml(landmark.name)}</div>
          <div style="font-size: 11px; color: #6b7280; text-transform: capitalize;">${landmark.type}</div>
        </div>
      `;

      marker.bindPopup(popupHtml);
      marker.addTo(landmarksLayer);
    });
    landmarksLayer.addTo(map);

    usersLayerRef.current = L.layerGroup().addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      usersLayerRef.current = null;
    };
  }, []);

  // Update user markers when users change with smooth transitions
  useEffect(() => {
    if (!mapRef.current || !usersLayerRef.current) return;

    const currentUserIds = new Set(users.map(u => u.user_id));
    const addedUsers = users.filter(u => !previousUsersRef.current.has(u.user_id));
    const removedUsers = Array.from(previousUsersRef.current).filter(id => !currentUserIds.has(id));

    // Handle removed users with fade out animation
    if (removedUsers.length > 0) {
      usersLayerRef.current.eachLayer((layer: any) => {
        if (layer instanceof L.Marker) {
          const icon = layer.getIcon();
          if (icon && (icon as any).options.className === 'custom-user-icon') {
            const element = layer.getElement();
            if (element && removedUsers.some(id => element.dataset.userId === id)) {
              element.style.transition = 'opacity 0.4s ease-out, transform 0.4s ease-out';
              element.style.opacity = '0';
              element.style.transform = 'scale(0.5)';
              setTimeout(() => {
                usersLayerRef.current?.removeLayer(layer);
              }, 400);
            }
          }
        }
      });
    }

    // Clear and re-add all markers
    setTimeout(() => {
      if (!usersLayerRef.current) return;
      usersLayerRef.current.clearLayers();

      users.forEach((user, index) => {
        const coords = user.city ? getCityCoordinates(user.city) : null;
        if (!coords) return;

        const isOnline = isUserOnline ? isUserOnline(user.user_id) : false;
        const isCurrentUser = currentUserId === user.user_id;
        const statusIndicator = user.status === 'online' || isOnline ? 'online' : 
                               user.status === 'away' ? 'away' :
                               user.status === 'busy' ? 'busy' : 'offline';

        const isNewUser = addedUsers.some(u => u.user_id === user.user_id);

        const marker = L.marker(coords, {
          icon: createUserIcon(user.profile_photo_url, statusIndicator, isCurrentUser, user.notifications),
        });

        marker.on('click', () => onUserClick(user.user_id));

        const hobbiesText =
          user.hobbies && user.hobbies.length
            ? user.hobbies
                .slice(0, 3)
                .map((h) => escapeHtml(h))
                .join(', ')
            : '';

        const statusEmoji = statusIndicator === 'online' ? '🟢' : 
                            statusIndicator === 'away' ? '🟡' : 
                            statusIndicator === 'busy' ? '🔴' : '⚫';
        const statusText = statusIndicator === 'online' ? 'Online' : 
                           statusIndicator === 'away' ? 'Away' : 
                           statusIndicator === 'busy' ? 'Busy' : 'Offline';

        const popupHtml = `
          <div style="min-width: 220px; padding: 8px;">
            <div style="font-weight: 600; margin-bottom: 2px; font-size: 14px;">${escapeHtml(
              user.display_name,
            )}</div>
            <div style="font-size: 12px; color: #6b7280; margin-bottom: 6px;">@${escapeHtml(
              user.username,
            )}</div>
            <div style="display: flex; align-items: center; gap: 4px; font-size: 12px; margin-bottom: 6px;">
              <span>${statusEmoji}</span>
              <span style="font-weight: 500;">${statusText}</span>
            </div>
            ${
              user.city
                ? `<div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">📍 ${escapeHtml(
                    user.city,
                  )}</div>`
                : ''
            }
            ${
              hobbiesText
                ? `<div style="font-size: 12px; margin-top: 6px;"><strong>Interests:</strong> ${hobbiesText}</div>`
                : ''
            }
          </div>
        `;

        marker.bindPopup(popupHtml);
        marker.addTo(usersLayerRef.current!);

        // Add smooth entrance animation for new users
        if (isNewUser) {
          const element = marker.getElement();
          if (element) {
            element.dataset.userId = user.user_id;
            element.style.opacity = '0';
            element.style.transform = 'scale(0.5)';
            element.style.transition = 'opacity 0.5s ease-out, transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
            
            // Stagger animation for multiple new users
            setTimeout(() => {
              if (element) {
                element.style.opacity = '1';
                element.style.transform = 'scale(1)';
              }
            }, 50 + (index * 30));
          }
        } else {
          const element = marker.getElement();
          if (element) {
            element.dataset.userId = user.user_id;
          }
        }
      });

      // Update the previous users set
      previousUsersRef.current = currentUserIds;
    }, removedUsers.length > 0 ? 400 : 0);
  }, [users, onUserClick, isUserOnline, currentUserId]);

  return (
    <div className="w-full h-full rounded-lg overflow-hidden relative">
      <div ref={mapContainerRef} className="w-full h-full" />
      
      {/* Draggable Legend */}
      <div
        ref={legendRef}
        className="fixed z-[900] select-none"
        style={{
          left: `${legendPosition.x}px`,
          top: `${legendPosition.y}px`,
          cursor: isLegendDragging ? 'grabbing' : 'grab',
        }}
        onMouseDown={handleLegendMouseDown}
      >
        <div
          className="bg-black/70 backdrop-blur-xl border border-white/30 rounded-xl shadow-2xl overflow-hidden"
          style={{
            width: isLegendMinimized ? '50px' : '200px',
            maxHeight: '400px',
            transition: 'width 0.3s ease',
          }}
        >
          {/* Legend Header */}
          <div className="flex items-center justify-between p-2 border-b border-white/10">
            {!isLegendMinimized && (
              <span className="text-white text-xs font-semibold">Legend</span>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsLegendMinimized(!isLegendMinimized);
              }}
              className="text-white/60 hover:text-white transition-colors p-1 rounded hover:bg-white/10"
              title={isLegendMinimized ? 'Expand' : 'Minimize'}
            >
              {isLegendMinimized ? (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              ) : (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              )}
            </button>
          </div>

          {/* Legend Content */}
          {!isLegendMinimized && (
            <ScrollArea className="h-[350px]">
              <div className="p-3 space-y-3 text-xs">
                {/* User Markers */}
                <div>
                  <div className="text-white/90 font-semibold mb-2">Users</div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500 border border-white/50 shadow-lg shadow-green-500/50"></div>
                      <span className="text-white/80">Online</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-yellow-500 border border-white/50 shadow-lg shadow-yellow-500/50"></div>
                      <span className="text-white/80">Away</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500 border border-white/50 shadow-lg shadow-red-500/50"></div>
                      <span className="text-white/80">Busy</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-gray-500 border border-white/50"></div>
                      <span className="text-white/80">Offline</span>
                    </div>
                  </div>
                </div>

                {/* Heritage Landmarks */}
                <div className="pt-2 border-t border-white/20">
                  <div className="text-white/90 font-semibold mb-2">🏛️ Heritage</div>
                  <div className="space-y-1.5 pl-2">
                    <div className="flex items-center gap-2">
                      <span className="text-amber-400">🕌</span>
                      <span className="text-white/80">Temples</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-amber-400">🏰</span>
                      <span className="text-white/80">Forts</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-amber-400">🗿</span>
                      <span className="text-white/80">Monuments</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-amber-400">🏺</span>
                      <span className="text-white/80">Museums</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-amber-400">⛩️</span>
                      <span className="text-white/80">Shrines</span>
                    </div>
                  </div>
                </div>

                {/* Natural Landmarks */}
                <div className="pt-2 border-t border-white/20">
                  <div className="text-white/90 font-semibold mb-2">⛰️ Natural</div>
                  <div className="space-y-1.5 pl-2">
                    <div className="flex items-center gap-2">
                      <span className="text-green-400">🏔️</span>
                      <span className="text-white/80">Mountains</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-green-400">🏖️</span>
                      <span className="text-white/80">Beaches</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-green-400">🌊</span>
                      <span className="text-white/80">Waterfalls</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-green-400">🌲</span>
                      <span className="text-white/80">Forests</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-green-400">🏞️</span>
                      <span className="text-white/80">Parks</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-green-400">🌋</span>
                      <span className="text-white/80">Volcanoes</span>
                    </div>
                  </div>
                </div>

                {/* Modern Landmarks */}
                <div className="pt-2 border-t border-white/20">
                  <div className="text-white/90 font-semibold mb-2">🏙️ Modern</div>
                  <div className="space-y-1.5 pl-2">
                    <div className="flex items-center gap-2">
                      <span className="text-blue-400">🏢</span>
                      <span className="text-white/80">Skyscrapers</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-blue-400">🌉</span>
                      <span className="text-white/80">Bridges</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-blue-400">🎡</span>
                      <span className="text-white/80">Attractions</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-blue-400">🏟️</span>
                      <span className="text-white/80">Stadiums</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-blue-400">🏛️</span>
                      <span className="text-white/80">Architecture</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-blue-400">🎭</span>
                      <span className="text-white/80">Theaters</span>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}
        </div>
      </div>
    </div>
  );
};

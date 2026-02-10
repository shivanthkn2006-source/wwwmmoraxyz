import React, { useState, useEffect, useRef, useMemo, forwardRef, useImperativeHandle } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { geoMercator, geoPath } from 'd3-geo';
import { zoom as d3Zoom, zoomIdentity, ZoomBehavior } from 'd3-zoom';
import { select } from 'd3-selection';
import { cityLatLon, normalizeCityRaw, type CanonicalCity } from '@/utils/cityHelpers';
import { useOnlinePresence } from '@/hooks/useOnlinePresence';
import { Circle, Clock, Navigation, Briefcase, BookOpen, Utensils, Users, Sprout, Dumbbell, Gamepad2, Library, Brain, Film, Play, Trophy, Plane, Tv, Palmtree, HeartHandshake } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface UserPin {
  userId: string;
  displayName: string;
  username: string;
  profilePhotoUrl?: string;
  city: string;
  hobbies?: string[];
  status?: string;
  isOnline?: boolean;
}

export interface IndiaMapRef {
  panToUser: (userId: string, city: string) => void;
}

interface IndiaMapProps {
  showOnlineOnly?: boolean;
  showFriendsOnly?: boolean;
  selectedCity?: string;
  selectedInterests?: string[];
  selectedStatus?: string;
  nearbyRadius?: number; // in km - approximate city proximity
}

// cityLatLon imported from cityHelpers

// Simplified but accurate India outline GeoJSON
const indiaOutline = {
  type: "Feature",
  geometry: {
    type: "Polygon",
    coordinates: [[
      [77.8375, 35.4940], [78.9122, 34.3219], [78.8112, 33.5061], [79.2089, 32.9943],
      [79.1761, 32.4837], [78.4586, 32.6181], [78.7386, 31.5159], [79.7213, 30.8827],
      [81.1111, 30.1833], [80.4767, 29.7298], [80.0884, 28.7945], [81.0572, 28.4167],
      [82.0000, 27.9259], [83.3042, 27.3640], [84.6750, 27.2348], [85.2514, 26.7262],
      [86.0244, 26.6309], [87.2275, 26.3978], [88.0604, 26.4146], [88.1748, 26.8101],
      [88.0430, 27.4456], [88.1204, 27.8765], [88.7304, 28.0869], [88.8142, 27.2993],
      [88.8342, 27.0986], [89.7453, 26.7194], [90.3730, 26.8757], [91.2172, 26.8086],
      [92.0330, 26.8383], [92.1037, 27.4526], [91.6966, 27.7716], [92.5031, 27.8968],
      [93.4132, 28.6406], [94.5659, 29.2774], [95.4048, 29.0316], [96.2481, 29.4546],
      [96.5866, 28.8303], [96.2486, 28.4108], [97.3272, 28.2615], [97.4025, 27.8827],
      [97.0519, 27.6990], [97.1339, 27.0837], [96.4191, 27.2645], [95.1245, 26.5735],
      [95.1551, 26.0016], [94.6032, 25.1628], [94.5526, 24.6752], [94.1065, 23.8507],
      [93.3251, 24.0785], [93.2864, 23.0431], [93.0602, 23.1831], [93.1661, 22.2781],
      [92.6727, 22.0412], [92.1460, 23.6275], [91.8699, 23.6244], [91.7064, 22.9853],
      [91.1591, 23.5033], [91.4685, 24.0726], [91.9151, 24.1305], [92.3762, 24.9766],
      [91.7995, 25.1477], [90.8722, 25.1327], [89.8319, 25.9652], [89.8559, 26.4339],
      [89.0776, 26.4332], [88.5295, 26.4467], [88.6999, 25.5541], [88.0844, 25.2388],
      [88.3063, 24.8661], [88.9310, 25.2380], [88.2095, 24.4610], [88.5631, 23.6315],
      [88.6999, 22.8931], [89.0319, 22.0557], [88.8887, 21.6906], [88.2085, 21.7031],
      [86.9757, 21.4956], [87.0330, 20.7433], [86.4995, 20.1514], [85.0602, 19.4786],
      [83.9410, 18.3024], [83.1892, 17.6712], [82.1929, 17.0166], [82.1910, 16.5566],
      [81.6927, 16.3102], [80.7919, 15.9519], [80.3242, 15.8992], [80.0250, 15.1366],
      [80.2332, 13.8358], [80.2863, 13.0063], [79.8627, 12.0562], [79.8578, 10.3573],
      [79.3402, 10.3086], [78.8851, 9.5463], [79.1897, 9.2167], [78.2774, 8.9330],
      [77.9411, 8.2529], [77.5397, 7.9655], [76.5922, 8.8999], [76.1300, 10.2999],
      [75.7464, 11.3085], [75.3958, 11.7812], [74.8649, 12.7418], [74.6163, 13.9925],
      [74.4431, 14.6172], [73.5343, 15.9904], [73.1194, 17.9286], [72.8209, 19.2089],
      [72.8244, 20.4195], [72.6305, 21.3562], [72.9675, 22.1324], [73.5090, 24.8668],
      [73.4452, 25.0044], [72.8237, 26.8369], [70.8297, 27.7067], [69.1641, 26.9467],
      [68.8428, 24.2592], [68.1766, 23.6919], [68.8429, 22.9136], [70.0507, 22.5626],
      [70.1681, 21.8947], [69.6451, 22.4509], [69.3496, 22.8432], [68.1766, 23.6919],
      [68.8429, 24.2661], [71.0432, 24.3065], [70.8446, 25.2151], [70.2829, 25.7226],
      [70.1688, 26.4919], [69.5143, 26.9407], [70.6163, 27.9891], [71.7778, 27.9131],
      [72.8237, 28.6196], [73.4509, 29.9761], [74.4213, 30.9798], [74.4058, 31.6926],
      [75.2576, 32.2711], [74.4516, 32.7649], [74.1043, 33.4414], [73.7498, 34.3179],
      [74.2402, 34.7489], [75.7571, 34.5049], [76.8717, 34.6536], [77.8375, 35.4940]
    ]]
  }
};

const IndiaMap = forwardRef<IndiaMapRef, IndiaMapProps>(({ 
  showOnlineOnly = false, 
  showFriendsOnly = false,
  selectedCity = '',
  selectedInterests = [],
  selectedStatus = '',
  nearbyRadius = 0
}, ref) => {
  const [users, setUsers] = useState<UserPin[]>([]);
  const [allUsers, setAllUsers] = useState<UserPin[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserPin | null>(null);
  const [isFriend, setIsFriend] = useState(false);
  const [commonInterests, setCommonInterests] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedUserId, setHighlightedUserId] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const zoomBehaviorRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const navigate = useNavigate();
  const { isUserOnline } = useOnlinePresence();

  // Create projection and path generator using fitSize
  const { projection, pathGenerator } = useMemo(() => {
    const proj = geoMercator();
    proj.fitSize([dimensions.width, dimensions.height], indiaOutline as any);
    
    const path = geoPath().projection(proj);
    return { projection: proj, pathGenerator: path };
  }, [dimensions]);

  // Convert city lat/lon to SVG coordinates
  const cityCoordinates = useMemo(() => {
    const coords: Record<string, [number, number]> = {};
    Object.entries(cityLatLon).forEach(([city, { lat, lon }]) => {
      const projected = projection([lon, lat]);
      if (projected) {
        coords[city] = projected;
      }
    });
    return coords;
  }, [projection]);

  // Responsive dimensions
  useEffect(() => {
    const updateDimensions = () => {
      const container = svgRef.current?.parentElement;
      if (container) {
        setDimensions({
          width: container.clientWidth,
          height: container.clientHeight,
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Initialize zoom behavior
  useEffect(() => {
    if (!svgRef.current || !gRef.current) return;

    const svg = select(svgRef.current);
    const g = select(gRef.current);

    // Calculate bounds with margin for panning to edges
    const margin = 50;
    const minX = -margin;
    const minY = -margin;
    const maxX = dimensions.width + margin;
    const maxY = dimensions.height + margin;

    const zoomBehavior = d3Zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.8, 10])
      .translateExtent([[minX, minY], [maxX, maxY]])
      .extent([[0, 0], [dimensions.width, dimensions.height]])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoomBehavior);
    zoomBehaviorRef.current = zoomBehavior;

    return () => {
      svg.on('.zoom', null);
    };
  }, [dimensions]);

  useEffect(() => {
    fetchUsers();
    const channel = supabase
      .channel('map-users')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, fetchUsers)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Apply filters when props change
  useEffect(() => {
    filterUsers();
  }, [allUsers, showOnlineOnly, showFriendsOnly, selectedCity, selectedInterests, selectedStatus, nearbyRadius, isUserOnline]);

  const fetchUsers = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('profiles')
      .select('user_id, display_name, username, profile_photo_url, city, hobbies, status')
      .eq('location_enabled', true)
      .not('city', 'is', null)
      .neq('user_id', user.id);

    if (data) {
      const mappedUsers = data.map(u => {
        // Normalize city to canonical name
        const normalizedCity = normalizeCityRaw(u.city) || u.city;
        return {
          userId: u.user_id,
          displayName: u.display_name,
          username: u.username,
          profilePhotoUrl: u.profile_photo_url,
          city: normalizedCity,
          hobbies: u.hobbies || [],
          status: u.status,
          isOnline: isUserOnline(u.user_id),
        };
      });
      setAllUsers(mappedUsers);
    }
  };

  const filterUsers = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let filtered = [...allUsers];

    // Apply online filter
    if (showOnlineOnly) {
      filtered = filtered.filter(u => isUserOnline(u.userId));
    }

    // Apply friends filter
    if (showFriendsOnly) {
      const { data: friendships } = await supabase
        .from('friendships')
        .select('user1_id, user2_id')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

      const friendIds = new Set(
        friendships?.map(f => f.user1_id === user.id ? f.user2_id : f.user1_id) || []
      );

      filtered = filtered.filter(u => friendIds.has(u.userId));
    }

    // Apply city filter
    if (selectedCity) {
      filtered = filtered.filter(u => u.city === selectedCity);
    }

    // Apply nearby radius filter (approximate distance based on lat/lon)
    if (nearbyRadius > 0 && selectedCity) {
      const baseCityCoords = cityLatLon[selectedCity as CanonicalCity];
      if (baseCityCoords) {
        filtered = filtered.filter(u => {
          const userCityCoords = cityLatLon[u.city as CanonicalCity];
          if (!userCityCoords) return false;
          
          // Haversine formula for approximate distance
          const toRad = (val: number) => (val * Math.PI) / 180;
          const R = 6371; // Earth's radius in km
          const dLat = toRad(userCityCoords.lat - baseCityCoords.lat);
          const dLon = toRad(userCityCoords.lon - baseCityCoords.lon);
          const a = 
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(baseCityCoords.lat)) * Math.cos(toRad(userCityCoords.lat)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          const distance = R * c;
          
          return distance <= nearbyRadius;
        });
      }
    }

    // Apply status filter
    if (selectedStatus) {
      filtered = filtered.filter(u => u.status === selectedStatus);
    }

    // Apply interests filter
    if (selectedInterests.length > 0) {
      filtered = filtered.filter(u => 
        u.hobbies && selectedInterests.some(interest => u.hobbies?.includes(interest))
      );
    }

    setUsers(filtered);
  };

  const checkFriendship = async (userId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data } = await supabase
      .from('friendships')
      .select('*')
      .or(`and(user1_id.eq.${user.id},user2_id.eq.${userId}),and(user1_id.eq.${userId},user2_id.eq.${user.id})`)
      .single();

    return !!data;
  };

  const getCommonInterests = async (userId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: myProfile } = await supabase
      .from('profiles')
      .select('hobbies')
      .eq('user_id', user.id)
      .single();

    const { data: theirProfile } = await supabase
      .from('profiles')
      .select('hobbies')
      .eq('user_id', userId)
      .single();

    if (!myProfile?.hobbies || !theirProfile?.hobbies) return [];

    return myProfile.hobbies.filter((h: string) => theirProfile.hobbies.includes(h));
  };

  const handlePinClick = async (user: UserPin) => {
    setSelectedUser(user);
    const friend = await checkFriendship(user.userId);
    setIsFriend(friend);
    if (friend) {
      const common = await getCommonInterests(user.userId);
      setCommonInterests(common);
    }
  };

  const handleSendFriendRequest = async () => {
    if (!selectedUser) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('friend_requests').insert({
      sender_id: user.id,
      receiver_id: selectedUser.userId,
      status: 'pending',
    });

    if (error) {
      toast.error('Failed to send friend request');
    } else {
      toast.success('Friend request sent!');
      setSelectedUser(null);
    }
  };

  const handleSearch = () => {
    const user = users.find(u => 
      u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.username.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (user && cityCoordinates[user.city] && svgRef.current && zoomBehaviorRef.current) {
      panToUserByCity(user.userId, user.city);
    }
  };

  const panToUserByCity = (userId: string, city: string) => {
    if (!cityCoordinates[city] || !svgRef.current || !zoomBehaviorRef.current) {
      toast.error('Unable to locate user on map');
      return;
    }

    const user = users.find(u => u.userId === userId);
    const [x, y] = cityCoordinates[city];
    const svg = select(svgRef.current);
    
    // Pan and zoom to the user's city
    const transform = zoomIdentity
      .translate(dimensions.width / 2, dimensions.height / 2)
      .scale(3)
      .translate(-x, -y);
    
    svg.transition()
      .duration(750)
      .call(zoomBehaviorRef.current.transform, transform);

    // Highlight and open user popup
    setHighlightedUserId(userId);
    setTimeout(() => setHighlightedUserId(null), 3000);
    
    if (user) {
      handlePinClick(user);
    }
  };

  // Expose panToUser method via ref
  useImperativeHandle(ref, () => ({
    panToUser: panToUserByCity
  }));

  const getUsersByCity = (city: string) => {
    return users.filter(u => u.city === city);
  };

  const getPinPosition = (user: UserPin, index: number, total: number): [number, number] => {
    const cityCoord = cityCoordinates[user.city];
    if (!cityCoord) return [0, 0];

    if (total === 1) {
      // Single pin: place directly at city center
      return cityCoord;
    }

    // Base cluster radius - deterministic and small
    const baseRadius = Math.min(40, dimensions.width * 0.03);
    
    // Deterministic angle distribution
    const angle = (index / total) * 2 * Math.PI;
    const x = cityCoord[0] + Math.cos(angle) * baseRadius;
    const y = cityCoord[1] + Math.sin(angle) * baseRadius;
    
    return [x, y];
  };

  // Responsive pin size (smaller than before)
  const pinSize = Math.max(14, Math.min(28, dimensions.width * 0.02));

  return (
    <div className="relative w-full h-full bg-black overflow-hidden" style={{ height: 'calc(100vh - 64px)' }}>
      {/* Map Container */}
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full cursor-grab active:cursor-grabbing"
        style={{ touchAction: 'none' }}
      >
        <g ref={gRef}>
          {/* India Border */}
          <path
            d={pathGenerator(indiaOutline as any) || ''}
            fill="none"
            stroke="rgba(150,150,150,0.12)"
            strokeWidth="2"
          />

          {/* City Dots and Labels */}
          {Object.entries(cityCoordinates).map(([city, [x, y]]) => (
            <g key={city}>
              <circle cx={x} cy={y} r="4" fill="#ffffff" />
              <text
                x={x}
                y={y - 10}
                fill="#ffffff"
                fontSize="11"
                fontWeight="300"
                textAnchor="middle"
              >
                {city}
              </text>
            </g>
          ))}

          {/* User Pins */}
          {users.map((user) => {
            const cityUsers = getUsersByCity(user.city);
            const userIndex = cityUsers.findIndex(u => u.userId === user.userId);
            const [x, y] = getPinPosition(user, userIndex, cityUsers.length);
            const isHighlighted = highlightedUserId === user.userId;
            
            // Status indicator config
            const getStatusConfig = () => {
              if (!user.status || user.status === 'none' || user.status === 'offline') return null;
              
              switch (user.status) {
                case 'online':
                  return { icon: Circle, color: '#22c55e', bgColor: '#f0fdf4' };
                case 'away':
                  return { icon: Clock, color: '#eab308', bgColor: '#fefce8' };
                case 'transit':
                  return { icon: Navigation, color: '#f97316', bgColor: '#fff7ed' };
                case 'work':
                  return { icon: Briefcase, color: '#ef4444', bgColor: '#fef2f2' };
                case 'studying':
                  return { icon: BookOpen, color: '#3b82f6', bgColor: '#eff6ff' };
                case 'cooking':
                  return { icon: Utensils, color: '#f97316', bgColor: '#fff7ed' };
                case 'dining':
                  return { icon: Utensils, color: '#f59e0b', bgColor: '#fef3c7' };
                case 'family_time':
                  return { icon: Users, color: '#a855f7', bgColor: '#faf5ff' };
                case 'farming':
                  return { icon: Sprout, color: '#84cc16', bgColor: '#f7fee7' };
                case 'fitness':
                  return { icon: Dumbbell, color: '#ef4444', bgColor: '#fef2f2' };
                case 'gaming':
                  return { icon: Gamepad2, color: '#8b5cf6', bgColor: '#faf5ff' };
                case 'library':
                  return { icon: Library, color: '#0ea5e9', bgColor: '#f0f9ff' };
                case 'meditation':
                  return { icon: Brain, color: '#a855f7', bgColor: '#faf5ff' };
                case 'movie':
                  return { icon: Film, color: '#ec4899', bgColor: '#fdf2f8' };
                case 'party':
                  return { icon: HeartHandshake, color: '#f472b6', bgColor: '#fdf2f8' };
                case 'play':
                  return { icon: Play, color: '#06b6d4', bgColor: '#ecfeff' };
                case 'sports':
                  return { icon: Trophy, color: '#f97316', bgColor: '#fff7ed' };
                case 'traveling':
                  return { icon: Plane, color: '#0ea5e9', bgColor: '#f0f9ff' };
                case 'tv':
                  return { icon: Tv, color: '#6366f1', bgColor: '#eef2ff' };
                case 'vacation':
                  return { icon: Palmtree, color: '#10b981', bgColor: '#f0fdf4' };
                case 'yoga':
                  return { icon: HeartHandshake, color: '#a855f7', bgColor: '#faf5ff' };
                default:
                  return null;
              }
            };
            
            const statusConfig = getStatusConfig();
            
            return (
              <g
                key={user.userId}
                onClick={() => handlePinClick(user)}
                style={{ 
                  cursor: 'pointer',
                  animation: 'fadeScaleIn 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards'
                }}
                className={isHighlighted ? 'animate-pulse' : ''}
              >
                <defs>
                  <clipPath id={`clip-${user.userId}`}>
                    <circle cx={x} cy={y} r={pinSize / 2} />
                  </clipPath>
                </defs>
                
                {/* Pin background circle */}
                <circle
                  cx={x}
                  cy={y}
                  r={pinSize / 2}
                  fill="#1a1a1a"
                  stroke="#ffffff"
                  strokeWidth="2"
                  className={selectedUser?.userId === user.userId ? 'opacity-100' : 'opacity-90'}
                />
                
                {/* Profile picture */}
                <image
                  x={x - pinSize / 2}
                  y={y - pinSize / 2}
                  width={pinSize}
                  height={pinSize}
                  href={user.profilePhotoUrl || '/placeholder.svg'}
                  clipPath={`url(#clip-${user.userId})`}
                  preserveAspectRatio="xMidYMid slice"
                />
                
                {/* Status indicator with pulse */}
                {statusConfig && (
                  <g>
                    <circle
                      cx={x + (pinSize / 2) - 3}
                      cy={y + (pinSize / 2) - 3}
                      r="5"
                      fill={statusConfig.color}
                    />
                    {user.status === 'online' && (
                      <>
                        <circle
                          cx={x + (pinSize / 2) - 3}
                          cy={y + (pinSize / 2) - 3}
                          r="5"
                          fill={statusConfig.color}
                          opacity="0.6"
                        >
                          <animate
                            attributeName="r"
                            values="5;9;5"
                            dur="2s"
                            repeatCount="indefinite"
                          />
                          <animate
                            attributeName="opacity"
                            values="0.6;0;0.6"
                            dur="2s"
                            repeatCount="indefinite"
                          />
                        </circle>
                      </>
                    )}
                  </g>
                )}
                
                {/* Highlight glow */}
                {isHighlighted && (
                  <circle
                    cx={x}
                    cy={y}
                    r={pinSize / 2 + 4}
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="2"
                    opacity="0.6"
                  />
                )}
                
                <style>{`
                  @keyframes fadeScaleIn {
                    from {
                      opacity: 0;
                      transform: scale(0);
                    }
                    to {
                      opacity: 1;
                      transform: scale(1);
                    }
                  }
                `}</style>
              </g>
            );
          })}
        </g>
      </svg>

      {/* User Popup */}
      {selectedUser && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20 bg-background/95 backdrop-blur-md border border-border rounded-lg p-6 w-80 shadow-xl">
          <div className="flex items-center gap-4 mb-4">
            <Avatar className="w-16 h-16">
              <img src={selectedUser.profilePhotoUrl || '/placeholder.svg'} alt={selectedUser.displayName} />
            </Avatar>
            <div>
              <h3 className="font-semibold text-lg">{selectedUser.displayName}</h3>
              <p className="text-sm text-muted-foreground">@{selectedUser.username}</p>
            </div>
          </div>

          {isFriend ? (
            <div>
              <p className="text-sm font-medium mb-2">✨ {commonInterests.length} Common Interests</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {commonInterests.map((interest) => (
                  <span key={interest} className="px-3 py-1 bg-primary/20 text-primary rounded-full text-xs">
                    {interest}
                  </span>
                ))}
              </div>
              <Button onClick={() => {
                // Navigate to chat with user search param
                navigate(`/chat?user=${selectedUser.userId}`);
                setSelectedUser(null);
              }} className="w-full">
                Send Message
              </Button>
            </div>
          ) : (
            <div>
              <p className="text-sm text-muted-foreground mb-4">You're not friends with this user</p>
              <Button onClick={handleSendFriendRequest} className="w-full">
                Send Follow Request
              </Button>
            </div>
          )}

          <Button
            variant="ghost"
            onClick={() => setSelectedUser(null)}
            className="w-full mt-2"
          >
            Close
          </Button>
        </div>
      )}
    </div>
  );
});

IndiaMap.displayName = 'IndiaMap';

export default IndiaMap;

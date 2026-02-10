import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';

interface MapboxGlobeProps {
  searchLocation?: string;
  onLocationFound?: (location: { lat: number; lng: number; name: string }) => void;
}

const MapboxGlobe: React.FC<MapboxGlobeProps> = ({ searchLocation, onLocationFound }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [locationName, setLocationName] = useState<string>('');
  const [coordinates, setCoordinates] = useState<[number, number]>([30, 15]);
  const [mapReady, setMapReady] = useState(false);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);

  // Fetch Mapbox token from edge function
  useEffect(() => {
    const fetchToken = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-mapbox-token');
        if (error) throw error;
        if (data?.token) {
          setMapboxToken(data.token);
        } else {
          setTokenError('Mapbox token not configured');
        }
      } catch (err) {
        console.error('[MapboxGlobe] Failed to fetch token:', err);
        setTokenError('Failed to load map');
      }
    };
    fetchToken();
  }, []);

  // Initialize map when token is available
  useEffect(() => {
    if (!mapContainer.current || map.current || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;
    
    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/dark-v11',
        projection: 'globe',
        zoom: 1.5,
        center: [30, 15],
        pitch: 45,
      });

      // Add navigation controls
      map.current.addControl(
        new mapboxgl.NavigationControl({
          visualizePitch: true,
        }),
        'top-right'
      );

      // Disable scroll zoom for smoother experience
      map.current.scrollZoom.disable();

      // Add atmosphere and fog effects
      map.current.on('style.load', () => {
        map.current?.setFog({
          color: 'rgb(10, 10, 20)',
          'high-color': 'rgb(0, 50, 80)',
          'horizon-blend': 0.2,
        });
        setMapReady(true);
      });

      // Rotation animation settings
      const secondsPerRevolution = 120;
      const maxSpinZoom = 5;
      const slowSpinZoom = 3;
      let userInteracting = false;
      let spinEnabled = true;

      // Spin globe function
      function spinGlobe() {
        if (!map.current) return;
        
        const zoom = map.current.getZoom();
        if (spinEnabled && !userInteracting && zoom < maxSpinZoom) {
          let distancePerSecond = 360 / secondsPerRevolution;
          if (zoom > slowSpinZoom) {
            const zoomDif = (maxSpinZoom - zoom) / (maxSpinZoom - slowSpinZoom);
            distancePerSecond *= zoomDif;
          }
          const center = map.current.getCenter();
          center.lng -= distancePerSecond;
          map.current.easeTo({ center, duration: 1000, easing: (n) => n });
        }
      }

      // Event listeners for interaction
      map.current.on('mousedown', () => { userInteracting = true; });
      map.current.on('dragstart', () => { userInteracting = true; });
      map.current.on('mouseup', () => { userInteracting = false; spinGlobe(); });
      map.current.on('touchend', () => { userInteracting = false; spinGlobe(); });
      map.current.on('moveend', () => { spinGlobe(); });

      // Start the globe spinning
      spinGlobe();
    } catch (err) {
      console.error('[MapboxGlobe] Initialization error:', err);
      setTokenError('Failed to initialize map');
    }

    return () => {
      marker.current?.remove();
      map.current?.remove();
      map.current = null;
    };
  }, [mapboxToken]);

  // Geocode and fly to location when searchLocation changes
  useEffect(() => {
    if (!searchLocation || !map.current || !mapReady || !mapboxToken) return;
    
    const geocode = async () => {
      setIsSearching(true);
      try {
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchLocation)}.json?access_token=${mapboxToken}&limit=1`
        );
        
        if (response.ok) {
          const data = await response.json();
          if (data.features && data.features.length > 0) {
            const [lng, lat] = data.features[0].center;
            const name = data.features[0].place_name;
            
            setCoordinates([lng, lat]);
            setLocationName(name.split(',').slice(0, 2).join(', '));
            
            // Fly to location
            map.current?.flyTo({
              center: [lng, lat],
              zoom: 12,
              pitch: 60,
              bearing: Math.random() * 90 - 45,
              duration: 3000,
              essential: true
            });

            // Add/update marker with pulsing effect
            if (marker.current) {
              marker.current.remove();
            }

            const el = document.createElement('div');
            el.className = 'mapbox-marker-pulse';
            el.innerHTML = `
              <div style="
                width: 20px;
                height: 20px;
                background: #00F0FF;
                border-radius: 50%;
                box-shadow: 0 0 20px #00F0FF, 0 0 40px #00F0FF;
                animation: pulse 1.5s ease-in-out infinite;
              "></div>
            `;

            marker.current = new mapboxgl.Marker(el)
              .setLngLat([lng, lat])
              .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(`
                <div style="
                  background: rgba(0,0,0,0.9);
                  color: #00F0FF;
                  padding: 8px 12px;
                  font-family: 'JetBrains Mono', monospace;
                  font-size: 11px;
                  border: 1px solid rgba(0,240,255,0.3);
                  border-radius: 4px;
                ">
                  📍 ${name.split(',')[0]}
                </div>
              `))
              .addTo(map.current!);

            if (onLocationFound) {
              onLocationFound({ lat, lng, name });
            }
          }
        }
      } catch (err) {
        console.error('[MapboxGlobe] Geocoding error:', err);
      } finally {
        setIsSearching(false);
      }
    };
    
    geocode();
  }, [searchLocation, mapReady, mapboxToken, onLocationFound]);

  // Show error state
  if (tokenError) {
    return (
      <div className="relative w-full h-64 rounded-xl overflow-hidden border border-cyan-500/30 bg-black/80 flex items-center justify-center">
        <div className="text-center">
          <p className="text-cyan-400 font-mono text-sm mb-2">⚠️ {tokenError}</p>
          <p className="text-white/50 font-mono text-xs">Mapbox token required for premium globe</p>
        </div>
      </div>
    );
  }

  // Show loading state while fetching token
  if (!mapboxToken) {
    return (
      <div className="relative w-full h-64 rounded-xl overflow-hidden border border-cyan-500/30 bg-black/80 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-cyan-400 font-mono text-xs">LOADING GLOBE...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-64 rounded-xl overflow-hidden">
      <div ref={mapContainer} className="absolute inset-0" />
      
      {/* Loading overlay */}
      {isSearching && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-20 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-cyan-400 font-mono text-xs tracking-wider">SCANNING REALSPACE...</span>
          </div>
        </div>
      )}
      
      {/* Scan Lines Overlay */}
      <div className="absolute inset-0 pointer-events-none bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(0,240,255,0.02)_2px,rgba(0,240,255,0.02)_4px)]" />
      
      {/* Corner Brackets */}
      <div className="absolute top-2 left-2 w-4 h-4 border-l-2 border-t-2 border-cyan-500/60" />
      <div className="absolute top-2 right-2 w-4 h-4 border-r-2 border-t-2 border-cyan-500/60" />
      <div className="absolute bottom-2 left-2 w-4 h-4 border-l-2 border-b-2 border-cyan-500/60" />
      <div className="absolute bottom-2 right-2 w-4 h-4 border-r-2 border-b-2 border-cyan-500/60" />
      
      {/* Status Label */}
      <div className="absolute bottom-4 left-4 px-2 py-1 bg-black/70 backdrop-blur-sm rounded text-xs font-mono text-cyan-400 z-10">
        <span className="animate-gpu-status-primary">●</span>
        {' '}{isSearching ? 'SCANNING...' : 'GLOBE ACTIVE'}
      </div>

      {/* Location Name Display */}
      {locationName && (
        <div className="absolute top-4 left-4 px-2 py-1 bg-black/70 backdrop-blur-sm rounded text-xs font-mono text-cyan-400 max-w-[60%] truncate z-10">
          📍 {locationName}
        </div>
      )}

      {/* Coordinates Display */}
      <div className="absolute top-4 right-12 px-2 py-1 bg-black/70 backdrop-blur-sm rounded text-[10px] font-mono text-cyan-400/70 z-10">
        {coordinates[1].toFixed(4)}°{coordinates[1] >= 0 ? 'N' : 'S'}, {Math.abs(coordinates[0]).toFixed(4)}°{coordinates[0] >= 0 ? 'E' : 'W'}
      </div>

      {/* CSS for pulsing marker */}
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.5); opacity: 0.5; }
        }
        .mapboxgl-popup-content {
          background: transparent !important;
          padding: 0 !important;
          box-shadow: none !important;
        }
        .mapboxgl-popup-tip {
          display: none !important;
        }
      `}</style>
    </div>
  );
};

export default MapboxGlobe;

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, useMap, Popup } from 'react-leaflet';
import { motion } from 'framer-motion';
import 'leaflet/dist/leaflet.css';

interface TacticalMapProps {
  markers?: Array<{ lat: number; lng: number; label?: string }>;
  center?: [number, number];
  zoom?: number;
  searchLocation?: string;
  onLocationFound?: (location: { lat: number; lng: number; name: string }) => void;
}

// Holographic filter component
function HolographicOverlay() {
  const map = useMap();
  
  useEffect(() => {
    const container = map.getContainer();
    container.style.filter = 'grayscale(100%) invert(100%) sepia(100%) saturate(300%) hue-rotate(180deg)';
  }, [map]);
  
  return null;
}

// Component to fly to location
function FlyToLocation({ center }: { center: [number, number] }) {
  const map = useMap();
  
  useEffect(() => {
    if (center) {
      map.flyTo(center, 14, { duration: 2 });
    }
  }, [map, center]);
  
  return null;
}

// Pulsing neon marker component
function PulsingMarker({ lat, lng, label }: { lat: number; lng: number; label?: string }) {
  return (
    <>
      <CircleMarker
        center={[lat, lng]}
        radius={8}
        pathOptions={{
          color: '#00F0FF',
          fillColor: '#00F0FF',
          fillOpacity: 0.6,
          weight: 2
        }}
      >
        {label && (
          <Popup className="tactical-popup">
            <div className="bg-black/80 text-cyan-400 font-mono text-xs p-2 rounded">
              {label}
            </div>
          </Popup>
        )}
      </CircleMarker>
      {/* Pulse ring effect - rendered as additional markers */}
      <CircleMarker
        center={[lat, lng]}
        radius={12}
        pathOptions={{
          color: '#00F0FF',
          fillColor: 'transparent',
          fillOpacity: 0,
          weight: 1,
          opacity: 0.5
        }}
      />
      <CircleMarker
        center={[lat, lng]}
        radius={16}
        pathOptions={{
          color: '#00F0FF',
          fillColor: 'transparent',
          fillOpacity: 0,
          weight: 1,
          opacity: 0.3
        }}
      />
    </>
  );
}

export default function TacticalMap({ 
  markers: initialMarkers = [{ lat: 40.7128, lng: -74.0060, label: 'Current Position' }],
  center: initialCenter = [40.7128, -74.0060],
  zoom = 13,
  searchLocation,
  onLocationFound
}: TacticalMapProps) {
  const [markers, setMarkers] = useState(initialMarkers);
  const [center, setCenter] = useState<[number, number]>(initialCenter);
  const [isSearching, setIsSearching] = useState(false);
  const [locationName, setLocationName] = useState<string>('');

  // Geocode search location when provided
  useEffect(() => {
    if (!searchLocation) return;
    
    const geocode = async () => {
      setIsSearching(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchLocation)}&limit=1`,
          {
            headers: { 'User-Agent': 'Mmora-App/1.0' }
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          if (data && data.length > 0) {
            const lat = parseFloat(data[0].lat);
            const lng = parseFloat(data[0].lon);
            const name = data[0].display_name;
            
            setCenter([lat, lng]);
            setMarkers([{ lat, lng, label: name.split(',')[0] }]);
            setLocationName(name.split(',').slice(0, 2).join(', '));
            
            if (onLocationFound) {
              onLocationFound({ lat, lng, name });
            }
          }
        }
      } catch (err) {
        console.error('Geocoding error:', err);
      } finally {
        setIsSearching(false);
      }
    };
    
    geocode();
  }, [searchLocation, onLocationFound]);

  return (
    <div className="relative w-full h-64 rounded-xl overflow-hidden border border-cyan-500/30">
      <MapContainer
        center={center}
        zoom={zoom}
        className="w-full h-full"
        zoomControl={false}
        attributionControl={false}
      >
        <HolographicOverlay />
        <FlyToLocation center={center} />
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        {markers.map((marker, index) => (
          <PulsingMarker key={index} lat={marker.lat} lng={marker.lng} label={marker.label} />
        ))}
      </MapContainer>
      
      {/* Searching indicator */}
      {isSearching && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-cyan-400 font-mono text-xs">SCANNING REALSPACE...</span>
          </div>
        </div>
      )}
      
      {/* Animated Scan Lines Overlay */}
      <div className="absolute inset-0 pointer-events-none bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(0,240,255,0.03)_2px,rgba(0,240,255,0.03)_4px)]" />
      
      {/* Pulsing Scan Effect */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-cyan-500/10 via-transparent to-cyan-500/5 animate-gpu-scan-gradient" />
      
      {/* Corner Brackets */}
      <div className="absolute top-2 left-2 w-4 h-4 border-l-2 border-t-2 border-cyan-500/60" />
      <div className="absolute top-2 right-2 w-4 h-4 border-r-2 border-t-2 border-cyan-500/60" />
      <div className="absolute bottom-2 left-2 w-4 h-4 border-l-2 border-b-2 border-cyan-500/60" />
      <div className="absolute bottom-2 right-2 w-4 h-4 border-r-2 border-b-2 border-cyan-500/60" />
      
      {/* Status Label */}
      <div className="absolute bottom-4 left-4 px-2 py-1 bg-black/60 backdrop-blur-sm rounded text-xs font-mono text-cyan-400">
        <span className="animate-gpu-pulse-opacity">● </span>
        {' '}{isSearching ? 'SCANNING...' : 'REALSPACE LOCK'}
      </div>

      {/* Location Name Display */}
      {locationName && (
        <div className="absolute top-4 left-4 px-2 py-1 bg-black/60 backdrop-blur-sm rounded text-xs font-mono text-cyan-400 max-w-[60%] truncate">
          📍 {locationName}
        </div>
      )}

      {/* Coordinates Display */}
      <div className="absolute top-4 right-4 px-2 py-1 bg-black/60 backdrop-blur-sm rounded text-[10px] font-mono text-cyan-400/70">
        {center[0].toFixed(4)}°{center[0] >= 0 ? 'N' : 'S'}, {Math.abs(center[1]).toFixed(4)}°{center[1] >= 0 ? 'E' : 'W'}
      </div>
    </div>
  );
}

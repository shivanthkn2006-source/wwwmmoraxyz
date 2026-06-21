// ═══════════════════════════════════════════════════════════════════════════════
// VEHICLE SYSTEM - Drivable Vehicles with Basic Physics
// Cars, bikes, and transport with voice command control
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box, Cylinder, Html } from '@react-three/drei';
import * as THREE from 'three';
import { toast } from 'sonner';

export type VehicleType = 'car' | 'bus' | 'motorcycle' | 'truck' | 'helicopter' | 'boat';

interface Vehicle {
  id: string;
  type: VehicleType;
  position: [number, number, number];
  rotation: number;
  speed: number;
  maxSpeed: number;
  acceleration: number;
  isEngineOn: boolean;
  isAutopilot: boolean;
  color: string;
}

interface VehicleProps {
  vehicle: Vehicle;
  isPlayerInside: boolean;
  onEnter?: () => void;
  onExit?: () => void;
}

// Car Component
const Car: React.FC<{ color: string; isActive: boolean }> = ({ color, isActive }) => {
  return (
    <group>
      {/* Car body */}
      <Box args={[2, 0.8, 4]} position={[0, 0.6, 0]}>
        <meshStandardMaterial color={color} metalness={0.6} roughness={0.4} />
      </Box>
      
      {/* Cabin */}
      <Box args={[1.8, 0.7, 2]} position={[0, 1.25, -0.3]}>
        <meshStandardMaterial color="#1f2937" metalness={0.8} roughness={0.2} transparent opacity={0.7} />
      </Box>
      
      {/* Wheels */}
      {[[-0.9, 0.25, 1.3], [0.9, 0.25, 1.3], [-0.9, 0.25, -1.3], [0.9, 0.25, -1.3]].map((pos, i) => (
        <Cylinder key={i} args={[0.3, 0.3, 0.2, 16]} position={pos as [number, number, number]} rotation={[0, 0, Math.PI / 2]}>
          <meshStandardMaterial color="#1a1a1a" />
        </Cylinder>
      ))}
      
      {/* Headlights */}
      {[[-0.6, 0.5, 2], [0.6, 0.5, 2]].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]}>
          <sphereGeometry args={[0.15, 8, 8]} />
          <meshStandardMaterial color="#ffff00" emissive={isActive ? "#ffff00" : "#333"} emissiveIntensity={isActive ? 1 : 0} />
        </mesh>
      ))}
      
      {/* Tail lights */}
      {[[-0.6, 0.5, -2], [0.6, 0.5, -2]].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]}>
          <sphereGeometry args={[0.12, 8, 8]} />
          <meshStandardMaterial color="#ff0000" emissive={isActive ? "#ff0000" : "#330000"} emissiveIntensity={isActive ? 0.5 : 0} />
        </mesh>
      ))}
    </group>
  );
};

// Motorcycle Component
const Motorcycle: React.FC<{ color: string; isActive: boolean }> = ({ color, isActive }) => {
  return (
    <group>
      {/* Frame */}
      <Box args={[0.3, 0.5, 2]} position={[0, 0.6, 0]}>
        <meshStandardMaterial color={color} metalness={0.7} />
      </Box>
      
      {/* Tank */}
      <Box args={[0.4, 0.3, 0.8]} position={[0, 0.9, 0.2]}>
        <meshStandardMaterial color={color} metalness={0.8} />
      </Box>
      
      {/* Seat */}
      <Box args={[0.35, 0.15, 0.6]} position={[0, 0.85, -0.5]}>
        <meshStandardMaterial color="#1a1a1a" />
      </Box>
      
      {/* Wheels */}
      {[[0, 0.35, 0.9], [0, 0.35, -0.9]].map((pos, i) => (
        <Cylinder key={i} args={[0.35, 0.35, 0.15, 16]} position={pos as [number, number, number]} rotation={[0, 0, Math.PI / 2]}>
          <meshStandardMaterial color="#1a1a1a" />
        </Cylinder>
      ))}
      
      {/* Handlebars */}
      <Cylinder args={[0.02, 0.02, 0.8, 8]} position={[0, 1.1, 0.6]} rotation={[0, 0, Math.PI / 2]}>
        <meshStandardMaterial color="#888" metalness={0.9} />
      </Cylinder>
    </group>
  );
};

// Helicopter Component
const Helicopter: React.FC<{ color: string; isActive: boolean }> = ({ color, isActive }) => {
  const rotorRef = useRef<THREE.Group>(null);
  const tailRotorRef = useRef<THREE.Group>(null);
  
  useFrame((state, delta) => {
    if (isActive && rotorRef.current && tailRotorRef.current) {
      rotorRef.current.rotation.y += delta * 20;
      tailRotorRef.current.rotation.x += delta * 30;
    }
  });
  
  return (
    <group>
      {/* Body */}
      <mesh position={[0, 0, 0]}>
        <capsuleGeometry args={[1, 2, 8, 16]} />
        <meshStandardMaterial color={color} metalness={0.5} />
      </mesh>
      
      {/* Cockpit */}
      <mesh position={[0, 0.3, 1.5]}>
        <sphereGeometry args={[0.8, 16, 16, 0, Math.PI]} />
        <meshStandardMaterial color="#87ceeb" transparent opacity={0.5} metalness={0.8} />
      </mesh>
      
      {/* Tail */}
      <Box args={[0.3, 0.4, 3]} position={[0, 0.3, -2.5]}>
        <meshStandardMaterial color={color} />
      </Box>
      
      {/* Main Rotor */}
      <group ref={rotorRef} position={[0, 1.2, 0]}>
        {[0, Math.PI / 2].map((rot, i) => (
          <Box key={i} args={[6, 0.05, 0.3]} rotation={[0, rot, 0]}>
            <meshStandardMaterial color="#333" />
          </Box>
        ))}
      </group>
      
      {/* Tail Rotor */}
      <group ref={tailRotorRef} position={[0.2, 0.3, -4]}>
        {[0, Math.PI / 2].map((rot, i) => (
          <Box key={i} args={[0.05, 1, 0.1]} rotation={[rot, 0, 0]}>
            <meshStandardMaterial color="#333" />
          </Box>
        ))}
      </group>
      
      {/* Skids */}
      {[[-0.8, -0.8, 0], [0.8, -0.8, 0]].map((pos, i) => (
        <Cylinder key={i} args={[0.05, 0.05, 3, 8]} position={pos as [number, number, number]} rotation={[Math.PI / 2, 0, 0]}>
          <meshStandardMaterial color="#333" />
        </Cylinder>
      ))}
    </group>
  );
};

// Main Vehicle Component
const VehicleModel: React.FC<VehicleProps> = ({ 
  vehicle, 
  isPlayerInside,
  onEnter,
  onExit 
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  
  // Simple physics simulation
  useFrame((state, delta) => {
    if (!groupRef.current || !isPlayerInside) return;
    
    if (vehicle.isEngineOn && vehicle.speed > 0) {
      const moveSpeed = vehicle.speed * delta;
      groupRef.current.position.z += Math.cos(vehicle.rotation) * moveSpeed;
      groupRef.current.position.x += Math.sin(vehicle.rotation) * moveSpeed;
    }
  });

  const renderVehicle = () => {
    switch (vehicle.type) {
      case 'car':
        return <Car color={vehicle.color} isActive={vehicle.isEngineOn} />;
      case 'motorcycle':
        return <Motorcycle color={vehicle.color} isActive={vehicle.isEngineOn} />;
      case 'helicopter':
        return <Helicopter color={vehicle.color} isActive={vehicle.isEngineOn} />;
      default:
        return <Car color={vehicle.color} isActive={vehicle.isEngineOn} />;
    }
  };

  return (
    <group 
      ref={groupRef}
      position={vehicle.position}
      rotation={[0, vehicle.rotation, 0]}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      onClick={() => isPlayerInside ? onExit?.() : onEnter?.()}
    >
      {renderVehicle()}
      
      {/* Interaction prompt */}
      {hovered && !isPlayerInside && (
        <Html position={[0, 2, 0]} center>
          <div className="bg-black/80 px-3 py-2 rounded-lg text-white text-sm border border-purple-500/50">
            <div className="text-purple-400 font-bold">🚗 {vehicle.type.toUpperCase()}</div>
            <div className="text-xs text-white/60 mt-1">Click or say "Enter vehicle"</div>
          </div>
        </Html>
      )}
      
      {/* Speed indicator when inside */}
      {isPlayerInside && (
        <Html position={[0, 3, 0]} center>
          <div className="bg-black/90 px-4 py-2 rounded-lg text-white border border-cyan-500/50">
            <div className="text-cyan-400 text-xs">SPEED</div>
            <div className="text-2xl font-bold">{Math.round(vehicle.speed * 10)} km/h</div>
            <div className="text-xs text-white/60 mt-1">
              {vehicle.isAutopilot ? '🤖 Autopilot' : '🎮 Manual'}
            </div>
          </div>
        </Html>
      )}
    </group>
  );
};

// Vehicle Manager Hook
export const useVehicleSystem = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [currentVehicle, setCurrentVehicle] = useState<string | null>(null);
  const [isInsideVehicle, setIsInsideVehicle] = useState(false);

  const spawnVehicle = useCallback((type: VehicleType, position?: [number, number, number]) => {
    const pos = position || [
      (Math.random() - 0.5) * 30,
      type === 'helicopter' ? 5 : 0,
      (Math.random() - 0.5) * 30
    ];
    
    const colors = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#06b6d4'];
    
    const newVehicle: Vehicle = {
      id: `vehicle_${Date.now()}`,
      type,
      position: pos,
      rotation: Math.random() * Math.PI * 2,
      speed: 0,
      maxSpeed: type === 'helicopter' ? 15 : type === 'motorcycle' ? 12 : 10,
      acceleration: 2,
      isEngineOn: false,
      isAutopilot: false,
      color: colors[Math.floor(Math.random() * colors.length)],
    };
    
    setVehicles(prev => [...prev, newVehicle]);
    toast.success(`${type} spawned!`, { description: 'Vehicle ready for use' });
    return newVehicle;
  }, []);

  const enterVehicle = useCallback((vehicleId: string) => {
    setCurrentVehicle(vehicleId);
    setIsInsideVehicle(true);
    setVehicles(prev => prev.map(v => 
      v.id === vehicleId ? { ...v, isEngineOn: true } : v
    ));
    toast.success('Entered vehicle', { description: 'Use voice commands to drive' });
  }, []);

  const exitVehicle = useCallback(() => {
    if (currentVehicle) {
      setVehicles(prev => prev.map(v => 
        v.id === currentVehicle ? { ...v, isEngineOn: false, speed: 0 } : v
      ));
    }
    setCurrentVehicle(null);
    setIsInsideVehicle(false);
    toast.info('Exited vehicle');
  }, [currentVehicle]);

  const setSpeed = useCallback((speed: number) => {
    if (!currentVehicle) return;
    setVehicles(prev => prev.map(v => 
      v.id === currentVehicle ? { ...v, speed: Math.min(speed, v.maxSpeed) } : v
    ));
  }, [currentVehicle]);

  const toggleAutopilot = useCallback(() => {
    if (!currentVehicle) return;
    setVehicles(prev => prev.map(v => 
      v.id === currentVehicle ? { ...v, isAutopilot: !v.isAutopilot } : v
    ));
    toast.info('Autopilot toggled');
  }, [currentVehicle]);

  // Listen for voice commands
  useEffect(() => {
    const handleVehicleCommand = (event: CustomEvent) => {
      const { action } = event.detail;
      
      switch (action) {
        case 'spawn_car':
          spawnVehicle('car');
          break;
        case 'spawn_transport':
        case 'create_vehicle':
          spawnVehicle('car');
          break;
        case 'enter_vehicle':
          // Find nearest vehicle and enter
          if (vehicles.length > 0 && !isInsideVehicle) {
            enterVehicle(vehicles[0].id);
          }
          break;
        case 'exit_vehicle':
          exitVehicle();
          break;
        case 'start_engine':
          if (currentVehicle) {
            setVehicles(prev => prev.map(v => 
              v.id === currentVehicle ? { ...v, isEngineOn: true } : v
            ));
          }
          break;
        case 'stop_engine':
          if (currentVehicle) {
            setVehicles(prev => prev.map(v => 
              v.id === currentVehicle ? { ...v, isEngineOn: false, speed: 0 } : v
            ));
          }
          break;
        case 'autopilot':
          toggleAutopilot();
          break;
        case 'accelerate':
        case 'drive_fast':
          setSpeed(10);
          break;
        case 'brake':
        case 'drive_slow':
          setSpeed(2);
          break;
        case 'park':
          setSpeed(0);
          break;
      }
    };

    window.addEventListener('vr-vehicle', handleVehicleCommand as EventListener);
    return () => window.removeEventListener('vr-vehicle', handleVehicleCommand as EventListener);
  }, [vehicles, isInsideVehicle, currentVehicle, spawnVehicle, enterVehicle, exitVehicle, setSpeed, toggleAutopilot]);

  return {
    vehicles,
    currentVehicle,
    isInsideVehicle,
    spawnVehicle,
    enterVehicle,
    exitVehicle,
    setSpeed,
    toggleAutopilot
  };
};

// Render all vehicles
const VehicleSystem: React.FC<{
  vehicles: Vehicle[];
  currentVehicle: string | null;
  onEnter: (id: string) => void;
  onExit: () => void;
}> = ({ vehicles, currentVehicle, onEnter, onExit }) => {
  return (
    <group>
      {vehicles.map(vehicle => (
        <VehicleModel
          key={vehicle.id}
          vehicle={vehicle}
          isPlayerInside={vehicle.id === currentVehicle}
          onEnter={() => onEnter(vehicle.id)}
          onExit={onExit}
        />
      ))}
    </group>
  );
};

export default VehicleSystem;

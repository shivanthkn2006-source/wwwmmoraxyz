import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Globe, Network, Activity, Users, AlertTriangle, Sparkles } from 'lucide-react';

interface NodeData {
  id: string;
  lat: number;
  lng: number;
  type: 'user' | 'architect' | 'mentor';
  mentorId?: string;
}

interface LiveEvent {
  id: string;
  type: 'join' | 'sync' | 'purge' | 'mentor';
  message: string;
  timestamp: Date;
}

const ExodusMap: React.FC = () => {
  const { user } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastMouse, setLastMouse] = useState({ x: 0, y: 0 });
  const [showConnections, setShowConnections] = useState(false);
  const [nodes, setNodes] = useState<NodeData[]>([]);
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([]);
  const [zoom, setZoom] = useState(1);

  // Generate random nodes for visualization
  useEffect(() => {
    const generateNodes = async () => {
      // Fetch actual player data for positioning
      const { data: players } = await supabase
        .from('exodus_players')
        .select('id, user_id, mentor_rank, god_mode_unlocked')
        .limit(100);

      const generatedNodes: NodeData[] = [];
      const playerIds = players?.map(p => p.id) || [];

      // Generate scattered nodes
      for (let i = 0; i < 100; i++) {
        const lat = (Math.random() - 0.5) * 180;
        const lng = (Math.random() - 0.5) * 360;
        const player = players?.[i % (players?.length || 1)];
        
        generatedNodes.push({
          id: player?.id || `node-${i}`,
          lat,
          lng,
          type: player?.god_mode_unlocked ? 'architect' : 
                player?.mentor_rank ? 'mentor' : 'user',
          mentorId: i > 10 ? generatedNodes[Math.floor(Math.random() * 10)]?.id : undefined
        });
      }

      setNodes(generatedNodes);
    };

    generateNodes();
  }, []);

  // Simulate live events
  useEffect(() => {
    const cities = ['Tokyo', 'New York', 'Mumbai', 'London', 'São Paulo', 'Lagos', 'Berlin', 'Sydney'];
    const usernames = ['Alpha_Node', 'Echo_Sentinel', 'Nova_Guardian', 'Cipher_01', 'Phantom_X'];
    
    const addEvent = () => {
      const eventTypes = ['join', 'sync', 'purge', 'mentor'] as const;
      const type = eventTypes[Math.floor(Math.random() * eventTypes.length)];
      const city = cities[Math.floor(Math.random() * cities.length)];
      const username = usernames[Math.floor(Math.random() * usernames.length)];
      
      const messages: Record<typeof type, string> = {
        join: `NEW NODE: ${username} joined from ${city}.`,
        sync: `SYNC COMPLETE: ${username} verified by Zoe.`,
        purge: `PURGE: Bot_${Math.floor(Math.random() * 100)} detected and vaporized.`,
        mentor: `MENTOR LINK: ${username} accepted a new mentee.`
      };

      const newEvent: LiveEvent = {
        id: `event-${Date.now()}`,
        type,
        message: messages[type],
        timestamp: new Date()
      };

      setLiveEvents(prev => [newEvent, ...prev.slice(0, 9)]);
    };

    const interval = setInterval(addEvent, 5000);
    addEvent(); // Initial event
    
    return () => clearInterval(interval);
  }, []);

  // Draw globe
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.35 * zoom;

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw atmosphere glow
      const gradient = ctx.createRadialGradient(centerX, centerY, radius * 0.9, centerX, centerY, radius * 1.3);
      gradient.addColorStop(0, 'hsla(185, 100%, 50%, 0.1)');
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 1.3, 0, Math.PI * 2);
      ctx.fill();

      // Draw wireframe globe
      ctx.strokeStyle = 'hsla(185, 100%, 50%, 0.2)';
      ctx.lineWidth = 0.5;

      // Latitude lines
      for (let lat = -80; lat <= 80; lat += 20) {
        ctx.beginPath();
        for (let lng = 0; lng <= 360; lng += 5) {
          const point = project3D(lat, lng, radius, rotation, centerX, centerY);
          if (point.visible) {
            if (lng === 0) ctx.moveTo(point.x, point.y);
            else ctx.lineTo(point.x, point.y);
          }
        }
        ctx.stroke();
      }

      // Longitude lines
      for (let lng = 0; lng < 360; lng += 30) {
        ctx.beginPath();
        for (let lat = -90; lat <= 90; lat += 5) {
          const point = project3D(lat, lng, radius, rotation, centerX, centerY);
          if (point.visible) {
            if (lat === -90) ctx.moveTo(point.x, point.y);
            else ctx.lineTo(point.x, point.y);
          }
        }
        ctx.stroke();
      }

      // Draw nodes
      nodes.forEach((node, idx) => {
        const point = project3D(node.lat, node.lng, radius, rotation, centerX, centerY);
        if (!point.visible) return;

        const nodeRadius = node.type === 'architect' ? 4 : node.type === 'mentor' ? 3 : 2;
        const color = node.type === 'architect' ? 'hsla(45, 100%, 60%, 0.9)' :
                     node.type === 'mentor' ? 'hsla(185, 100%, 60%, 0.8)' :
                     'hsla(185, 100%, 50%, 0.6)';

        ctx.beginPath();
        ctx.arc(point.x, point.y, nodeRadius, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        // Draw connections if enabled
        if (showConnections && node.mentorId) {
          const mentorNode = nodes.find(n => n.id === node.mentorId);
          if (mentorNode) {
            const mentorPoint = project3D(mentorNode.lat, mentorNode.lng, radius, rotation, centerX, centerY);
            if (mentorPoint.visible) {
              ctx.beginPath();
              ctx.moveTo(point.x, point.y);
              ctx.lineTo(mentorPoint.x, mentorPoint.y);
              ctx.strokeStyle = 'hsla(185, 100%, 50%, 0.15)';
              ctx.lineWidth = 0.5;
              ctx.stroke();
            }
          }
        }
      });
    };

    draw();
  }, [nodes, rotation, showConnections, zoom]);

  // 3D projection helper
  const project3D = (lat: number, lng: number, radius: number, rot: { x: number; y: number }, cx: number, cy: number) => {
    const latRad = (lat * Math.PI) / 180;
    const lngRad = ((lng + rot.y) * Math.PI) / 180;

    const x = radius * Math.cos(latRad) * Math.sin(lngRad);
    const y = radius * Math.sin(latRad);
    const z = radius * Math.cos(latRad) * Math.cos(lngRad);

    // Apply rotation
    const cosX = Math.cos((rot.x * Math.PI) / 180);
    const sinX = Math.sin((rot.x * Math.PI) / 180);
    const rotatedY = y * cosX - z * sinX;
    const rotatedZ = y * sinX + z * cosX;

    return {
      x: cx + x,
      y: cy - rotatedY,
      visible: rotatedZ > 0
    };
  };

  // Auto-rotate
  useEffect(() => {
    if (isDragging) return;
    
    const interval = setInterval(() => {
      setRotation(prev => ({ ...prev, y: prev.y + 0.2 }));
    }, 50);

    return () => clearInterval(interval);
  }, [isDragging]);

  // Mouse handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setLastMouse({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    const deltaX = e.clientX - lastMouse.x;
    const deltaY = e.clientY - lastMouse.y;
    
    setRotation(prev => ({
      x: Math.max(-60, Math.min(60, prev.x + deltaY * 0.3)),
      y: prev.y + deltaX * 0.3
    }));
    
    setLastMouse({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => setIsDragging(false);
  const handleWheel = (e: React.WheelEvent) => {
    setZoom(prev => Math.max(0.5, Math.min(2, prev - e.deltaY * 0.001)));
  };

  return (
    <div className="min-h-screen bg-background p-4 pb-20">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-2"
        >
          <h1 className="text-2xl md:text-3xl font-bold font-mono text-primary flex items-center justify-center gap-2">
            <Globe className="w-6 h-6" />
            EXODUS MAP
          </h1>
          <p className="text-sm text-muted-foreground">
            Real-time visualization of the global network
          </p>
        </motion.div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Globe Canvas */}
          <Card className="lg:col-span-8 glass-panel overflow-hidden relative h-[500px]">
            <canvas
              ref={canvasRef}
              width={800}
              height={500}
              className="w-full h-full cursor-grab active:cursor-grabbing"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onWheel={handleWheel}
            />
            
            {/* Controls Overlay */}
            <div className="absolute top-4 left-4 flex items-center gap-2 glass-panel p-2 rounded-lg">
              <Switch
                id="connections"
                checked={showConnections}
                onCheckedChange={setShowConnections}
              />
              <Label htmlFor="connections" className="text-xs font-mono">
                <Network className="w-4 h-4 inline mr-1" />
                Network
              </Label>
            </div>

            {/* Stats Overlay */}
            <div className="absolute top-4 right-4 glass-panel p-3 rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-xs font-mono">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span>{nodes.filter(n => n.type === 'user').length} Active Nodes</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono">
                <div className="w-2 h-2 rounded-full bg-yellow-400" />
                <span>{nodes.filter(n => n.type === 'architect').length} Architects</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono">
                <div className="w-2 h-2 rounded-full bg-accent" />
                <span>{nodes.filter(n => n.type === 'mentor').length} Mentors</span>
              </div>
            </div>
          </Card>

          {/* Live Feed Terminal */}
          <Card className="lg:col-span-4 glass-panel h-[500px] flex flex-col">
            <div className="p-3 border-b border-primary/20 flex items-center gap-2">
              <Activity className="w-4 h-4 text-green-400" />
              <span className="text-sm font-mono text-green-400">LIVE FEED</span>
            </div>
            
            <div className="flex-1 overflow-hidden">
              <AnimatePresence>
                <div className="p-3 space-y-2 font-mono text-xs">
                  {liveEvents.map((event, idx) => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1 - idx * 0.1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className={`p-2 rounded border-l-2 ${
                        event.type === 'join' ? 'border-green-400 text-green-400/80' :
                        event.type === 'sync' ? 'border-primary text-primary/80' :
                        event.type === 'purge' ? 'border-red-400 text-red-400/80' :
                        'border-accent text-accent/80'
                      } bg-muted/30`}
                    >
                      <span className="text-muted-foreground">
                        [{event.timestamp.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })}]
                      </span>{' '}
                      {event.message}
                    </motion.div>
                  ))}
                </div>
              </AnimatePresence>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ExodusMap;

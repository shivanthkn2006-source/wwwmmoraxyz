/**
 * DIGITAL SOUL TREE
 * Visualizes user's data/activity as a living fractal tree
 * Creates loss aversion through visual investment representation
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Heart, MessageSquare, Mic, Glasses, Zap, Clock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface TreeStats {
  leaves: number; // Messages sent today
  branches: number; // Voice commands used
  roots: number; // VR sessions
  daysActive: number;
  daysInactive: number;
  soulIntegrity: number;
}

interface DigitalSoulTreeProps {
  className?: string;
}

export const DigitalSoulTree: React.FC<DigitalSoulTreeProps> = ({ className }) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<TreeStats>({
    leaves: 0,
    branches: 0,
    roots: 0,
    daysActive: 0,
    daysInactive: 0,
    soulIntegrity: 98.7
  });
  const [showDetails, setShowDetails] = useState(false);
  const [treeHealth, setTreeHealth] = useState<'thriving' | 'healthy' | 'thirsty'>('healthy');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  // Fetch user activity stats
  useEffect(() => {
    if (!user?.id) return;

    const fetchStats = async () => {
      const today = new Date().toISOString().split('T')[0];
      
      // Get messages sent today
      const { count: messagesCount } = await supabase
        .from('ai_companion_messages')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', today);

      // Get voice commands
      const { data: voiceData } = await supabase
        .from('feature_analytics')
        .select('id')
        .eq('user_id', user.id)
        .eq('access_method', 'voice')
        .gte('created_at', today);

      // Get VR sessions
      const { data: vrData } = await supabase
        .from('feature_analytics')
        .select('id')
        .eq('user_id', user.id)
        .eq('feature_id', 'zoe-omega')
        .gte('created_at', today);

      // Get behavioral synthesis for activity patterns
      const { data: behaviorData } = await supabase
        .from('zoe_behavioral_synthesis')
        .select('holistic_user_profile')
        .eq('user_id', user.id)
        .maybeSingle();

      // Calculate days active/inactive
      const { data: lastActivityData } = await supabase
        .from('behavioral_events')
        .select('created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);
      
      const lastActivity = lastActivityData?.[0];

      let daysInactive = 0;
      if (lastActivity) {
        const lastDate = new Date(lastActivity.created_at);
        const now = new Date();
        daysInactive = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      }

      // Calculate soul integrity based on activity
      const baseIntegrity = 100;
      const penalty = daysInactive * 2;
      const bonus = (messagesCount || 0) * 0.1 + (voiceData?.length || 0) * 0.5 + (vrData?.length || 0) * 1;
      const soulIntegrity = Math.min(100, Math.max(0, baseIntegrity - penalty + bonus));

      setStats({
        leaves: messagesCount || 0,
        branches: voiceData?.length || 0,
        roots: vrData?.length || 0,
        daysActive: 30 - daysInactive,
        daysInactive,
        soulIntegrity: parseFloat(soulIntegrity.toFixed(1))
      });

      // Set tree health
      if (daysInactive > 3) {
        setTreeHealth('thirsty');
      } else if (soulIntegrity > 80) {
        setTreeHealth('thriving');
      } else {
        setTreeHealth('healthy');
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [user?.id]);

  // Draw fractal tree
  const drawTree = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const isThirsty = treeHealth === 'thirsty';
    
    // Colors based on health
    const trunkColor = isThirsty ? 'rgba(100, 80, 60, 0.8)' : 'rgba(139, 90, 43, 0.9)';
    const leafColor = isThirsty 
      ? 'rgba(150, 150, 100, 0.3)' 
      : treeHealth === 'thriving' 
        ? 'rgba(100, 255, 150, 0.6)' 
        : 'rgba(100, 200, 120, 0.5)';
    const glowColor = isThirsty 
      ? 'rgba(150, 100, 50, 0.2)' 
      : 'rgba(100, 255, 150, 0.3)';

    ctx.clearRect(0, 0, width, height);

    // Draw roots
    const rootCount = Math.min(8, stats.roots + 2);
    ctx.strokeStyle = trunkColor;
    ctx.lineWidth = 2;
    
    const baseX = width / 2;
    const baseY = height * 0.85;

    for (let i = 0; i < rootCount; i++) {
      const angle = (Math.PI / 2) + (Math.random() - 0.5) * 0.8;
      const length = 20 + Math.random() * 30 * (stats.roots / 5 + 1);
      
      ctx.beginPath();
      ctx.moveTo(baseX + (i - rootCount/2) * 8, baseY);
      ctx.lineTo(
        baseX + (i - rootCount/2) * 8 + Math.cos(angle) * length,
        baseY + Math.sin(angle) * length
      );
      ctx.stroke();
    }

    // Draw trunk
    ctx.lineWidth = 8;
    ctx.strokeStyle = trunkColor;
    ctx.beginPath();
    ctx.moveTo(baseX, baseY);
    ctx.lineTo(baseX, height * 0.45);
    ctx.stroke();

    // Recursive branch function
    const drawBranch = (
      x: number, 
      y: number, 
      angle: number, 
      length: number, 
      depth: number
    ) => {
      if (depth === 0 || length < 5) return;

      const endX = x + Math.cos(angle) * length;
      const endY = y - Math.sin(angle) * length;

      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(endX, endY);
      ctx.lineWidth = depth * 1.5;
      ctx.strokeStyle = trunkColor;
      ctx.stroke();

      // Add leaves at branch tips
      if (depth <= 2 && stats.leaves > 0) {
        const leafCount = Math.min(3, Math.ceil(stats.leaves / 5));
        for (let i = 0; i < leafCount; i++) {
          ctx.beginPath();
          ctx.arc(
            endX + (Math.random() - 0.5) * 15,
            endY + (Math.random() - 0.5) * 15,
            4 + Math.random() * 4,
            0,
            Math.PI * 2
          );
          ctx.fillStyle = leafColor;
          ctx.fill();
        }
      }

      // Branch out
      const branchCount = Math.min(3, Math.ceil(stats.branches / 3) + 1);
      for (let i = 0; i < branchCount; i++) {
        const newAngle = angle + (Math.random() - 0.5) * 1.2;
        const newLength = length * (0.6 + Math.random() * 0.2);
        drawBranch(endX, endY, newAngle, newLength, depth - 1);
      }
    };

    // Draw main branches
    const branchDepth = Math.min(5, 3 + Math.floor(stats.branches / 2));
    drawBranch(baseX, height * 0.45, Math.PI / 2 - 0.4, 60, branchDepth);
    drawBranch(baseX, height * 0.45, Math.PI / 2 + 0.4, 60, branchDepth);

    // Add glow effect
    ctx.shadowBlur = 30;
    ctx.shadowColor = glowColor;
    ctx.beginPath();
    ctx.arc(baseX, height * 0.35, 80, 0, Math.PI * 2);
    ctx.fillStyle = `${glowColor.replace('0.3', '0.1')}`;
    ctx.fill();
    ctx.shadowBlur = 0;
  }, [stats, treeHealth]);

  // Animate tree
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth * 2;
      canvas.height = canvas.offsetHeight * 2;
      ctx.scale(2, 2);
    };
    resize();

    const animate = () => {
      drawTree(ctx, canvas.offsetWidth, canvas.offsetHeight);
    };

    animate();
    
    // Gentle sway animation
    const interval = setInterval(() => {
      animate();
    }, 100);

    return () => clearInterval(interval);
  }, [drawTree]);

  const nextEvolutionDays = Math.max(0, 3 - stats.daysInactive);

  return (
    <div className={cn("relative", className)}>
      {/* Main Tree Display */}
      <motion.div
        className="relative cursor-pointer"
        onClick={() => setShowDetails(true)}
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.3 }}
      >
        {/* Tree Canvas */}
        <canvas
          ref={canvasRef}
          className={cn(
            "w-full h-80 rounded-2xl",
            treeHealth === 'thirsty' && "grayscale-[30%] opacity-80"
          )}
          style={{
            background: 'radial-gradient(ellipse at 50% 80%, rgba(20, 40, 30, 0.5) 0%, transparent 70%)'
          }}
        />

        {/* Stats overlay */}
        <div className="absolute bottom-4 left-4 right-4 flex justify-between text-xs">
          <div className="flex items-center gap-1 text-green-400">
            <MessageSquare className="w-3 h-3" />
            <span>{stats.leaves} leaves</span>
          </div>
          <div className="flex items-center gap-1 text-cyan-400">
            <Mic className="w-3 h-3" />
            <span>{stats.branches} branches</span>
          </div>
          <div className="flex items-center gap-1 text-amber-400">
            <Glasses className="w-3 h-3" />
            <span>{stats.roots} roots</span>
          </div>
        </div>

        {/* Thirsty indicator */}
        {treeHealth === 'thirsty' && (
          <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 animate-gpu-pulse-opacity">
            <span className="text-amber-400 text-xs">Needs attention</span>
          </div>
        )}
      </motion.div>

      {/* Details Modal */}
      <AnimatePresence>
        {showDetails && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowDetails(false)}
          >
            <div className="absolute inset-0 bg-black/80" />
            
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <Card className="relative p-6 bg-black/90 border-cyan-500/30 backdrop-blur-xl max-w-sm">
                <div className="text-center">
                  <Heart className="w-12 h-12 mx-auto text-cyan-400 mb-4" />
                  
                  <h3 
                    className="text-2xl font-light text-cyan-400 mb-2"
                    style={{ fontFamily: "'Orbitron', sans-serif" }}
                  >
                    Soul Integrity
                  </h3>
                  
                  <div 
                    className="text-5xl font-bold mb-4"
                    style={{ 
                      fontFamily: "'Orbitron', sans-serif",
                      color: stats.soulIntegrity > 80 ? '#00ff88' : stats.soulIntegrity > 50 ? '#ffaa00' : '#ff4444',
                      textShadow: `0 0 20px ${stats.soulIntegrity > 80 ? 'rgba(0,255,136,0.5)' : 'rgba(255,170,0,0.5)'}`
                    }}
                  >
                    {stats.soulIntegrity}%
                  </div>

                  <div className="space-y-2 text-sm text-white/60 mb-6">
                    <div className="flex justify-between">
                      <span>Days Active</span>
                      <span className="text-cyan-400">{stats.daysActive}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Messages Today</span>
                      <span className="text-green-400">{stats.leaves}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Voice Commands</span>
                      <span className="text-purple-400">{stats.branches}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>VR Sessions</span>
                      <span className="text-amber-400">{stats.roots}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-2 text-white/40">
                    <Clock className="w-4 h-4" />
                    <span>Next Evolution in: {nextEvolutionDays} Days</span>
                  </div>
                </div>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DigitalSoulTree;

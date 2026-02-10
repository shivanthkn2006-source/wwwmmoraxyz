import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Award, Lock, Star, Users, Key, Gift } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface InventoryItem {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlocked: boolean;
  unlockedAt?: string;
}

const CorticalInventory: React.FC = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);

  useEffect(() => {
    if (!user) return;

    const loadInventory = async () => {
      // Check for various achievements and badges
      const { data: badges } = await supabase
        .from('user_badges')
        .select('badge_id, earned_at')
        .eq('user_id', user.id);

      const { data: player } = await supabase
        .from('exodus_players')
        .select('is_first_wave, successful_mentees, god_mode_unlocked, cortical_stack_holder')
        .eq('user_id', user.id)
        .maybeSingle();

      const inventoryItems: InventoryItem[] = [
        {
          id: 'first-wave',
          name: 'The First Wave',
          description: 'Awarded to the first 10,000 users who joined the Exodus',
          icon: <Star className="w-6 h-6" />,
          rarity: 'legendary',
          unlocked: player?.is_first_wave || false,
          unlockedAt: player?.is_first_wave ? 'Genesis' : undefined
        },
        {
          id: 'mentor-chip',
          name: 'The Mentor Chip',
          description: 'Successfully guided 5+ users through the Exodus',
          icon: <Users className="w-6 h-6" />,
          rarity: 'epic',
          unlocked: (player?.successful_mentees || 0) >= 5,
          unlockedAt: (player?.successful_mentees || 0) >= 5 ? `${player?.successful_mentees} mentees` : undefined
        },
        {
          id: 'void-key',
          name: 'Void Key',
          description: 'The mysterious artifact that opens the final door to Architect status',
          icon: <Key className="w-6 h-6" />,
          rarity: 'legendary',
          unlocked: player?.god_mode_unlocked || false
        },
        {
          id: 'cortical-stack',
          name: 'Cortical Stack',
          description: 'Your consciousness backup has been verified and secured',
          icon: <Award className="w-6 h-6" />,
          rarity: 'rare',
          unlocked: player?.cortical_stack_holder || false
        },
        {
          id: 'genesis-node',
          name: 'Genesis Node',
          description: 'Participated in the platform genesis event',
          icon: <Gift className="w-6 h-6" />,
          rarity: 'epic',
          unlocked: badges?.some(b => b.badge_id === 'genesis-participant') || false
        }
      ];

      setItems(inventoryItems);
    };

    loadInventory();
  }, [user]);

  const getRarityColor = (rarity: InventoryItem['rarity']) => {
    switch (rarity) {
      case 'legendary': return 'from-yellow-500/30 to-orange-500/30 border-yellow-500/50';
      case 'epic': return 'from-purple-500/30 to-pink-500/30 border-purple-500/50';
      case 'rare': return 'from-blue-500/30 to-cyan-500/30 border-blue-500/50';
      default: return 'from-gray-500/30 to-gray-600/30 border-gray-500/50';
    }
  };

  const getRarityGlow = (rarity: InventoryItem['rarity']) => {
    switch (rarity) {
      case 'legendary': return '0 0 20px rgba(234, 179, 8, 0.4)';
      case 'epic': return '0 0 15px rgba(168, 85, 247, 0.3)';
      case 'rare': return '0 0 10px rgba(59, 130, 246, 0.3)';
      default: return 'none';
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-mono text-muted-foreground uppercase tracking-wider">
        ASSETS INVENTORY
      </h3>
      
      <div className="grid grid-cols-3 gap-3">
        <TooltipProvider>
          {items.map((item) => (
            <Tooltip key={item.id}>
              <TooltipTrigger asChild>
                <motion.div
                  className={`relative p-3 rounded-lg border bg-gradient-to-br ${getRarityColor(item.rarity)} ${
                    item.unlocked ? 'opacity-100' : 'opacity-40 grayscale'
                  }`}
                  style={{ 
                    boxShadow: item.unlocked ? getRarityGlow(item.rarity) : 'none' 
                  }}
                  whileHover={item.unlocked ? { scale: 1.05 } : undefined}
                  transition={{ type: 'spring', stiffness: 300 }}
                >
                  <div className="flex flex-col items-center text-center gap-2">
                    <div className={`${item.unlocked ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {item.icon}
                    </div>
                    <span className="text-[10px] font-mono leading-tight">
                      {item.name}
                    </span>
                  </div>
                  
                  {!item.unlocked && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-lg">
                      <Lock className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                </motion.div>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[200px]">
                <div className="space-y-1">
                  <p className="font-bold">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                  <Badge variant="outline" className="text-[10px]">
                    {item.rarity.toUpperCase()}
                  </Badge>
                  {item.unlockedAt && (
                    <p className="text-[10px] text-primary">Unlocked: {item.unlockedAt}</p>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          ))}
        </TooltipProvider>
      </div>
    </div>
  );
};

export default CorticalInventory;

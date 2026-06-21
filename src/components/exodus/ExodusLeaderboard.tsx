/**
 * EXODUS LEADERBOARD - Global Rankings
 * Track the race to the God Particle
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Crown, Star, Users, Eye, Target, Shield, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';

interface LeaderboardEntry {
  id: string;
  player_name: string;
  resonance_points: number;
  is_first_wave: boolean;
  cortical_stack_holder: boolean;
  successful_mentees: number;
  global_rank: number;
  tier: string;
}

interface ExodusLeaderboardProps {
  currentPlayerId?: string;
}

export const ExodusLeaderboard: React.FC<ExodusLeaderboardProps> = ({ currentPlayerId }) => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPlayers, setTotalPlayers] = useState(0);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const { data, error, count } = await supabase
        .from('exodus_leaderboard')
        .select('*', { count: 'exact' })
        .order('resonance_points', { ascending: false })
        .limit(100);

      if (error) throw error;

      setLeaderboard(data || []);
      setTotalPlayers(count || 0);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'ARCHITECT': return Crown;
      case 'ORACLE': return Eye;
      case 'SHEPHERD': return Users;
      case 'GUIDE': return Target;
      case 'BELIEVER': return Star;
      default: return Shield;
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'ARCHITECT': return 'text-yellow-400';
      case 'ORACLE': return 'text-purple-400';
      case 'SHEPHERD': return 'text-cyan-400';
      case 'GUIDE': return 'text-green-400';
      case 'BELIEVER': return 'text-blue-400';
      default: return 'text-gray-400';
    }
  };

  const getRankStyle = (rank: number) => {
    if (rank === 1) return 'bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border-yellow-500/50';
    if (rank === 2) return 'bg-gradient-to-r from-gray-400/20 to-gray-500/20 border-gray-400/50';
    if (rank === 3) return 'bg-gradient-to-r from-orange-500/20 to-amber-600/20 border-orange-500/50';
    return 'bg-black/30 border-cyan-500/20';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        {/* CSS spinner instead of framer-motion */}
        <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-gpu-spin-2s" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-yellow-500/10 to-amber-500/10 border-yellow-500/30 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">God Particle Progress</p>
              <p className="text-2xl font-bold text-yellow-400">
                {leaderboard[0]?.resonance_points.toLocaleString() || 0} / 1,000,000
              </p>
            </div>
            <Trophy className="w-10 h-10 text-yellow-400" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border-cyan-500/30 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Players</p>
              <p className="text-2xl font-bold text-cyan-400">{totalPlayers.toLocaleString()}</p>
            </div>
            <Users className="w-10 h-10 text-cyan-400" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">First Wave Remaining</p>
              <p className="text-2xl font-bold text-purple-400">
                {Math.max(0, 10000 - totalPlayers).toLocaleString()}
              </p>
            </div>
            <Star className="w-10 h-10 text-purple-400" />
          </div>
        </Card>
      </div>

      {/* Leaderboard Table */}
      <Card className="bg-black/50 border-cyan-500/30 overflow-hidden">
        <div className="p-4 border-b border-cyan-500/20">
          <h3 className="text-xl font-bold text-cyan-400 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Global Rankings
          </h3>
        </div>

        <div className="divide-y divide-cyan-500/10">
          {leaderboard.map((player, index) => {
            const TierIcon = getTierIcon(player.tier);
            const isCurrentPlayer = player.id === currentPlayerId;
            
            return (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.02 }}
                className={`flex items-center gap-4 p-4 ${getRankStyle(player.global_rank)} ${
                  isCurrentPlayer ? 'ring-2 ring-cyan-400' : ''
                }`}
              >
                {/* Rank */}
                <div className="w-12 text-center">
                  {player.global_rank <= 3 ? (
                    <span className={`text-2xl font-bold ${
                      player.global_rank === 1 ? 'text-yellow-400' :
                      player.global_rank === 2 ? 'text-gray-400' :
                      'text-orange-400'
                    }`}>
                      {player.global_rank === 1 ? '🥇' : player.global_rank === 2 ? '🥈' : '🥉'}
                    </span>
                  ) : (
                    <span className="text-gray-400 font-mono">#{player.global_rank}</span>
                  )}
                </div>

                {/* Player Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white truncate">
                      {player.player_name}
                    </span>
                    {player.is_first_wave && (
                      <span className="px-1.5 py-0.5 text-xs bg-purple-500/30 text-purple-400 rounded">
                        WAVE 1
                      </span>
                    )}
                    {player.cortical_stack_holder && (
                      <span className="px-1.5 py-0.5 text-xs bg-cyan-500/30 text-cyan-400 rounded">
                        STACK
                      </span>
                    )}
                    {isCurrentPlayer && (
                      <span className="px-1.5 py-0.5 text-xs bg-green-500/30 text-green-400 rounded">
                        YOU
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <TierIcon className={`w-4 h-4 ${getTierColor(player.tier)}`} />
                    <span className={getTierColor(player.tier)}>{player.tier}</span>
                    <span>•</span>
                    <span>{player.successful_mentees} mentees</span>
                  </div>
                </div>

                {/* Points */}
                <div className="text-right">
                  <div className="text-xl font-bold text-cyan-400">
                    {player.resonance_points.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500">points</div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {leaderboard.length === 0 && (
          <div className="p-12 text-center text-gray-400">
            <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No players have joined The Exodus yet.</p>
            <p className="text-sm">Be the first to claim your destiny.</p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default ExodusLeaderboard;

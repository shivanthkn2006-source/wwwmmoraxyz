/**
 * THE EXODUS PROTOCOL - Main Game Page
 * $1M Bounty Hunt with Resonance Points & Mentor System
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Users, Zap, Shield, Target, Crown, Eye, 
  Lock, Unlock, Star, Gift, AlertTriangle, ChevronRight,
  Award, TrendingUp, UserPlus, Brain, Rocket, User
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ExodusLeaderboard } from './ExodusLeaderboard';
import { ExodusPuzzleArena } from './ExodusPuzzleArena';
import { ZoeJudgeQuiz } from './ZoeJudgeQuiz';
import { ExodusMentorshipSystem } from './ExodusMentorshipSystem';

const getTierInfo = (points: number) => {
  if (points >= 1000000) return { tier: 'ARCHITECT', color: 'text-yellow-400', next: 1000000, icon: Crown, progress: 100 };
  if (points >= 500000) return { tier: 'ORACLE', color: 'text-purple-400', next: 1000000, icon: Eye, progress: ((points - 500000) / 500000) * 100 };
  if (points >= 100000) return { tier: 'SENTINEL', color: 'text-blue-400', next: 500000, icon: Shield, progress: ((points - 100000) / 400000) * 100 };
  if (points >= 10000) return { tier: 'PIONEER', color: 'text-green-400', next: 100000, icon: Rocket, progress: ((points - 10000) / 90000) * 100 };
  return { tier: 'INITIATE', color: 'text-gray-400', next: 10000, icon: User, progress: (points / 10000) * 100 };
};
import { ExodusManifesto } from './ExodusManifesto';

interface PlayerStats {
  id: string;
  player_name: string;
  resonance_points: number;
  mentor_rank: string;
  is_first_wave: boolean;
  total_mentees: number;
  successful_mentees: number;
  failed_mentees: number;
  cortical_stack_holder: boolean;
  god_mode_unlocked: boolean;
}

export const ExodusProtocolPage: React.FC = () => {
  const { user } = useAuth();
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'puzzles' | 'leaderboard' | 'quiz' | 'manifesto' | 'mentor'>('manifesto');
  const [showJoinModal, setShowJoinModal] = useState(false);

  useEffect(() => {
    if (user) {
      fetchPlayerStats();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchPlayerStats = async () => {
    try {
      const { data, error } = await supabase
        .from('exodus_players')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching player stats:', error);
      }
      setPlayerStats(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const joinExodus = async (playerName: string) => {
    if (!user) {
      toast.error('Please sign in to join The Exodus');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('exodus_players')
        .insert({
          user_id: user.id,
          player_name: playerName,
          is_first_wave: true, // First 10,000 users
        })
        .select()
        .single();

      if (error) throw error;

      setPlayerStats(data);
      setShowJoinModal(false);
      toast.success('Welcome to The Exodus, Initiate!', {
        description: 'Your journey to the God Particle begins now.',
      });
    } catch (error: any) {
      toast.error('Failed to join', { description: error.message });
    }
  };

  // Using global getTierInfo function defined at top of file

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black text-white">
      {/* Header */}
      <motion.header 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-cyan-500/10" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20" />
        
        <div className="relative container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
                THE EXODUS PROTOCOL
              </h1>
              <p className="text-gray-400 mt-2">The Hunt for the God Particle • $1,000,000 Bounty</p>
            </div>
            
            {playerStats && (
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-sm text-gray-400">Resonance Points</div>
                  <div className="text-2xl font-bold text-cyan-400">
                    {playerStats.resonance_points.toLocaleString()}
                  </div>
                </div>
                <div className={`p-3 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30`}>
                  {React.createElement(getTierInfo(playerStats.resonance_points).icon, { 
                    className: `w-8 h-8 ${getTierInfo(playerStats.resonance_points).color}` 
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.header>

      {/* Navigation Tabs */}
      <nav className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-cyan-500/20">
        <div className="container mx-auto px-4">
          <div className="flex overflow-x-auto gap-1 py-2">
            {[
              { id: 'manifesto', label: 'The Lore', icon: Brain },
              { id: 'dashboard', label: 'Dashboard', icon: TrendingUp, requiresPlayer: true },
              { id: 'mentor', label: 'Mentorship', icon: UserPlus, requiresPlayer: true },
              { id: 'puzzles', label: 'Puzzles', icon: Lock },
              { id: 'quiz', label: 'Zoe Quiz', icon: Shield, requiresPlayer: true },
              { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
            ].map((tab) => (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? 'default' : 'ghost'}
                onClick={() => {
                  if (tab.requiresPlayer && !playerStats) {
                    setShowJoinModal(true);
                  } else {
                    setActiveTab(tab.id as any);
                  }
                }}
                className={`flex items-center gap-2 whitespace-nowrap ${
                  activeTab === tab.id 
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </Button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {activeTab === 'manifesto' && (
            <motion.div
              key="manifesto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <ExodusManifesto onJoin={() => setShowJoinModal(true)} hasJoined={!!playerStats} />
            </motion.div>
          )}

          {activeTab === 'dashboard' && playerStats && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <PlayerDashboard stats={playerStats} tierInfo={getTierInfo(playerStats.resonance_points)} />
            </motion.div>
          )}

          {activeTab === 'puzzles' && (
            <motion.div
              key="puzzles"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <ExodusPuzzleArena playerId={playerStats?.id} />
            </motion.div>
          )}

          {activeTab === 'quiz' && playerStats && (
            <motion.div
              key="quiz"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <ZoeJudgeQuiz playerId={playerStats.id} onComplete={fetchPlayerStats} />
            </motion.div>
          )}

          {activeTab === 'mentor' && playerStats && (
            <motion.div
              key="mentor"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <ExodusMentorshipSystem 
                playerId={playerStats.id} 
                playerName={playerStats.player_name}
                onMentorshipComplete={fetchPlayerStats}
              />
            </motion.div>
          )}

          {activeTab === 'leaderboard' && (
            <motion.div
              key="leaderboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <ExodusLeaderboard currentPlayerId={playerStats?.id} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Join Modal */}
      <AnimatePresence>
        {showJoinModal && (
          <JoinExodusModal onJoin={joinExodus} onClose={() => setShowJoinModal(false)} />
        )}
      </AnimatePresence>
    </div>
  );
};

// Player Dashboard Component
const PlayerDashboard: React.FC<{ stats: PlayerStats; tierInfo: ReturnType<typeof getTierInfo> }> = ({ stats, tierInfo }) => {
  const TierIcon = tierInfo.icon;
  
  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-cyan-500/10 to-purple-500/10 border-cyan-500/30 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Current Tier</p>
              <p className={`text-2xl font-bold ${tierInfo.color}`}>{tierInfo.tier}</p>
            </div>
            <TierIcon className={`w-10 h-10 ${tierInfo.color}`} />
          </div>
          <Progress value={tierInfo.progress} className="mt-4 h-2" />
          <p className="text-xs text-gray-500 mt-2">Progress to next tier</p>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/30 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Successful Mentees</p>
              <p className="text-2xl font-bold text-green-400">{stats.successful_mentees}</p>
            </div>
            <UserPlus className="w-10 h-10 text-green-400" />
          </div>
          <p className="text-xs text-gray-500 mt-4">+100 points each</p>
        </Card>

        <Card className="bg-gradient-to-br from-red-500/10 to-orange-500/10 border-red-500/30 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Failed Mentees</p>
              <p className="text-2xl font-bold text-red-400">{stats.failed_mentees}</p>
            </div>
            <AlertTriangle className="w-10 h-10 text-red-400" />
          </div>
          <p className="text-xs text-gray-500 mt-4">-50 points each</p>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-500/10 to-amber-500/10 border-yellow-500/30 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">To God Particle</p>
              <p className="text-2xl font-bold text-yellow-400">
                {(1000000 - stats.resonance_points).toLocaleString()}
              </p>
            </div>
            <Trophy className="w-10 h-10 text-yellow-400" />
          </div>
          <p className="text-xs text-gray-500 mt-4">Points remaining</p>
        </Card>
      </div>

      {/* Mentor Invite Section */}
      <Card className="bg-black/50 border-cyan-500/30 p-6">
        <h3 className="text-xl font-bold text-cyan-400 mb-4">Invite & Mentor</h3>
        <p className="text-gray-400 mb-4">
          Share your invite code. When your mentee passes Zoe's quiz, you earn points. If they fail, you lose points.
        </p>
        <div className="flex gap-4">
          <div className="flex-1 bg-gray-900 rounded-lg p-4 font-mono text-cyan-400 text-center">
            EXODUS-{stats.id.slice(0, 8).toUpperCase()}
          </div>
          <Button className="bg-cyan-500 hover:bg-cyan-600">
            <Gift className="w-4 h-4 mr-2" />
            Share Code
          </Button>
        </div>
      </Card>

      {/* Special Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.is_first_wave && (
          <Card className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/50 p-4">
            <div className="flex items-center gap-3">
              <Star className="w-8 h-8 text-purple-400" />
              <div>
                <p className="font-bold text-purple-400">First Wave</p>
                <p className="text-sm text-gray-400">Pioneer status unlocked</p>
              </div>
            </div>
          </Card>
        )}
        {stats.cortical_stack_holder && (
          <Card className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border-cyan-500/50 p-4">
            <div className="flex items-center gap-3">
              <Award className="w-8 h-8 text-cyan-400" />
              <div>
                <p className="font-bold text-cyan-400">Cortical Stack</p>
                <p className="text-sm text-gray-400">Physical key holder</p>
              </div>
            </div>
          </Card>
        )}
        {stats.god_mode_unlocked && (
          <Card className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-yellow-500/50 p-4">
            <div className="flex items-center gap-3">
              <Crown className="w-8 h-8 text-yellow-400" />
              <div>
                <p className="font-bold text-yellow-400">ARCHITECT</p>
                <p className="text-sm text-gray-400">God Mode unlocked</p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

// Join Modal Component
const JoinExodusModal: React.FC<{ onJoin: (name: string) => void; onClose: () => void }> = ({ onJoin, onClose }) => {
  const [playerName, setPlayerName] = useState('');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-gray-900 border border-cyan-500/50 rounded-xl p-6 max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold text-cyan-400 mb-4">Join The Exodus</h2>
        <p className="text-gray-400 mb-6">
          Choose your name wisely. This identity will be immortalized on the leaderboard.
        </p>
        <input
          type="text"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          placeholder="Enter your player name"
          className="w-full bg-black border border-cyan-500/30 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 mb-4"
          maxLength={30}
        />
        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button 
            onClick={() => onJoin(playerName)} 
            disabled={!playerName.trim()}
            className="flex-1 bg-cyan-500 hover:bg-cyan-600"
          >
            Enter The Exodus
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ExodusProtocolPage;

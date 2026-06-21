/**
 * EXODUS MENTORSHIP SYSTEM
 * Invite code generation, redemption, and mentor point tracking
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { UserPlus, Gift, Copy, Check, Users, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MentorshipSystemProps {
  playerId: string;
  playerName: string;
  onMentorshipComplete?: () => void;
}

export const ExodusMentorshipSystem: React.FC<MentorshipSystemProps> = ({
  playerId,
  playerName,
  onMentorshipComplete,
}) => {
  const [inviteCode, setInviteCode] = useState(`EXODUS-${playerId.slice(0, 8).toUpperCase()}`);
  const [redeemCode, setRedeemCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [redeeming, setRedeeming] = useState(false);

  const copyInviteCode = () => {
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    toast.success('Invite code copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const redeemInviteCode = async () => {
    if (!redeemCode.trim()) {
      toast.error('Please enter an invite code');
      return;
    }

    setRedeeming(true);
    try {
      // Extract mentor ID from invite code (EXODUS-XXXXXXXX)
      const mentorIdPart = redeemCode.replace('EXODUS-', '').toLowerCase();
      
      // Find the mentor by matching the ID prefix
      const { data: mentors, error: mentorError } = await supabase
        .from('exodus_players')
        .select('id, user_id, player_name')
        .ilike('id', `${mentorIdPart}%`)
        .limit(1);

      if (mentorError || !mentors || mentors.length === 0) {
        toast.error('Invalid invite code');
        return;
      }

      const mentor = mentors[0];

      // Check if this is not self-mentorship
      if (mentor.id === playerId) {
        toast.error('You cannot mentor yourself!');
        return;
      }

      // Create mentorship record
      const { error: mentorshipError } = await supabase
        .from('exodus_mentorships')
        .insert({
          mentor_id: mentor.id,
          mentee_user_id: (await supabase.auth.getUser()).data.user?.id,
          mentee_player_id: playerId,
          invite_code: redeemCode,
          status: 'pending',
        });

      if (mentorshipError) {
        if (mentorshipError.code === '23505') {
          toast.error('You have already used this invite code');
        } else {
          throw mentorshipError;
        }
        return;
      }

      toast.success(`You are now mentored by ${mentor.player_name}!`, {
        description: 'Complete Zoe\'s quiz to award them points.',
      });
      
      setRedeemCode('');
      onMentorshipComplete?.();
    } catch (error: any) {
      console.error('Error redeeming code:', error);
      toast.error('Failed to redeem invite code');
    } finally {
      setRedeeming(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Generate Invite Code */}
      <Card className="bg-gradient-to-br from-cyan-500/10 to-purple-500/10 border-cyan-500/30 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Gift className="w-6 h-6 text-cyan-400" />
          <h3 className="text-xl font-bold text-cyan-400">Your Invite Code</h3>
        </div>
        <p className="text-gray-400 mb-4">
          Share this code with others. When they join and pass Zoe's quiz, you earn +100 points.
          If they fail, you lose -50 points. Choose your mentees wisely.
        </p>
        <div className="flex gap-3">
          <div className="flex-1 bg-black/50 rounded-lg p-4 font-mono text-lg text-cyan-400 text-center border border-cyan-500/30">
            {inviteCode}
          </div>
          <Button 
            onClick={copyInviteCode}
            className="bg-cyan-500 hover:bg-cyan-600"
          >
            {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
          </Button>
        </div>
        <div className="mt-4 flex gap-2">
          <Button 
            variant="outline" 
            className="flex-1 border-cyan-500/30 hover:bg-cyan-500/10"
            onClick={() => {
              const shareText = `Join me in The Exodus - the hunt for the $1M God Particle! Use my invite code: ${inviteCode}`;
              if (navigator.share) {
                navigator.share({ text: shareText });
              } else {
                navigator.clipboard.writeText(shareText);
                toast.success('Share text copied!');
              }
            }}
          >
            <Users className="w-4 h-4 mr-2" />
            Share Invite
          </Button>
        </div>
      </Card>

      {/* Redeem Invite Code */}
      <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30 p-6">
        <div className="flex items-center gap-3 mb-4">
          <UserPlus className="w-6 h-6 text-purple-400" />
          <h3 className="text-xl font-bold text-purple-400">Join a Mentor</h3>
        </div>
        <p className="text-gray-400 mb-4">
          Got an invite code from someone? Enter it below to become their mentee.
          Complete Zoe's quiz to prove your understanding.
        </p>
        <div className="flex gap-3">
          <Input
            value={redeemCode}
            onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
            placeholder="EXODUS-XXXXXXXX"
            className="bg-black/50 border-purple-500/30 font-mono"
          />
          <Button 
            onClick={redeemInviteCode}
            disabled={redeeming}
            className="bg-purple-500 hover:bg-purple-600"
          >
            {redeeming ? 'Joining...' : 'Join'}
          </Button>
        </div>
        <div className="mt-4 flex items-start gap-2 text-sm text-yellow-400/80">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>
            Your mentor's reputation depends on your quiz performance. 
            Make sure you understand the platform before taking Zoe's test!
          </span>
        </div>
      </Card>
    </div>
  );
};

export default ExodusMentorshipSystem;

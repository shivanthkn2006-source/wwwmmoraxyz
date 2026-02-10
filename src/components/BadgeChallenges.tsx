import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Clock, Zap, Target } from 'lucide-react';
import { useBadgeChallenges } from '@/hooks/useBadgeChallenges';

export const BadgeChallenges = () => {
  const { availableChallenges, activeChallenges, loading, startChallenge } = useBadgeChallenges();

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Badge Challenges</h3>
        </div>
        <p className="text-sm text-muted-foreground">Loading challenges...</p>
      </Card>
    );
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy': return 'bg-green-500/20 text-green-700 dark:text-green-400';
      case 'medium': return 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400';
      case 'hard': return 'bg-red-500/20 text-red-700 dark:text-red-400';
      default: return 'bg-gray-500/20 text-gray-700 dark:text-gray-400';
    }
  };

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date().getTime();
    const expires = new Date(expiresAt).getTime();
    const diff = expires - now;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Target className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">Badge Challenges</h3>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="active">
            Active ({activeChallenges.length})
          </TabsTrigger>
          <TabsTrigger value="available">
            Available ({availableChallenges.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4 space-y-3">
          {activeChallenges.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No active challenges. Start one to earn rewards!
            </p>
          ) : (
            activeChallenges.map((challenge) => (
              <Card key={challenge.id} className="p-4 bg-secondary/30">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{challenge.icon || '🎯'}</span>
                    <div>
                      <h4 className="font-semibold">{challenge.name}</h4>
                      <p className="text-xs text-muted-foreground">{challenge.description}</p>
                    </div>
                  </div>
                  <Badge className={getDifficultyColor(challenge.difficulty)}>
                    {challenge.difficulty}
                  </Badge>
                </div>

                <div className="space-y-2 mt-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {getTimeRemaining(challenge.expires_at)}
                    </span>
                    <span className="flex items-center gap-1 text-primary">
                      <Zap className="w-3 h-3" />
                      {challenge.reward_points} pts
                    </span>
                  </div>
                  <Progress value={0} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    In progress - complete to earn rewards
                  </p>
                </div>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="available" className="mt-4 space-y-3">
          {availableChallenges.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No available challenges at the moment. Check back later!
            </p>
          ) : (
            availableChallenges.map((challenge) => (
              <Card key={challenge.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{challenge.icon || '🎯'}</span>
                    <div>
                      <h4 className="font-semibold">{challenge.name}</h4>
                      <p className="text-xs text-muted-foreground">{challenge.description}</p>
                    </div>
                  </div>
                  <Badge className={getDifficultyColor(challenge.difficulty)}>
                    {challenge.difficulty}
                  </Badge>
                </div>

                <div className="flex items-center justify-between mt-3">
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {challenge.time_limit_hours}h
                    </span>
                    <span className="flex items-center gap-1 text-primary">
                      <Zap className="w-3 h-3" />
                      {challenge.reward_points} pts
                    </span>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => startChallenge(challenge.challenge_id)}
                  >
                    <Trophy className="w-3 h-3 mr-1" />
                    Start
                  </Button>
                </div>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </Card>
  );
};

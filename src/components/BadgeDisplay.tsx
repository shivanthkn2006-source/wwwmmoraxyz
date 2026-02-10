import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge as BadgeUI } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useGamification } from '@/hooks/useGamification';
import { BADGES, ACHIEVEMENTS } from '@/data/badges';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Star, Target } from 'lucide-react';

export const BadgeDisplay = () => {
  const { userBadges, achievementProgress, loading, getProgressPercentage, hasBadge } = useGamification();
  const [selectedTab, setSelectedTab] = useState('earned');

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">Loading achievements...</div>
        </CardContent>
      </Card>
    );
  }

  const earnedBadges = userBadges;
  const totalBadges = BADGES.length;
  const completionPercentage = (earnedBadges.length / totalBadges) * 100;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              Achievements & Badges
            </CardTitle>
            <CardDescription>
              {earnedBadges.length} of {totalBadges} badges earned
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">{Math.round(completionPercentage)}%</div>
            <div className="text-xs text-muted-foreground">Complete</div>
          </div>
        </div>
        <Progress value={completionPercentage} className="mt-2" />
      </CardHeader>
      <CardContent>
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="earned" className="flex items-center gap-1">
              <Star className="h-4 w-4" />
              Earned
            </TabsTrigger>
            <TabsTrigger value="progress" className="flex items-center gap-1">
              <Target className="h-4 w-4" />
              In Progress
            </TabsTrigger>
            <TabsTrigger value="all">All Badges</TabsTrigger>
          </TabsList>

          <TabsContent value="earned" className="mt-4">
            {earnedBadges.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Trophy className="h-12 w-12 mx-auto mb-2 opacity-30" />
                <p>No badges earned yet. Start exploring features!</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {earnedBadges.map((userBadge) => (
                  <div
                    key={userBadge.id}
                    className="flex flex-col items-center p-4 border rounded-lg bg-primary/5 border-primary/20"
                  >
                    <div className="text-4xl mb-2">{userBadge.badge_icon}</div>
                    <div className="text-sm font-semibold text-center">{userBadge.badge_name}</div>
                    <div className="text-xs text-muted-foreground text-center mt-1">
                      {userBadge.badge_description}
                    </div>
                    <BadgeUI variant="secondary" className="mt-2 text-xs">
                      {new Date(userBadge.earned_at).toLocaleDateString()}
                    </BadgeUI>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="progress" className="mt-4 space-y-4">
            {ACHIEVEMENTS.filter(achievement => {
              const progress = getProgressPercentage(achievement.id);
              return progress > 0 && progress < 100;
            }).map((achievement) => {
              const progress = getProgressPercentage(achievement.id);
              const badge = BADGES.find(b => b.id === achievement.badge_id);
              
              return (
                <div key={achievement.id} className="border rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="text-3xl">{badge?.icon}</div>
                    <div className="flex-1">
                      <div className="font-semibold">{achievement.name}</div>
                      <div className="text-sm text-muted-foreground">{achievement.description}</div>
                      <div className="mt-2">
                        <div className="flex justify-between text-xs mb-1">
                          <span>{Math.round(progress)}% complete</span>
                          <span className="text-muted-foreground">
                            {achievementProgress.find(p => p.achievement_id === achievement.id)?.current_progress || 0} / {achievement.target}
                          </span>
                        </div>
                        <Progress value={progress} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {ACHIEVEMENTS.filter(a => {
              const progress = getProgressPercentage(a.id);
              return progress > 0 && progress < 100;
            }).length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Target className="h-12 w-12 mx-auto mb-2 opacity-30" />
                <p>No achievements in progress. Start using features!</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="all" className="mt-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {BADGES.map((badge) => {
                const earned = hasBadge(badge.id);
                
                return (
                  <div
                    key={badge.id}
                    className={`flex flex-col items-center p-4 border rounded-lg transition-all ${
                      earned
                        ? 'bg-primary/5 border-primary/20'
                        : 'bg-muted/30 border-border opacity-50'
                    }`}
                  >
                    <div className={`text-4xl mb-2 ${!earned && 'grayscale'}`}>
                      {badge.icon}
                    </div>
                    <div className="text-sm font-semibold text-center">{badge.name}</div>
                    <div className="text-xs text-muted-foreground text-center mt-1">
                      {badge.description}
                    </div>
                    {!earned && (
                      <BadgeUI variant="outline" className="mt-2 text-xs">
                        Locked
                      </BadgeUI>
                    )}
                  </div>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

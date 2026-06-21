import React, { useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { X, Target, TrendingUp } from 'lucide-react';
import { useAchievementMilestones } from '@/hooks/useAchievementMilestones';
import { BADGES } from '@/data/badges';

export const AchievementMilestones = () => {
  const { milestones, loading, generateMilestones, dismissMilestone } = useAchievementMilestones();

  useEffect(() => {
    // Generate milestones on mount if none exist
    if (!loading && milestones.length === 0) {
      generateMilestones();
    }
  }, [loading, milestones.length, generateMilestones]);

  if (loading) {
    return null;
  }

  if (milestones.length === 0) {
    return null;
  }

  const getPriorityColor = (priority: number) => {
    if (priority >= 3) return 'border-l-4 border-l-red-500';
    if (priority >= 2) return 'border-l-4 border-l-yellow-500';
    return 'border-l-4 border-l-blue-500';
  };

  return (
    <Card className="p-6 bg-gradient-to-br from-primary/5 to-secondary/5">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">Your Next Achievements</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Personalized suggestions based on your activity
      </p>

      <div className="space-y-3">
        {milestones.map((milestone) => {
          const badge = BADGES.find(b => b.id === milestone.suggested_badge_id);
          if (!badge) return null;

          return (
            <Card key={milestone.id} className={`p-4 ${getPriorityColor(milestone.priority)}`}>
              <div className="flex items-start gap-3">
                <div className="text-3xl">{badge.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div>
                      <h4 className="font-semibold">{badge.name}</h4>
                      <p className="text-xs text-muted-foreground">{badge.category}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => dismissMilestone(milestone.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{milestone.reason}</p>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium text-primary">
                        {Math.round(milestone.progress_percentage)}%
                      </span>
                    </div>
                    <Progress value={milestone.progress_percentage} className="h-2" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    <Target className="w-3 h-3 inline mr-1" />
                    {badge.requirement}
                  </p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Button
        variant="outline"
        size="sm"
        className="w-full mt-4"
        onClick={generateMilestones}
      >
        <TrendingUp className="w-4 h-4 mr-2" />
        Refresh Suggestions
      </Button>
    </Card>
  );
};

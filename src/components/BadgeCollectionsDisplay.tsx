import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trophy, Lock, CheckCircle } from 'lucide-react';
import { useBadgeCollections } from '@/hooks/useBadgeCollections';
import { useGamification } from '@/hooks/useGamification';

export const BadgeCollectionsDisplay = () => {
  const { collections, userProgress, loading, getCollectionProgress, getCollectionBadgeDetails } = useBadgeCollections();
  const { userBadges } = useGamification();
  const [completionPercentages, setCompletionPercentages] = useState<Record<string, number>>({});

  useEffect(() => {
    const calculatePercentages = async () => {
      const percentages: Record<string, number> = {};
      const userBadgeIds = new Set(userBadges.map(b => b.badge_id));

      collections.forEach(collection => {
        const requiredBadges = collection.badge_ids;
        const earnedCount = requiredBadges.filter(id => userBadgeIds.has(id)).length;
        percentages[collection.collection_id] = (earnedCount / requiredBadges.length) * 100;
      });

      setCompletionPercentages(percentages);
    };

    if (!loading && collections.length > 0) {
      calculatePercentages();
    }
  }, [collections, userBadges, loading]);

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Badge Collections</h3>
        </div>
        <p className="text-sm text-muted-foreground">Loading collections...</p>
      </Card>
    );
  }

  if (collections.length === 0) {
    return null;
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">Badge Collections</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Complete themed badge sets to unlock bonus rewards!
      </p>

      <div className="space-y-4">
        {collections.map((collection) => {
          const progress = getCollectionProgress(collection.collection_id);
          const percentage = completionPercentages[collection.collection_id] || 0;
          const isCompleted = progress?.is_completed || false;
          const badgeDetails = getCollectionBadgeDetails(collection.badge_ids);
          const userBadgeIds = new Set(userBadges.map(b => b.badge_id));

          return (
            <Card key={collection.id} className={`p-4 ${isCompleted ? 'bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/50' : ''}`}>
              <div className="flex items-start gap-3">
                <div className="text-3xl">{collection.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold">{collection.collection_name}</h4>
                    {isCompleted && (
                      <Badge variant="default" className="flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Completed
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">{collection.description}</p>

                  {/* Badge Icons */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {badgeDetails.map((badge) => {
                      const hasEarned = badge && userBadgeIds.has(badge.id);
                      return badge ? (
                        <div
                          key={badge.id}
                          className={`relative w-12 h-12 rounded-lg flex items-center justify-center text-2xl ${
                            hasEarned ? 'bg-primary/20' : 'bg-secondary/50'
                          }`}
                          title={badge.name}
                        >
                          {hasEarned ? (
                            badge.icon
                          ) : (
                            <Lock className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                      ) : null;
                    })}
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1 mb-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium text-primary">{Math.round(percentage)}%</span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>

                  {/* Rewards */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Bonus Reward:
                    </span>
                    <Badge variant="outline">
                      +{collection.bonus_points} points
                    </Badge>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </Card>
  );
};

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { APP_FEATURES } from '@/data/appFeatures';
import { useFeatureAnalytics } from '@/hooks/useFeatureAnalytics';
import { Sparkles, MapPin, Clock, ChevronDown } from 'lucide-react';

interface Recommendation {
  feature: any;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  contextIcon: any;
}

export const SmartFeatureRecommendations = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { trackFeatureAccess } = useFeatureAnalytics();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    const generateRecommendations = async () => {
      try {
        // Get user profile for location
        const { data: profile } = await supabase
          .from('profiles')
          .select('city')
          .eq('user_id', user.id)
          .maybeSingle();

        // Get feature analytics
        const { data: analytics } = await supabase
          .from('feature_analytics')
          .select('feature_id, access_method, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        const usedFeatureIds = new Set(analytics?.map(a => a.feature_id) || []);
        const unusedFeatures = APP_FEATURES.filter(f => !usedFeatureIds.has(f.id));

        // Get current context
        const currentHour = new Date().getHours();
        const isEarlyMorning = currentHour >= 6 && currentHour < 9;
        const isEvening = currentHour >= 18 && currentHour < 22;
        const isLateNight = currentHour >= 22 || currentHour < 6;
        const userCity = profile?.city;

        const smartRecommendations: Recommendation[] = [];

        // Time-based recommendations
        if (isEarlyMorning) {
          const morningFeature = unusedFeatures.find(f => 
            f.keywords.some(k => ['briefing', 'reminder', 'calendar'].includes(k))
          );
          if (morningFeature) {
            smartRecommendations.push({
              feature: morningFeature,
              reason: 'Perfect for your morning routine',
              priority: 'high',
              contextIcon: Clock
            });
          }
        }

        if (isEvening) {
          const socialFeature = unusedFeatures.find(f => f.category === 'social');
          if (socialFeature) {
            smartRecommendations.push({
              feature: socialFeature,
              reason: 'Great time to connect with friends',
              priority: 'high',
              contextIcon: Clock
            });
          }
        }

        if (isLateNight) {
          const aiFeature = unusedFeatures.find(f => 
            f.keywords.some(k => ['ai', 'companion', 'chat'].includes(k))
          );
          if (aiFeature) {
            smartRecommendations.push({
              feature: aiFeature,
              reason: 'Your AI companion is here for you',
              priority: 'medium',
              contextIcon: Clock
            });
          }
        }

        // Location-based recommendations
        if (userCity) {
          const locationFeature = unusedFeatures.find(f =>
            f.keywords.some(k => ['huddle', 'location', 'nearby'].includes(k))
          );
          if (locationFeature) {
            smartRecommendations.push({
              feature: locationFeature,
              reason: `Popular in ${userCity}`,
              priority: 'medium',
              contextIcon: MapPin
            });
          }
        }

        // Usage pattern recommendations
        const hasUsedVoice = analytics?.some(a => a.access_method === 'voice');
        if (!hasUsedVoice) {
          const voiceFeature = unusedFeatures.find(f =>
            f.keywords.some(k => ['voice', 'macro', 'command'].includes(k))
          );
          if (voiceFeature) {
            smartRecommendations.push({
              feature: voiceFeature,
              reason: 'Try voice commands for faster access',
              priority: 'high',
              contextIcon: Sparkles
            });
          }
        }

        // Fill remaining slots with random unused features
        const remainingSlots = 5 - smartRecommendations.length;
        const randomFeatures = unusedFeatures
          .filter(f => !smartRecommendations.some(r => r.feature.id === f.id))
          .sort(() => Math.random() - 0.5)
          .slice(0, remainingSlots)
          .map(f => ({
            feature: f,
            reason: 'Discover something new',
            priority: 'low' as const,
            contextIcon: Sparkles
          }));

        setRecommendations([...smartRecommendations, ...randomFeatures]);
      } catch (error) {
        console.error('Error generating recommendations:', error);
      } finally {
        setLoading(false);
      }
    };

    generateRecommendations();
  }, [user]);

  const handleFeatureClick = (recommendation: Recommendation) => {
    if (recommendation.feature.location) {
      trackFeatureAccess(
        recommendation.feature.id,
        recommendation.feature.name,
        'direct',
        'smart_recommendation'
      );
      navigate(recommendation.feature.location);
    } else if (recommendation.feature.action) {
      recommendation.feature.action();
    }
  };

  if (loading || recommendations.length === 0) {
    return null;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="py-1">
        <CollapsibleTrigger className="w-full">
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-2 px-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-left">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium">Smart Recommendations for You</span>
                <span className="text-[10px] text-muted-foreground">• Tailored to your context</span>
              </div>
              <ChevronDown 
                className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`}
              />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="space-y-3 pt-0">
            {recommendations.map((rec, index) => {
              const Icon = rec.contextIcon;
              return (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start gap-3 flex-1">
                    <div className="text-2xl">{rec.feature.icon}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{rec.feature.name}</span>
                        <Badge variant={rec.priority === 'high' ? 'default' : 'secondary'} className="text-xs">
                          {rec.priority}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">{rec.feature.description}</div>
                      <div className="flex items-center gap-1 text-xs text-primary mt-1">
                        <Icon className="h-3 w-3" />
                        <span>{rec.reason}</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleFeatureClick(rec)}
                    variant="outline"
                  >
                    Try Now
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};

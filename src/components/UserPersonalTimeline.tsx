import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Calendar, MapPin, TrendingUp, Brain } from 'lucide-react';
import { useUserTimeline } from '@/hooks/useUserTimeline';
import { cn } from '@/lib/utils';

/**
 * USER PERSONAL TIMELINE COMPONENT
 * 
 * Displays individual user's cosmic timeline:
 * - Birth → Present → Predicted Future
 * - Life milestones mapped to universal timeline
 * - Zoe AI future predictions
 */

export const UserPersonalTimeline: React.FC = () => {
  const { timeline, loading } = useUserTimeline();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!timeline?.birthDate) {
    return (
      <Card className="p-8 bg-gradient-to-br from-card/50 to-card/30 backdrop-blur-xl border-border/50">
        <div className="text-center space-y-4">
          <Brain className="w-16 h-16 mx-auto text-muted-foreground" />
          <h3 className="text-xl font-bold">Your Personal Timeline Awaits</h3>
          <p className="text-muted-foreground">
            Add your birth date and place in profile settings to unlock Zoe AI's personalized future predictions
          </p>
          <Button variant="outline">Complete Profile</Button>
        </div>
      </Card>
    );
  }

  const timelinePercentage = timeline.currentAge / (timeline.lifeExpectancy || 85);

  return (
    <div className="space-y-8">
      {/* Timeline Header */}
      <Card className="p-6 bg-gradient-to-br from-primary/20 to-primary/5 backdrop-blur-xl border-primary/20">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-primary animate-pulse" />
              <h2 className="text-2xl font-bold">Your Cosmic Journey</h2>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Born {timeline.birthDate.toLocaleDateString()}
              </div>
              {timeline.birthPlace && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {timeline.birthPlace}
                </div>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-primary">{timeline.currentAge}</div>
            <div className="text-xs text-muted-foreground">Years in Universe</div>
          </div>
        </div>

        {/* Life Progress Bar */}
        <div className="mt-6">
          <div className="flex justify-between text-xs text-muted-foreground mb-2">
            <span>Birth</span>
            <span>Present</span>
            <span>Predicted ~{timeline.lifeExpectancy}y</span>
          </div>
          <div className="h-3 bg-background/50 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${timelinePercentage * 100}%` }}
              transition={{ duration: 1.5, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-primary via-primary to-primary/50 relative"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
            </motion.div>
          </div>
        </div>
      </Card>

      {/* Future Predictions by Zoe */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h3 className="text-xl font-bold">Zoe's Future Predictions for You</h3>
        </div>

        {timeline.futurePredictions.map((prediction, index) => (
          <motion.div
            key={prediction.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className={cn(
              "p-6 bg-gradient-to-br backdrop-blur-xl border-2 transition-all hover:scale-[1.02]",
              "from-primary/10 to-primary/5 border-primary/30 hover:border-primary/50"
            )}>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-primary" />
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-lg">{prediction.title}</h4>
                    <span className="text-sm text-muted-foreground">
                      {prediction.eventDate.getFullYear()}
                    </span>
                  </div>
                  <p className="text-muted-foreground">{prediction.description}</p>
                  {prediction.zoeAnalysis && (
                    <div className="mt-3 p-3 bg-background/50 rounded-lg border border-primary/20">
                      <div className="flex items-start gap-2">
                        <Brain className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-foreground/80">{prediction.zoeAnalysis}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Connection to Universal Timeline */}
      <Card className="p-6 bg-gradient-to-br from-card/50 to-card/30 backdrop-blur-xl border-border/50">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-primary animate-pulse" />
          </div>
          <h4 className="font-bold text-lg">Your Place in Cosmic History</h4>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            You were born 13.8 billion years after the Big Bang, during the Digital & Information Age threshold. 
            Your lifetime spans humanity's transition from planet-bound species to space-faring civilization.
          </p>
        </div>
      </Card>
    </div>
  );
};
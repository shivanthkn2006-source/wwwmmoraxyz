import { useEffect, useState, ReactNode } from 'react';
import { useTierLimits, FeatureType } from '@/hooks/useTierLimits';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, Sparkles } from 'lucide-react';

interface TierGateWrapperProps {
  feature: FeatureType;
  children: ReactNode;
  onGated?: () => void;
}

export const TierGateWrapper = ({ feature, children, onGated }: TierGateWrapperProps) => {
  const { checkFeatureLimit, showUpgradePrompt, isPremiumUser } = useTierLimits();
  const [isAllowed, setIsAllowed] = useState(true);
  const [remaining, setRemaining] = useState(0);
  const [tier, setTier] = useState('free');

  useEffect(() => {
    checkAccess();
  }, [feature]);

  const checkAccess = async () => {
    const limit = await checkFeatureLimit(feature);
    setIsAllowed(limit.allowed || limit.is_premium);
    setRemaining(limit.remaining);
    setTier(limit.tier);

    if (!limit.allowed && !limit.is_premium) {
      showUpgradePrompt(feature, limit.tier);
      onGated?.();
    }
  };

  if (isPremiumUser) {
    return <>{children}</>;
  }

  if (!isAllowed) {
    return (
      <Card className="p-8 bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-background border-purple-500/20">
        <div className="flex flex-col items-center gap-4 text-center">
          <Lock className="w-16 h-16 text-purple-400" />
          <h3 className="text-2xl font-bold">Feature Limit Reached</h3>
          <p className="text-muted-foreground max-w-md">
            You've reached your {tier} tier limit for this feature. Upgrade to continue using advanced capabilities.
          </p>
          <Button size="lg" className="gap-2">
            <Sparkles className="w-4 h-4" />
            Upgrade to Unlock
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="relative">
      {remaining < 3 && remaining > 0 && (
        <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-200 text-sm">
          ⚠️ {remaining} {feature} operation{remaining !== 1 ? 's' : ''} remaining on {tier} tier
        </div>
      )}
      {children}
    </div>
  );
};

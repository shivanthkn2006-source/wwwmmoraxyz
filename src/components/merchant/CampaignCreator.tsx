import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Target, DollarSign, Clock, MapPin, Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

interface CampaignCreatorProps {
  initialCenter: { lat: number; lng: number } | null;
  initialRadius: number;
  onCampaignCreated: () => void;
}

const CampaignCreator: React.FC<CampaignCreatorProps> = ({
  initialCenter,
  initialRadius,
  onCampaignCreated
}) => {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    campaignName: '',
    description: '',
    rewardType: 'points',
    rewardAmount: 50,
    currency: 'USD',
    geofenceLat: initialCenter?.lat || 0,
    geofenceLng: initialCenter?.lng || 0,
    geofenceRadius: initialRadius || 500,
    durationHours: 2,
    maxClaims: 100,
    budgetTotal: 500,
    targetTags: [] as string[]
  });

  // Update geofence when props change
  React.useEffect(() => {
    if (initialCenter) {
      setFormData(prev => ({
        ...prev,
        geofenceLat: initialCenter.lat,
        geofenceLng: initialCenter.lng,
        geofenceRadius: initialRadius
      }));
    }
  }, [initialCenter, initialRadius]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please sign in to create a campaign');
      return;
    }

    if (!formData.campaignName || formData.geofenceLat === 0) {
      toast.error('Please fill in all required fields and select a location');
      return;
    }

    setIsSubmitting(true);

    try {
      const endTime = new Date();
      endTime.setHours(endTime.getHours() + formData.durationHours);

      const { error } = await supabase
        .from('brand_campaigns')
        .insert({
          merchant_user_id: user.id,
          campaign_name: formData.campaignName,
          description: formData.description,
          reward_type: formData.rewardType,
          reward_amount: formData.rewardAmount,
          currency: formData.currency,
          geofence_center_lat: formData.geofenceLat,
          geofence_center_lng: formData.geofenceLng,
          geofence_radius_meters: formData.geofenceRadius,
          end_time: endTime.toISOString(),
          max_claims: formData.maxClaims,
          budget_total: formData.budgetTotal,
          target_tags: formData.targetTags,
          status: 'active'
        });

      if (error) throw error;

      toast.success('Campaign created successfully!', {
        description: `Your bounty is now live for ${formData.durationHours} hours`
      });

      // Reset form
      setFormData({
        campaignName: '',
        description: '',
        rewardType: 'points',
        rewardAmount: 50,
        currency: 'USD',
        geofenceLat: 0,
        geofenceLng: 0,
        geofenceRadius: 500,
        durationHours: 2,
        maxClaims: 100,
        budgetTotal: 500,
        targetTags: []
      });

      onCampaignCreated();
    } catch (err) {
      console.error('Error creating campaign:', err);
      toast.error('Failed to create campaign');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-amber-500/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-500" />
          Create Bounty Campaign
        </CardTitle>
        <CardDescription>
          Set up a reward for users who post selfies in your target area
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Campaign Details */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="campaignName">Campaign Name *</Label>
              <Input
                id="campaignName"
                placeholder="e.g., Flash Sale Weekend"
                value={formData.campaignName}
                onChange={(e) => setFormData(prev => ({ ...prev, campaignName: e.target.value }))}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="rewardType">Reward Type</Label>
              <Select 
                value={formData.rewardType}
                onValueChange={(value) => setFormData(prev => ({ ...prev, rewardType: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="points">Mmora Points</SelectItem>
                  <SelectItem value="cash">Cash Reward</SelectItem>
                  <SelectItem value="discount">Discount Code</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Campaign Description</Label>
            <Textarea
              id="description"
              placeholder="Describe what you want users to do..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </div>

          {/* Reward Settings */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Reward Amount
              </Label>
              <Input
                type="number"
                value={formData.rewardAmount}
                onChange={(e) => setFormData(prev => ({ ...prev, rewardAmount: Number(e.target.value) }))}
                min={1}
              />
              <p className="text-xs text-muted-foreground">
                {formData.rewardType === 'points' ? 'Points per claim' : 'USD per claim'}
              </p>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Duration (Hours)
              </Label>
              <Input
                type="number"
                value={formData.durationHours}
                onChange={(e) => setFormData(prev => ({ ...prev, durationHours: Number(e.target.value) }))}
                min={1}
                max={168}
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Target className="w-4 h-4" />
                Max Claims
              </Label>
              <Input
                type="number"
                value={formData.maxClaims}
                onChange={(e) => setFormData(prev => ({ ...prev, maxClaims: Number(e.target.value) }))}
                min={1}
              />
            </div>
          </div>

          {/* Geofence Settings */}
          <div className="p-4 rounded-lg bg-muted/50 border border-border space-y-4">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-amber-500" />
                Geofence Location
              </Label>
              {formData.geofenceLat !== 0 && (
                <Badge variant="outline" className="text-xs">
                  {formData.geofenceLat.toFixed(4)}, {formData.geofenceLng.toFixed(4)}
                </Badge>
              )}
            </div>

            {formData.geofenceLat === 0 ? (
              <p className="text-sm text-muted-foreground">
                Go to the Heatmap tab and double-click on the globe to select a location
              </p>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Radius: {formData.geofenceRadius}m</span>
                </div>
                <Slider
                  value={[formData.geofenceRadius]}
                  onValueChange={([value]) => setFormData(prev => ({ ...prev, geofenceRadius: value }))}
                  min={100}
                  max={5000}
                  step={100}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>100m</span>
                  <span>5km</span>
                </div>
              </div>
            )}
          </div>

          {/* Budget */}
          <div className="space-y-2">
            <Label>Total Budget (USD)</Label>
            <Input
              type="number"
              value={formData.budgetTotal}
              onChange={(e) => setFormData(prev => ({ ...prev, budgetTotal: Number(e.target.value) }))}
              min={10}
            />
            <p className="text-xs text-muted-foreground">
              Estimated {Math.floor(formData.budgetTotal / formData.rewardAmount)} claims possible
            </p>
          </div>

          {/* Submit */}
          <Button 
            type="submit" 
            className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
            disabled={isSubmitting || formData.geofenceLat === 0}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating Campaign...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Launch Bounty Campaign
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default CampaignCreator;

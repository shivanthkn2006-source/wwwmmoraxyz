import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Target, Clock, Users, DollarSign, MapPin, 
  Pause, Play, Trash2, RefreshCw, Loader2 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface Campaign {
  id: string;
  campaign_name: string;
  description: string | null;
  reward_type: string;
  reward_amount: number;
  currency: string | null;
  geofence_center_lat: number;
  geofence_center_lng: number;
  geofence_radius_meters: number;
  start_time: string;
  end_time: string;
  max_claims: number | null;
  current_claims: number | null;
  budget_total: number | null;
  budget_spent: number | null;
  status: string;
  created_at: string;
}

interface CampaignListProps {
  campaigns: Campaign[];
  isLoading: boolean;
  onRefresh: () => void;
}

const CampaignList: React.FC<CampaignListProps> = ({ campaigns, isLoading, onRefresh }) => {
  const [updatingId, setUpdatingId] = React.useState<string | null>(null);

  const handleStatusToggle = async (campaign: Campaign) => {
    setUpdatingId(campaign.id);
    try {
      const newStatus = campaign.status === 'active' ? 'paused' : 'active';
      const { error } = await supabase
        .from('brand_campaigns')
        .update({ status: newStatus })
        .eq('id', campaign.id);

      if (error) throw error;
      
      toast.success(`Campaign ${newStatus === 'active' ? 'resumed' : 'paused'}`);
      onRefresh();
    } catch (err) {
      console.error('Error updating campaign:', err);
      toast.error('Failed to update campaign');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (campaignId: string) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return;
    
    setUpdatingId(campaignId);
    try {
      const { error } = await supabase
        .from('brand_campaigns')
        .update({ status: 'deleted' })
        .eq('id', campaignId);

      if (error) throw error;
      
      toast.success('Campaign deleted');
      onRefresh();
    } catch (err) {
      console.error('Error deleting campaign:', err);
      toast.error('Failed to delete campaign');
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'paused': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'completed': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'expired': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const activeCampaigns = campaigns.filter(c => c.status !== 'deleted');

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (activeCampaigns.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Target className="w-12 h-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No Campaigns Yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Create your first bounty campaign to start attracting selfies
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Your Campaigns ({activeCampaigns.length})</h3>
        <Button variant="outline" size="sm" onClick={onRefresh}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4">
        {activeCampaigns.map((campaign) => {
          const isExpired = new Date(campaign.end_time) < new Date();
          const claimsProgress = campaign.max_claims 
            ? ((campaign.current_claims || 0) / campaign.max_claims) * 100 
            : 0;
          const budgetProgress = campaign.budget_total 
            ? ((campaign.budget_spent || 0) / campaign.budget_total) * 100 
            : 0;

          return (
            <Card key={campaign.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{campaign.campaign_name}</CardTitle>
                    {campaign.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {campaign.description}
                      </p>
                    )}
                  </div>
                  <Badge className={getStatusColor(isExpired ? 'expired' : campaign.status)}>
                    {isExpired ? 'Expired' : campaign.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="w-4 h-4 text-amber-500" />
                    <span>
                      {campaign.reward_amount} {campaign.reward_type === 'points' ? 'pts' : campaign.currency}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4 text-green-500" />
                    <span>{campaign.current_claims || 0} / {campaign.max_claims || '∞'} claims</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-blue-500" />
                    <span>{campaign.geofence_radius_meters}m radius</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-purple-500" />
                    <span>
                      {isExpired 
                        ? 'Ended' 
                        : `Ends ${formatDistanceToNow(new Date(campaign.end_time), { addSuffix: true })}`
                      }
                    </span>
                  </div>
                </div>

                {/* Progress Bars */}
                <div className="space-y-2">
                  {campaign.max_claims && (
                    <div>
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Claims Progress</span>
                        <span>{claimsProgress.toFixed(0)}%</span>
                      </div>
                      <Progress value={claimsProgress} className="h-2" />
                    </div>
                  )}
                  {campaign.budget_total && (
                    <div>
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Budget Used</span>
                        <span>${campaign.budget_spent || 0} / ${campaign.budget_total}</span>
                      </div>
                      <Progress value={budgetProgress} className="h-2" />
                    </div>
                  )}
                </div>

                {/* Actions */}
                {!isExpired && (
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStatusToggle(campaign)}
                      disabled={updatingId === campaign.id}
                    >
                      {updatingId === campaign.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : campaign.status === 'active' ? (
                        <>
                          <Pause className="w-4 h-4 mr-1" />
                          Pause
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-1" />
                          Resume
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(campaign.id)}
                      disabled={updatingId === campaign.id}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default CampaignList;

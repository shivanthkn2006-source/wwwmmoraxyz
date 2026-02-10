import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Heart, MapPin, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';

interface Campaign {
  id: string;
  campaign_name: string;
  geofence_center_lat: number;
  geofence_center_lng: number;
  geofence_radius_meters: number;
  status: string;
}

interface SelfieClaim {
  id: string;
  pin_id: string;
  user_id: string;
  status: string;
  reward_earned: number;
  created_at: string;
  campaign: {
    campaign_name: string;
  };
  pin?: {
    image_url: string;
    caption: string;
    location_name: string;
    likes_count: number;
  };
  user?: {
    username: string;
    avatar_url: string;
  };
}

interface LiveSelfieFeedProps {
  campaigns: Campaign[];
}

// Calculate distance between two points in meters
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const LiveSelfieFeed: React.FC<LiveSelfieFeedProps> = ({ campaigns }) => {
  const [claims, setClaims] = useState<SelfieClaim[]>([]);
  const [nearbyPins, setNearbyPins] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch claims and nearby pins
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Get campaign IDs
        const campaignIds = campaigns.map(c => c.id);

        // Fetch claims for merchant's campaigns
        if (campaignIds.length > 0) {
          const { data: claimsData } = await supabase
            .from('campaign_claims')
            .select(`
              *,
              campaign:brand_campaigns(campaign_name)
            `)
            .in('campaign_id', campaignIds)
            .order('created_at', { ascending: false })
            .limit(20);

          setClaims(claimsData || []);
        }

        // Fetch recent pins near campaign zones
        const activeCampaigns = campaigns.filter(c => c.status === 'active');
        if (activeCampaigns.length > 0) {
          const { data: pins } = await supabase
            .from('selfie_city_pins')
            .select(`
              *,
              user:profiles!selfie_city_pins_user_id_fkey(username, avatar_url)
            `)
            .order('created_at', { ascending: false })
            .limit(50);

          // Filter pins that are within campaign geofences
          const nearbyPinsFiltered = (pins || []).filter((pin: any) => {
            if (!pin.location_lat || !pin.location_lng) return false;
            
            return activeCampaigns.some(campaign => {
              const distance = calculateDistance(
                pin.location_lat,
                pin.location_lng,
                campaign.geofence_center_lat,
                campaign.geofence_center_lng
              );
              return distance <= campaign.geofence_radius_meters;
            });
          });

          setNearbyPins(nearbyPinsFiltered);
        }
      } catch (err) {
        console.error('Error fetching feed data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    // Set up realtime subscription for new claims
    const campaignIds = campaigns.map(c => c.id);
    if (campaignIds.length > 0) {
      const channel = supabase
        .channel('merchant-claims-feed')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'campaign_claims'
          },
          (payload) => {
            if (campaignIds.includes(payload.new.campaign_id)) {
              setClaims(prev => [payload.new as SelfieClaim, ...prev].slice(0, 20));
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [campaigns]);

  const handleClaimAction = async (claimId: string, action: 'approved' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('campaign_claims')
        .update({ 
          status: action,
          verified_at: new Date().toISOString()
        })
        .eq('id', claimId);

      if (error) throw error;

      setClaims(prev => 
        prev.map(c => c.id === claimId ? { ...c, status: action } : c)
      );
    } catch (err) {
      console.error('Error updating claim:', err);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Claims Feed */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            Bounty Claims
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 max-h-[500px] overflow-y-auto">
          {claims.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No claims yet. Users will appear here when they claim your bounties.
            </p>
          ) : (
            claims.map((claim) => (
              <div 
                key={claim.id} 
                className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border"
              >
                <Avatar className="w-10 h-10">
                  <AvatarImage src={claim.user?.avatar_url} />
                  <AvatarFallback>U</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">
                      {claim.user?.username || 'Anonymous'}
                    </span>
                    <Badge 
                      variant="outline" 
                      className={
                        claim.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                        claim.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }
                    >
                      {claim.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Claimed {claim.reward_earned} points • {formatDistanceToNow(new Date(claim.created_at), { addSuffix: true })}
                  </p>
                  
                  {claim.status === 'pending' && (
                    <div className="flex gap-2 mt-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => handleClaimAction(claim.id, 'approved')}
                      >
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Approve
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="h-7 text-xs text-destructive"
                        onClick={() => handleClaimAction(claim.id, 'rejected')}
                      >
                        <XCircle className="w-3 h-3 mr-1" />
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Nearby Selfies Feed */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-amber-500" />
            Live Selfies in Your Zones
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 max-h-[500px] overflow-y-auto">
          {nearbyPins.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No selfies in your campaign zones yet. They'll appear here in real-time!
            </p>
          ) : (
            nearbyPins.map((pin) => (
              <div 
                key={pin.id} 
                className="flex gap-3 p-3 rounded-lg bg-muted/50 border border-border"
              >
                {pin.image_url && (
                  <img 
                    src={pin.image_url} 
                    alt="Selfie"
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={pin.user?.avatar_url} />
                      <AvatarFallback>U</AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-sm truncate">
                      {pin.user?.username || 'Anonymous'}
                    </span>
                  </div>
                  {pin.caption && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {pin.caption}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Heart className="w-3 h-3" />
                      {pin.likes_count || 0}
                    </span>
                    {pin.location_name && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {pin.location_name}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(new Date(pin.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LiveSelfieFeed;

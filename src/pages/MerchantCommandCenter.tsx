import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, MapPin, Target, Zap, TrendingUp, Users, DollarSign } from 'lucide-react';
import MerchantHeatmapGlobe from '@/components/merchant/MerchantHeatmapGlobe';
import CampaignCreator from '@/components/merchant/CampaignCreator';
import CampaignList from '@/components/merchant/CampaignList';
import LiveSelfieFeed from '@/components/merchant/LiveSelfieFeed';
import { useMerchantCampaigns } from '@/hooks/useMerchantCampaigns';
import { useMerchantStats } from '@/hooks/useMerchantStats';

const MerchantCommandCenter: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedTab, setSelectedTab] = useState('heatmap');
  const [geofenceCenter, setGeofenceCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [geofenceRadius, setGeofenceRadius] = useState(500);
  
  const { campaigns, isLoading: campaignsLoading, refetchCampaigns } = useMerchantCampaigns();
  const { stats, isLoading: statsLoading } = useMerchantStats();

  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  const handleGeofenceSelect = (center: { lat: number; lng: number }, radius: number) => {
    setGeofenceCenter(center);
    setGeofenceRadius(radius);
    setSelectedTab('campaign');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Merchant Command Center</h1>
                <p className="text-xs text-muted-foreground">Selfie City Ad Platform</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="gap-1 px-3 py-1">
                <Zap className="w-3 h-3 text-amber-500" />
                <span>{stats?.activeCampaigns || 0} Active</span>
              </Badge>
              <Button variant="outline" size="sm" onClick={() => navigate('/selfie-city')}>
                View Globe
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Stats Overview */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/5 border-amber-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <Target className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats?.totalImpressions || 0}</p>
                  <p className="text-xs text-muted-foreground">Total Impressions</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/5 border-green-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <Users className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats?.totalClaims || 0}</p>
                  <p className="text-xs text-muted-foreground">Bounty Claims</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border-blue-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats?.conversionRate || 0}%</p>
                  <p className="text-xs text-muted-foreground">Conversion Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/5 border-purple-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">${stats?.budgetSpent || 0}</p>
                  <p className="text-xs text-muted-foreground">Budget Spent</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
          <TabsList className="grid grid-cols-4 w-full max-w-2xl mx-auto">
            <TabsTrigger value="heatmap" className="gap-2">
              <MapPin className="w-4 h-4" />
              Heatmap
            </TabsTrigger>
            <TabsTrigger value="campaign" className="gap-2">
              <Target className="w-4 h-4" />
              Create Bounty
            </TabsTrigger>
            <TabsTrigger value="campaigns" className="gap-2">
              <Zap className="w-4 h-4" />
              My Campaigns
            </TabsTrigger>
            <TabsTrigger value="feed" className="gap-2">
              <Users className="w-4 h-4" />
              Live Feed
            </TabsTrigger>
          </TabsList>

          <TabsContent value="heatmap" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-amber-500" />
                  User Activity Heatmap
                </CardTitle>
                <CardDescription>
                  Click and drag on the globe to select a geofence area for your campaign
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-[500px] rounded-b-lg overflow-hidden">
                  <MerchantHeatmapGlobe 
                    onGeofenceSelect={handleGeofenceSelect}
                    campaigns={campaigns}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="campaign" className="space-y-4">
            <CampaignCreator 
              initialCenter={geofenceCenter}
              initialRadius={geofenceRadius}
              onCampaignCreated={refetchCampaigns}
            />
          </TabsContent>

          <TabsContent value="campaigns" className="space-y-4">
            <CampaignList 
              campaigns={campaigns}
              isLoading={campaignsLoading}
              onRefresh={refetchCampaigns}
            />
          </TabsContent>

          <TabsContent value="feed" className="space-y-4">
            <LiveSelfieFeed campaigns={campaigns} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default MerchantCommandCenter;

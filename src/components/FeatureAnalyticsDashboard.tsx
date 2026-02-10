import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useFeatureAnalytics } from '@/hooks/useFeatureAnalytics';
import { BarChart, TrendingUp, MapPin, Search, Mic, MousePointer, BookOpen } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export const FeatureAnalyticsDashboard = () => {
  const { getFeatureStats } = useFeatureAnalytics();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      setLoading(true);
      const data = await getFeatureStats();
      setStats(data);
      setLoading(false);
    };

    loadStats();
  }, [getFeatureStats]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <BarChart className="w-8 h-8 animate-pulse text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">No analytics data available yet</p>
        </CardContent>
      </Card>
    );
  }

  const accessMethodIcons: { [key: string]: React.ReactNode } = {
    search: <Search className="w-4 h-4" />,
    voice: <Mic className="w-4 h-4" />,
    direct: <MousePointer className="w-4 h-4" />,
    onboarding: <BookOpen className="w-4 h-4" />
  };

  const accessMethodLabels: { [key: string]: string } = {
    search: 'Search',
    voice: 'Voice Command',
    direct: 'Direct Navigation',
    onboarding: 'Onboarding Tour'
  };

  return (
    <div className="space-y-4">
      {/* Overview Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart className="w-5 h-5" />
            Feature Usage Analytics
          </CardTitle>
          <CardDescription>Track how you discover and use features</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Total Usage */}
            <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Total Feature Interactions</p>
                <p className="text-3xl font-bold">{stats.totalUsage}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-primary" />
            </div>

            {/* Access Methods */}
            <div>
              <h4 className="text-sm font-semibold mb-3">Access Methods</h4>
              <div className="space-y-2">
                {Object.entries(stats.byMethod).map(([method, count]: [string, any]) => (
                  <div key={method} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      {accessMethodIcons[method]}
                      <span className="text-sm">{accessMethodLabels[method]}</span>
                    </div>
                    <Badge variant="secondary">{count} times</Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Most Used Features
          </CardTitle>
          <CardDescription>Your top 5 most accessed features</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {stats.topFeatures.length > 0 ? (
              stats.topFeatures.map((feature: any, index: number) => (
                <div key={feature.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-xs font-bold text-primary">{index + 1}</span>
                    </div>
                    <span className="text-sm font-medium">{feature.name}</span>
                  </div>
                  <Badge variant="secondary">{feature.count} uses</Badge>
                </div>
              ))
            ) : (
              <p className="text-center text-sm text-muted-foreground py-4">
                Start using features to see your top picks!
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Location-Based Usage */}
      {Object.keys(stats.locationStats).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Location-Based Usage
            </CardTitle>
            <CardDescription>Features you use in different locations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(stats.locationStats).map(([city, features]: [string, any]) => (
                <div key={city} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary" />
                    <h5 className="font-semibold">{city}</h5>
                  </div>
                  <div className="pl-6 space-y-1">
                    {Object.entries(features).map(([feature, count]: [string, any]) => (
                      <div key={feature} className="flex items-center justify-between p-2 bg-muted/30 rounded text-sm">
                        <span>{feature}</span>
                        <span className="text-muted-foreground">{count}x</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

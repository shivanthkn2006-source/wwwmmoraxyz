import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSearchAnalytics } from '@/hooks/useSearchAnalytics';
import { BarChart3, TrendingUp, Search, Clock, RefreshCw } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export const SearchAnalyticsDashboard = () => {
  const { analytics, loading, refresh } = useSearchAnalytics();

  if (loading) {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon">
            <BarChart3 className="h-5 w-5" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-background">
          <DialogHeader>
            <DialogTitle>Search Analytics</DialogTitle>
            <DialogDescription>Loading your search patterns...</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!analytics) {
    return null;
  }

  const maxDailyCount = Math.max(...analytics.dailyStats.map(s => s.count), 1);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <BarChart3 className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-background">
        <DialogHeader>
          <DialogTitle>Search Analytics</DialogTitle>
          <DialogDescription>Your search patterns and habits over time</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Total Searches
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{analytics.totalSearches}</div>
              </CardContent>
            </Card>

            <Card className="bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Unique Queries
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{analytics.uniqueSearches}</div>
              </CardContent>
            </Card>

            <Card className="bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Avg. per Day
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {(analytics.totalSearches / 7).toFixed(1)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs for different views */}
          <Tabs defaultValue="daily" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="daily">Daily Activity</TabsTrigger>
              <TabsTrigger value="top">Top Searches</TabsTrigger>
              <TabsTrigger value="recent">Recent</TabsTrigger>
            </TabsList>

            <TabsContent value="daily" className="space-y-4">
              <Card className="bg-card">
                <CardHeader>
                  <CardTitle>Last 7 Days</CardTitle>
                  <CardDescription>Your search activity by day</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {analytics.dailyStats.map((stat, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {new Date(stat.date).toLocaleDateString('en-US', { 
                            weekday: 'short', 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </span>
                        <span className="font-medium">{stat.count} searches</span>
                      </div>
                      <Progress 
                        value={(stat.count / maxDailyCount) * 100} 
                        className="h-2"
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="bg-card">
                <CardHeader>
                  <CardTitle>Weekly Trends</CardTitle>
                  <CardDescription>Search volume by week</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {analytics.weeklyStats.map((stat, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{stat.date}</span>
                      <span className="font-medium">{stat.count} searches</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="top" className="space-y-4">
              <Card className="bg-card">
                <CardHeader>
                  <CardTitle>Most Searched Terms</CardTitle>
                  <CardDescription>Your top 10 search queries</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analytics.topSearches.map((search, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                            {idx + 1}
                          </div>
                          <div>
                            <div className="font-medium">{search.query}</div>
                            <div className="text-xs text-muted-foreground">
                              Last searched: {new Date(search.lastSearched).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">{search.count}</div>
                          <div className="text-xs text-muted-foreground">times</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="recent" className="space-y-4">
              <Card className="bg-card">
                <CardHeader>
                  <CardTitle>Recent Searches</CardTitle>
                  <CardDescription>Your latest unique search queries</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {analytics.recentSearches.map((search, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                        <div>
                          <div className="font-medium">{search.query}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(search.lastSearched).toLocaleString()}
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {search.count}x
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end">
            <Button onClick={refresh} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Data
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

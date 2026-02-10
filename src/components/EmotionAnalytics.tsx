import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Calendar, PieChartIcon } from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

interface EmotionLog {
  id: string;
  emotion: string;
  intensity: number;
  created_at: string;
}

const EMOTION_COLORS: Record<string, string> = {
  happy: '#10b981',
  sad: '#3b82f6',
  anxious: '#eab308',
  calm: '#a855f7',
  neutral: '#6b7280',
  angry: '#ef4444',
  excited: '#f97316',
  tired: '#64748b',
};

export const EmotionAnalytics = () => {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState<'week' | 'month'>('week');
  const [emotionLogs, setEmotionLogs] = useState<EmotionLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadEmotionData();
    }
  }, [user, timeRange]);

  const loadEmotionData = async () => {
    if (!user) return;
    setLoading(true);

    const days = timeRange === 'week' ? 7 : 30;
    const startDate = subDays(new Date(), days);

    const { data, error } = await supabase
      .from('emotion_logs')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    if (!error && data) {
      setEmotionLogs(data);
    }
    setLoading(false);
  };

  // Prepare data for emotion frequency chart
  const getEmotionFrequency = () => {
    const frequency: Record<string, number> = {};
    emotionLogs.forEach(log => {
      frequency[log.emotion] = (frequency[log.emotion] || 0) + 1;
    });
    
    return Object.entries(frequency).map(([emotion, count]) => ({
      emotion: emotion.charAt(0).toUpperCase() + emotion.slice(1),
      count,
      fill: EMOTION_COLORS[emotion] || '#6b7280',
    }));
  };

  // Prepare data for daily emotion trends
  const getDailyTrends = () => {
    const dailyData: Record<string, Record<string, number>> = {};
    
    emotionLogs.forEach(log => {
      const date = format(new Date(log.created_at), 'MMM dd');
      if (!dailyData[date]) {
        dailyData[date] = {};
      }
      dailyData[date][log.emotion] = (dailyData[date][log.emotion] || 0) + 1;
    });

    return Object.entries(dailyData).map(([date, emotions]) => ({
      date,
      ...emotions,
    }));
  };

  // Calculate average intensity by emotion
  const getAverageIntensity = () => {
    const emotionIntensities: Record<string, { total: number; count: number }> = {};
    
    emotionLogs.forEach(log => {
      if (!emotionIntensities[log.emotion]) {
        emotionIntensities[log.emotion] = { total: 0, count: 0 };
      }
      emotionIntensities[log.emotion].total += log.intensity;
      emotionIntensities[log.emotion].count += 1;
    });

    return Object.entries(emotionIntensities).map(([emotion, data]) => ({
      emotion: emotion.charAt(0).toUpperCase() + emotion.slice(1),
      intensity: (data.total / data.count).toFixed(1),
      fill: EMOTION_COLORS[emotion] || '#6b7280',
    }));
  };

  // Get insights
  const getMostCommonEmotion = () => {
    const frequency = getEmotionFrequency();
    return frequency.length > 0
      ? frequency.reduce((max, curr) => (curr.count > max.count ? curr : max))
      : null;
  };

  const getEmotionalStability = () => {
    if (emotionLogs.length < 2) return 'N/A';
    const intensities = emotionLogs.map(log => log.intensity);
    const avg = intensities.reduce((a, b) => a + b, 0) / intensities.length;
    const variance = intensities.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / intensities.length;
    const stability = Math.max(0, 100 - variance * 20);
    return `${stability.toFixed(0)}%`;
  };

  if (loading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-6">
          <p className="text-muted-foreground text-center">Loading analytics...</p>
        </CardContent>
      </Card>
    );
  }

  if (emotionLogs.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-6">
          <p className="text-muted-foreground text-center">
            No emotion data yet. Start tracking your emotions to see insights!
          </p>
        </CardContent>
      </Card>
    );
  }

  const mostCommon = getMostCommonEmotion();

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium text-muted-foreground">Most Common</p>
            </div>
            <p className="text-2xl font-bold capitalize">{mostCommon?.emotion || 'N/A'}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {mostCommon?.count} times logged
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium text-muted-foreground">Total Logs</p>
            </div>
            <p className="text-2xl font-bold">{emotionLogs.length}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Last {timeRange === 'week' ? '7 days' : '30 days'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <PieChartIcon className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium text-muted-foreground">Stability</p>
            </div>
            <p className="text-2xl font-bold">{getEmotionalStability()}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Emotional consistency
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Emotion Analytics</CardTitle>
            <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as 'week' | 'month')}>
              <TabsList>
                <TabsTrigger value="week">Week</TabsTrigger>
                <TabsTrigger value="month">Month</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="frequency" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="frequency">Frequency</TabsTrigger>
              <TabsTrigger value="trends">Trends</TabsTrigger>
              <TabsTrigger value="intensity">Intensity</TabsTrigger>
            </TabsList>

            <TabsContent value="frequency" className="space-y-4">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={getEmotionFrequency()}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ emotion, percent }) =>
                      `${emotion} (${(percent * 100).toFixed(0)}%)`
                    }
                    outerRadius={80}
                    dataKey="count"
                  >
                    {getEmotionFrequency().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </TabsContent>

            <TabsContent value="trends" className="space-y-4">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={getDailyTrends()}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  {Object.keys(EMOTION_COLORS).map(emotion => (
                    <Line
                      key={emotion}
                      type="monotone"
                      dataKey={emotion}
                      stroke={EMOTION_COLORS[emotion]}
                      strokeWidth={2}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </TabsContent>

            <TabsContent value="intensity" className="space-y-4">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={getAverageIntensity()}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="emotion" />
                  <YAxis domain={[0, 5]} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="intensity" fill="#8884d8">
                    {getAverageIntensity().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

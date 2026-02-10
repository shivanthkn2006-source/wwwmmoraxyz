import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, TrendingUp, CheckCircle, XCircle, Clock, Activity } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

interface CommandHistory {
  command: string;
  success: boolean;
  created_at: string;
  metadata: any;
}

export default function VoiceCommandHistoryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [history, setHistory] = useState<CommandHistory[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    successful: 0,
    failed: 0,
    successRate: 0,
  });
  const [topCommands, setTopCommands] = useState<{ command: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchCommandHistory();
    }
  }, [user?.id]);

  const fetchCommandHistory = async () => {
    try {
      setLoading(true);
      
      // Fetch recent command history
      const { data: historyData, error: historyError } = await supabase
        .from('zoe_command_history')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (historyError) throw historyError;

      setHistory(historyData || []);

      // Calculate stats
      const total = historyData?.length || 0;
      const successful = historyData?.filter(h => h.success).length || 0;
      const failed = total - successful;
      const successRate = total > 0 ? Math.round((successful / total) * 100) : 0;

      setStats({ total, successful, failed, successRate });

      // Calculate top commands
      const commandCounts: Record<string, number> = {};
      historyData?.forEach(h => {
        const cmd = h.command.toLowerCase();
        commandCounts[cmd] = (commandCounts[cmd] || 0) + 1;
      });

      const topCommandsArray = Object.entries(commandCounts)
        .map(([command, count]) => ({ command, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      setTopCommands(topCommandsArray);
    } catch (error) {
      console.error('Error fetching command history:', error);
      toast.error('Failed to load command history');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="sticky top-0 bg-background backdrop-blur-sm border-b border-border p-4 z-50 flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-semibold">Voice Command History</h1>
        </div>

        <div className="p-4 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-primary" />
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
              <p className="text-2xl font-bold">{stats.total}</p>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <p className="text-sm text-muted-foreground">Success</p>
              </div>
              <p className="text-2xl font-bold text-emerald-500">{stats.successful}</p>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="w-4 h-4 text-destructive" />
                <p className="text-sm text-muted-foreground">Failed</p>
              </div>
              <p className="text-2xl font-bold text-destructive">{stats.failed}</p>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-accent" />
                <p className="text-sm text-muted-foreground">Success Rate</p>
              </div>
              <p className="text-2xl font-bold text-accent">{stats.successRate}%</p>
            </Card>
          </div>

          {/* Top Commands */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Most Used Commands
            </h2>
            <div className="space-y-3">
              {topCommands.map((cmd, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-muted-foreground w-6">#{idx + 1}</span>
                    <span className="font-mono text-sm">{cmd.command}</span>
                  </div>
                  <span className="text-sm font-medium text-primary">{cmd.count} times</span>
                </div>
              ))}
              {topCommands.length === 0 && !loading && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No commands yet. Start using voice commands!
                </p>
              )}
            </div>
          </Card>

          {/* Recent History */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Recent Commands
            </h2>
            <div className="space-y-2">
              {history.map((item, idx) => (
                <div 
                  key={idx} 
                  className={`p-3 rounded-lg border ${
                    item.success 
                      ? 'border-emerald-500/20 bg-emerald-500/5' 
                      : 'border-destructive/20 bg-destructive/5'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {item.success ? (
                          <CheckCircle className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-destructive" />
                        )}
                        <span className="font-mono text-sm">{item.command}</span>
                      </div>
                      {item.metadata?.matched && (
                        <p className="text-xs text-muted-foreground ml-6">
                          Matched: {item.metadata.matched}
                          {item.metadata.fuzzy && ' (fuzzy)'}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(item.created_at)}
                    </span>
                  </div>
                </div>
              ))}
              {history.length === 0 && !loading && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No command history yet. Start using voice commands to see them here!
                </p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
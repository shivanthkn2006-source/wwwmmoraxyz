import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Download, FileText, Image as ImageIcon, Activity, Calendar, Users, Globe } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface ExportData {
  userInfo: any;
  sessions: any[];
  pageViews: any[];
  activityLog: any[];
  posts: any[];
  messages: any[];
  stats: any;
}

export const ComprehensiveActivityExport = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const fetchAllUserData = async (): Promise<ExportData | null> => {
    if (!user) return null;

    try {
      // Fetch user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      // Fetch sessions
      const { data: sessions } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('started_at', { ascending: false });

      // Fetch page views
      const { data: pageViews } = await supabase
        .from('page_views')
        .select('*')
        .eq('user_id', user.id)
        .order('entered_at', { ascending: false });

      // Fetch activity log
      const { data: activityLog } = await supabase
        .from('user_activity_log')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // Fetch posts
      const { data: posts } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // Fetch messages
      const { data: messages } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      // Calculate statistics
      const stats = {
        totalSessions: sessions?.length || 0,
        totalPageViews: pageViews?.length || 0,
        totalActivityLogs: activityLog?.length || 0,
        totalPosts: posts?.length || 0,
        totalMessages: messages?.length || 0,
        accountCreated: profile?.created_at,
        lastActivity: sessions?.[0]?.last_activity_at,
      };

      return {
        userInfo: profile,
        sessions: sessions || [],
        pageViews: pageViews || [],
        activityLog: activityLog || [],
        posts: posts || [],
        messages: messages || [],
        stats,
      };
    } catch (error) {
      console.error('Error fetching user data:', error);
      return null;
    }
  };

  const generateHTMLReport = (data: ExportData): string => {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Comprehensive Activity Report - ${data.userInfo?.display_name}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
            color: #333;
        }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); overflow: hidden; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; text-align: center; }
        .header h1 { font-size: 36px; margin-bottom: 10px; }
        .header p { font-size: 18px; opacity: 0.9; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; padding: 30px; background: #f8f9fa; }
        .stat-card { background: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center; }
        .stat-card h3 { font-size: 32px; color: #667eea; margin-bottom: 8px; }
        .stat-card p { color: #666; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; }
        .section { padding: 30px; border-bottom: 1px solid #e0e0e0; }
        .section:last-child { border-bottom: none; }
        .section h2 { font-size: 24px; margin-bottom: 20px; color: #333; display: flex; align-items: center; gap: 10px; }
        .section h2::before { content: ''; width: 4px; height: 24px; background: #667eea; border-radius: 2px; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th { background: #f8f9fa; padding: 12px; text-align: left; font-weight: 600; color: #555; border-bottom: 2px solid #667eea; }
        td { padding: 12px; border-bottom: 1px solid #e0e0e0; }
        tr:hover { background: #f8f9fa; }
        .badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; }
        .badge-success { background: #d4edda; color: #155724; }
        .badge-info { background: #d1ecf1; color: #0c5460; }
        .badge-warning { background: #fff3cd; color: #856404; }
        .footer { background: #f8f9fa; padding: 30px; text-align: center; color: #666; font-size: 14px; }
        .profile-section { display: flex; gap: 20px; align-items: center; background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%); padding: 20px; border-radius: 12px; margin-bottom: 20px; }
        .profile-avatar { width: 80px; height: 80px; border-radius: 50%; background: #667eea; display: flex; align-items: center; justify-content: center; color: white; font-size: 32px; font-weight: bold; }
        .profile-info h3 { font-size: 20px; margin-bottom: 5px; }
        .profile-info p { color: #666; font-size: 14px; }
        @media print {
            body { background: white; padding: 0; }
            .container { box-shadow: none; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 Comprehensive Activity Report</h1>
            <p>Generated on ${format(new Date(), 'MMMM dd, yyyy - HH:mm:ss')}</p>
        </div>

        <div class="section">
            <div class="profile-section">
                <div class="profile-avatar">${data.userInfo?.display_name?.charAt(0) || 'U'}</div>
                <div class="profile-info">
                    <h3>${data.userInfo?.display_name || 'Unknown User'}</h3>
                    <p>@${data.userInfo?.username || 'unknown'}</p>
                    <p>Account created: ${data.stats.accountCreated ? format(new Date(data.stats.accountCreated), 'MMM dd, yyyy') : 'N/A'}</p>
                    ${data.userInfo?.bio ? `<p style="margin-top: 8px; font-style: italic;">${data.userInfo.bio}</p>` : ''}
                </div>
            </div>
        </div>

        <div class="stats-grid">
            <div class="stat-card">
                <h3>${data.stats.totalSessions}</h3>
                <p>Total Sessions</p>
            </div>
            <div class="stat-card">
                <h3>${data.stats.totalPageViews}</h3>
                <p>Page Views</p>
            </div>
            <div class="stat-card">
                <h3>${data.stats.totalActivityLogs}</h3>
                <p>Activity Logs</p>
            </div>
            <div class="stat-card">
                <h3>${data.stats.totalPosts}</h3>
                <p>Posts Created</p>
            </div>
            <div class="stat-card">
                <h3>${data.stats.totalMessages}</h3>
                <p>Messages</p>
            </div>
        </div>

        <div class="section">
            <h2>🖥️ Recent Sessions</h2>
            <table>
                <thead>
                    <tr>
                        <th>Device</th>
                        <th>Browser</th>
                        <th>Location</th>
                        <th>Started</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.sessions.slice(0, 20).map(session => `
                        <tr>
                            <td>${session.device_type || 'Unknown'} - ${session.os || 'Unknown'}</td>
                            <td>${session.browser || 'Unknown'}</td>
                            <td>${session.city || 'Unknown'}, ${session.country || 'Unknown'}</td>
                            <td>${format(new Date(session.started_at), 'MMM dd, HH:mm')}</td>
                            <td><span class="badge ${session.is_active ? 'badge-success' : 'badge-info'}">${session.is_active ? 'Active' : 'Ended'}</span></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <div class="section">
            <h2>📄 Page Views Analytics</h2>
            <table>
                <thead>
                    <tr>
                        <th>Page Path</th>
                        <th>Title</th>
                        <th>Time Spent</th>
                        <th>Visited</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.pageViews.slice(0, 20).map(pv => `
                        <tr>
                            <td><code>${pv.page_path}</code></td>
                            <td>${pv.page_title || 'N/A'}</td>
                            <td>${pv.duration_seconds ? `${Math.floor(pv.duration_seconds / 60)}m ${pv.duration_seconds % 60}s` : 'N/A'}</td>
                            <td>${format(new Date(pv.entered_at), 'MMM dd, HH:mm')}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <div class="section">
            <h2>⚡ Activity Timeline</h2>
            <table>
                <thead>
                    <tr>
                        <th>Activity Type</th>
                        <th>Page</th>
                        <th>Timestamp</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.activityLog.slice(0, 30).map(log => `
                        <tr>
                            <td><span class="badge badge-warning">${log.activity_type}</span></td>
                            <td><code>${log.page_path || 'N/A'}</code></td>
                            <td>${format(new Date(log.created_at), 'MMM dd, yyyy HH:mm:ss')}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <div class="section">
            <h2>📝 Content Summary</h2>
            <p style="margin-bottom: 15px;">Total posts created: <strong>${data.stats.totalPosts}</strong></p>
            <p>Total messages exchanged: <strong>${data.stats.totalMessages}</strong></p>
        </div>

        <div class="footer">
            <p><strong>Confidential User Activity Report</strong></p>
            <p>This report contains sensitive personal data. Keep it secure and do not share without authorization.</p>
            <p style="margin-top: 10px; font-size: 12px; opacity: 0.7;">Generated by Activity Tracking System v2.0</p>
        </div>
    </div>
</body>
</html>
    `;
  };

  const generateJSONReport = (data: ExportData): string => {
    return JSON.stringify(data, null, 2);
  };

  const downloadReport = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportHTML = async () => {
    setLoading(true);
    try {
      const data = await fetchAllUserData();
      if (!data) {
        toast.error('Failed to fetch activity data');
        return;
      }

      const html = generateHTMLReport(data);
      const filename = `activity-report-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.html`;
      downloadReport(html, filename, 'text/html');
      
      toast.success('HTML report downloaded successfully!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export report');
    } finally {
      setLoading(false);
    }
  };

  const handleExportJSON = async () => {
    setLoading(true);
    try {
      const data = await fetchAllUserData();
      if (!data) {
        toast.error('Failed to fetch activity data');
        return;
      }

      const json = generateJSONReport(data);
      const filename = `activity-data-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.json`;
      downloadReport(json, filename, 'application/json');
      
      toast.success('JSON data downloaded successfully!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data');
    } finally {
      setLoading(false);
    }
  };

  const handleExportImages = async () => {
    setLoading(true);
    try {
      const { data: posts } = await supabase
        .from('posts')
        .select('media_url, media_type, created_at')
        .eq('user_id', user?.id)
        .eq('media_type', 'image')
        .not('media_url', 'is', null);

      if (!posts || posts.length === 0) {
        toast.info('No images found to download');
        return;
      }

      toast.success(`Found ${posts.length} images! Starting download...`);

      // Download each image
      for (const post of posts) {
        if (post.media_url) {
          try {
            const response = await fetch(post.media_url);
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `image-${format(new Date(post.created_at), 'yyyy-MM-dd-HHmmss')}.jpg`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            await new Promise(resolve => setTimeout(resolve, 500)); // Delay between downloads
          } catch (err) {
            console.error('Failed to download image:', err);
          }
        }
      }

      toast.success('Images downloaded successfully!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export images');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" />
            Comprehensive Activity Export
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Download your complete activity history for offline viewing
          </p>
        </div>
        <Badge variant="secondary" className="flex items-center gap-1">
          <Activity className="w-3 h-3" />
          Export Center
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-primary/10 rounded-lg">
              <FileText className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">HTML Report</h3>
              <p className="text-xs text-muted-foreground">Interactive web page</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Beautiful, formatted report with all your activity data, viewable in any browser.
          </p>
          <Button 
            onClick={handleExportHTML}
            disabled={loading}
            className="w-full"
            variant="default"
          >
            <Download className="w-4 h-4 mr-2" />
            Download HTML
          </Button>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-accent/10 rounded-lg">
              <Activity className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">JSON Data</h3>
              <p className="text-xs text-muted-foreground">Raw structured data</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Complete raw data in JSON format for analysis, backup, or data portability.
          </p>
          <Button 
            onClick={handleExportJSON}
            disabled={loading}
            className="w-full"
            variant="secondary"
          >
            <Download className="w-4 h-4 mr-2" />
            Download JSON
          </Button>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-secondary/10 to-secondary/5 border-secondary/20">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-secondary/10 rounded-lg">
              <ImageIcon className="w-6 h-6 text-secondary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Images Archive</h3>
              <p className="text-xs text-muted-foreground">All your uploaded images</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Download all images you've uploaded to posts for offline backup and storage.
          </p>
          <Button 
            onClick={handleExportImages}
            disabled={loading}
            className="w-full"
            variant="outline"
          >
            <Download className="w-4 h-4 mr-2" />
            Download Images
          </Button>
        </Card>
      </div>

      <div className="bg-muted/50 rounded-lg p-4 space-y-2">
        <h4 className="font-semibold text-sm flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          What's Included in Reports
        </h4>
        <ul className="text-sm text-muted-foreground space-y-1 ml-6 list-disc">
          <li>Complete session history with device & location data</li>
          <li>Page view analytics with time spent on each page</li>
          <li>Activity timeline of all your actions</li>
          <li>Posts and messages summary statistics</li>
          <li>Comprehensive user profile information</li>
        </ul>
      </div>

      <div className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <Globe className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
        <div className="text-sm">
          <p className="font-semibold text-foreground mb-1">Privacy Notice</p>
          <p className="text-muted-foreground">
            These reports contain your personal activity data. Keep downloaded files secure and do not share them without considering privacy implications.
          </p>
        </div>
      </div>
    </Card>
  );
};
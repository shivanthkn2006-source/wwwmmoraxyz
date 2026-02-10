// ═══════════════════════════════════════════════════════════════════════════════
// VISITOR INTELLIGENCE PANEL - Real-time IP, Location, Hardware Tracking
// Admin-only access for @moksh50, @shivanth_kn
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { 
  Globe, 
  Smartphone, 
  Monitor, 
  MapPin, 
  Clock, 
  RefreshCw, 
  User, 
  Wifi,
  Shield,
  Eye,
  Activity,
  Cpu,
  HardDrive
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface VisitorSession {
  id: string;
  user_id: string | null;
  ip_address: string | null;
  city: string | null;
  country: string | null;
  region: string | null;
  latitude: number | null;
  longitude: number | null;
  timezone: string | null;
  browser: string | null;
  browser_version: string | null;
  os: string | null;
  os_version: string | null;
  device_type: string | null;
  device_model: string | null;
  device_vendor: string | null;
  user_agent: string | null;
  is_active: boolean;
  started_at: string;
  ended_at: string | null;
  last_activity_at: string | null;
  // Joined profile data
  username?: string | null;
  display_name?: string | null;
  profile_photo_url?: string | null;
}

interface CountryStats {
  country: string;
  count: number;
  cities: string[];
}

const VisitorIntelligencePanel = () => {
  const [sessions, setSessions] = useState<VisitorSession[]>([]);
  const [countryStats, setCountryStats] = useState<CountryStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSession, setSelectedSession] = useState<VisitorSession | null>(null);

  const fetchVisitorData = useCallback(async () => {
    setRefreshing(true);
    try {
      // Fetch sessions with profile data
      const { data: sessionsData, error: sessionsError } = await supabase
        .from("user_sessions")
        .select(`
          *,
          profiles:user_id (
            username,
            display_name,
            profile_photo_url
          )
        `)
        .order("started_at", { ascending: false })
        .limit(100);

      if (sessionsError) {
        console.error("[VisitorIntel] Sessions fetch error:", sessionsError);
      }

      // Transform data to flatten profile info
      const transformedSessions: VisitorSession[] = (sessionsData || []).map((s: any) => ({
        ...s,
        username: s.profiles?.username || null,
        display_name: s.profiles?.display_name || null,
        profile_photo_url: s.profiles?.profile_photo_url || null,
      }));

      setSessions(transformedSessions);

      // Calculate country stats
      const countryMap = new Map<string, { count: number; cities: Set<string> }>();
      transformedSessions.forEach((s) => {
        const country = s.country || "Unknown";
        const city = s.city || "Unknown";
        if (!countryMap.has(country)) {
          countryMap.set(country, { count: 0, cities: new Set() });
        }
        const entry = countryMap.get(country)!;
        entry.count++;
        entry.cities.add(city);
      });

      const stats: CountryStats[] = Array.from(countryMap.entries())
        .map(([country, data]) => ({
          country,
          count: data.count,
          cities: Array.from(data.cities),
        }))
        .sort((a, b) => b.count - a.count);

      setCountryStats(stats);
    } catch (err) {
      console.error("[VisitorIntel] Fetch error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchVisitorData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchVisitorData, 30000);
    return () => clearInterval(interval);
  }, [fetchVisitorData]);

  const getDeviceIcon = (deviceType: string | null) => {
    switch (deviceType?.toLowerCase()) {
      case "mobile":
        return <Smartphone className="w-4 h-4" />;
      case "tablet":
        return <Smartphone className="w-5 h-5" />;
      default:
        return <Monitor className="w-4 h-4" />;
    }
  };

  const activeSessions = sessions.filter((s) => s.is_active);
  const recentSessions = sessions.slice(0, 20);

  if (loading) {
    return (
      <Card className="bg-card/50 border-border backdrop-blur-xl p-8">
        <div className="flex items-center justify-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-primary" />
          <span className="font-mono text-muted-foreground">Loading visitor intelligence...</span>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card/50 border-border backdrop-blur-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/20">
              <Activity className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-mono">ACTIVE NOW</p>
              <p className="text-2xl font-bold text-emerald-400">{activeSessions.length}</p>
            </div>
          </div>
        </Card>

        <Card className="bg-card/50 border-border backdrop-blur-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <Eye className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-mono">TOTAL SESSIONS</p>
              <p className="text-2xl font-bold text-primary">{sessions.length}</p>
            </div>
          </div>
        </Card>

        <Card className="bg-card/50 border-border backdrop-blur-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20">
              <Globe className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-mono">COUNTRIES</p>
              <p className="text-2xl font-bold text-amber-400">{countryStats.length}</p>
            </div>
          </div>
        </Card>

        <Card className="bg-card/50 border-border backdrop-blur-xl p-4">
          <Button
            onClick={fetchVisitorData}
            disabled={refreshing}
            variant="outline"
            className="w-full h-full flex items-center justify-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Refreshing..." : "Refresh Data"}
          </Button>
        </Card>
      </div>

      {/* Country Breakdown */}
      <Card className="bg-card/50 border-border backdrop-blur-xl">
        <div className="p-4 border-b border-border">
          <h3 className="font-mono text-primary flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Geographic Distribution
          </h3>
        </div>
        <div className="p-4">
          <div className="flex flex-wrap gap-2">
            {countryStats.map((stat) => (
              <Badge
                key={stat.country}
                variant="outline"
                className="px-3 py-2 flex items-center gap-2 bg-card/50"
              >
                <span className="font-mono">{stat.country}</span>
                <span className="px-1.5 py-0.5 rounded bg-primary/20 text-primary text-xs font-bold">
                  {stat.count}
                </span>
              </Badge>
            ))}
          </div>
        </div>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid grid-cols-3 w-full bg-card border border-border">
          <TabsTrigger value="active" className="font-mono">
            <Activity className="w-4 h-4 mr-2" />
            Active ({activeSessions.length})
          </TabsTrigger>
          <TabsTrigger value="recent" className="font-mono">
            <Clock className="w-4 h-4 mr-2" />
            Recent
          </TabsTrigger>
          <TabsTrigger value="details" className="font-mono">
            <Shield className="w-4 h-4 mr-2" />
            Session Details
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4">
          <Card className="bg-card/50 border-border">
            <ScrollArea className="h-[500px]">
              <div className="p-4 space-y-3">
                {activeSessions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground font-mono">
                    No active sessions at the moment
                  </div>
                ) : (
                  activeSessions.map((session) => (
                    <SessionCard
                      key={session.id}
                      session={session}
                      onSelect={() => setSelectedSession(session)}
                      isSelected={selectedSession?.id === session.id}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          </Card>
        </TabsContent>

        <TabsContent value="recent" className="mt-4">
          <Card className="bg-card/50 border-border">
            <ScrollArea className="h-[500px]">
              <div className="p-4 space-y-3">
                {recentSessions.map((session) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    onSelect={() => setSelectedSession(session)}
                    isSelected={selectedSession?.id === session.id}
                  />
                ))}
              </div>
            </ScrollArea>
          </Card>
        </TabsContent>

        <TabsContent value="details" className="mt-4">
          {selectedSession ? (
            <SessionDetailsCard session={selectedSession} />
          ) : (
            <Card className="bg-card/50 border-border p-8">
              <div className="text-center text-muted-foreground font-mono">
                Select a session from Active or Recent tabs to view full details
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Session Card Component
interface SessionCardProps {
  session: VisitorSession;
  onSelect: () => void;
  isSelected: boolean;
}

const SessionCard = ({ session, onSelect, isSelected }: SessionCardProps) => {
  const getDeviceIcon = (deviceType: string | null) => {
    switch (deviceType?.toLowerCase()) {
      case "mobile":
        return <Smartphone className="w-4 h-4" />;
      default:
        return <Monitor className="w-4 h-4" />;
    }
  };

  return (
    <div
      onClick={onSelect}
      className={`p-4 rounded-lg border cursor-pointer transition-all ${
        isSelected
          ? "border-primary bg-primary/10"
          : "border-border bg-card/30 hover:border-primary/50 hover:bg-card/50"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          {/* User Avatar or Icon */}
          <div className="p-2 rounded-full bg-muted">
            {session.profile_photo_url ? (
              <img
                src={session.profile_photo_url}
                alt=""
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <User className="w-4 h-4 text-muted-foreground" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            {/* Username or Anonymous */}
            <div className="flex items-center gap-2">
              <span className="font-mono font-medium truncate">
                {session.username ? `@${session.username}` : "Anonymous Visitor"}
              </span>
              {session.is_active && (
                <Badge variant="outline" className="bg-emerald-500/20 text-emerald-400 text-xs">
                  LIVE
                </Badge>
              )}
            </div>

            {/* Location */}
            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
              <MapPin className="w-3 h-3" />
              <span className="font-mono">
                {session.city || "Unknown"}, {session.country || "Unknown"}
              </span>
            </div>

            {/* Device & Browser */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
              <span className="flex items-center gap-1">
                {getDeviceIcon(session.device_type)}
                {session.device_type || "Unknown"}
              </span>
              <span className="font-mono">{session.browser}</span>
              <span className="font-mono">{session.os}</span>
            </div>
          </div>
        </div>

        {/* Time Info */}
        <div className="text-right text-xs text-muted-foreground font-mono shrink-0">
          <div>{formatDistanceToNow(new Date(session.started_at), { addSuffix: true })}</div>
          {session.ip_address && (
            <div className="flex items-center gap-1 mt-1 text-primary/70">
              <Wifi className="w-3 h-3" />
              <span className="truncate max-w-[120px]">{session.ip_address}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Session Details Card
const SessionDetailsCard = ({ session }: { session: VisitorSession }) => {
  return (
    <Card className="bg-card/50 border-border">
      <div className="p-4 border-b border-border">
        <h3 className="font-mono text-primary flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Full Session Intelligence
        </h3>
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* User Identity */}
        <div className="space-y-4">
          <h4 className="font-mono text-sm text-muted-foreground uppercase tracking-wider">
            User Identity
          </h4>
          <div className="space-y-3">
            <DetailRow icon={User} label="Username" value={session.username ? `@${session.username}` : "Anonymous"} />
            <DetailRow icon={Shield} label="User ID" value={session.user_id || "Not Authenticated"} mono />
            <DetailRow icon={Activity} label="Status" value={session.is_active ? "🟢 ACTIVE" : "⚪ INACTIVE"} />
          </div>
        </div>

        {/* Network Info */}
        <div className="space-y-4">
          <h4 className="font-mono text-sm text-muted-foreground uppercase tracking-wider">
            Network Information
          </h4>
          <div className="space-y-3">
            <DetailRow icon={Wifi} label="IP Address" value={session.ip_address || "Unknown"} mono highlight />
            <DetailRow icon={Globe} label="Country" value={session.country || "Unknown"} />
            <DetailRow icon={MapPin} label="City" value={session.city || "Unknown"} />
            <DetailRow icon={MapPin} label="Region" value={session.region || "Unknown"} />
            <DetailRow icon={Clock} label="Timezone" value={session.timezone || "Unknown"} />
          </div>
        </div>

        {/* Device Info */}
        <div className="space-y-4">
          <h4 className="font-mono text-sm text-muted-foreground uppercase tracking-wider">
            Device Hardware
          </h4>
          <div className="space-y-3">
            <DetailRow icon={Monitor} label="Device Type" value={session.device_type || "Unknown"} />
            <DetailRow icon={Smartphone} label="Device Model" value={session.device_model || "Unknown"} />
            <DetailRow icon={HardDrive} label="Device Vendor" value={session.device_vendor || "Unknown"} />
            <DetailRow icon={Cpu} label="OS" value={`${session.os || "Unknown"} ${session.os_version || ""}`} />
          </div>
        </div>

        {/* Browser Info */}
        <div className="space-y-4">
          <h4 className="font-mono text-sm text-muted-foreground uppercase tracking-wider">
            Browser Details
          </h4>
          <div className="space-y-3">
            <DetailRow icon={Globe} label="Browser" value={`${session.browser || "Unknown"} ${session.browser_version || ""}`} />
            <DetailRow icon={Clock} label="Session Started" value={format(new Date(session.started_at), "PPpp")} />
            <DetailRow icon={Clock} label="Last Activity" value={session.last_activity_at ? format(new Date(session.last_activity_at), "PPpp") : "N/A"} />
          </div>
        </div>

        {/* Coordinates */}
        {(session.latitude && session.longitude) && (
          <div className="md:col-span-2 space-y-4">
            <h4 className="font-mono text-sm text-muted-foreground uppercase tracking-wider">
              Geo Coordinates
            </h4>
            <div className="p-4 bg-muted/30 rounded-lg font-mono text-sm">
              <span className="text-primary">LAT:</span> {session.latitude?.toFixed(4)} | 
              <span className="text-primary ml-2">LNG:</span> {session.longitude?.toFixed(4)}
            </div>
          </div>
        )}

        {/* Full User Agent */}
        <div className="md:col-span-2 space-y-4">
          <h4 className="font-mono text-sm text-muted-foreground uppercase tracking-wider">
            Raw User Agent
          </h4>
          <div className="p-4 bg-muted/30 rounded-lg font-mono text-xs break-all">
            {session.user_agent || "Not available"}
          </div>
        </div>
      </div>
    </Card>
  );
};

// Detail Row Component
interface DetailRowProps {
  icon: React.ElementType;
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
}

const DetailRow = ({ icon: Icon, label, value, mono, highlight }: DetailRowProps) => (
  <div className="flex items-start gap-3">
    <Icon className={`w-4 h-4 mt-0.5 ${highlight ? "text-primary" : "text-muted-foreground"}`} />
    <div className="flex-1">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-sm ${mono ? "font-mono" : ""} ${highlight ? "text-primary font-medium" : ""}`}>
        {value}
      </div>
    </div>
  </div>
);

export default VisitorIntelligencePanel;

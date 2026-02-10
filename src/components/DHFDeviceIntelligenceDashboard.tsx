// ═══════════════════════════════════════════════════════════════════════════════
// DHF DEVICE INTELLIGENCE DASHBOARD - Deep System & Location Analytics
// Admin-only comprehensive device/location tracking with Zoe Sovereign AI integration
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Wifi, Router, Cpu, HardDrive, Monitor, Smartphone, Tablet,
  Camera, Mic, Battery, Signal, Globe, Shield, Lock, Fingerprint,
  Activity, Zap, RefreshCw, Download, Eye, Satellite, Radio,
  Server, Database, Network, Gauge, Thermometer, AlertTriangle,
  CheckCircle2, XCircle, Clock, Navigation, Building2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

interface LocationIntelligence {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  altitude: number | null;
  altitudeAccuracy: number | null;
  heading: number | null;
  speed: number | null;
  timestamp: number;
  source: 'gps' | 'wifi' | 'ip' | 'cell' | 'hybrid';
  confidence: number;
  city?: string;
  region?: string;
  country?: string;
  countryCode?: string;
  timezone?: string;
  isp?: string;
  org?: string;
  asn?: string;
  proxy?: boolean;
  vpn?: boolean;
  tor?: boolean;
  hosting?: boolean;
}

interface NetworkIntelligence {
  type: string;
  effectiveType: string;
  downlink: number;
  rtt: number;
  saveData: boolean;
  ipAddress?: string;
  ipv6Address?: string;
  connectionType: 'wifi' | 'cellular' | 'ethernet' | 'bluetooth' | 'unknown';
  carrier?: string;
  signalStrength?: number;
  frequency?: string;
  ssid?: string;
  bssid?: string;
}

interface DeviceIntelligence {
  platform: string;
  userAgent: string;
  vendor: string;
  appVersion: string;
  deviceType: 'desktop' | 'tablet' | 'mobile' | 'tv' | 'unknown';
  screenResolution: string;
  colorDepth: number;
  pixelRatio: number;
  orientation: string;
  touchPoints: number;
  memory: number | null;
  hardwareConcurrency: number;
  language: string;
  languages: string[];
  timezone: string;
  timezoneOffset: number;
}

interface HardwareIntelligence {
  gpu: string;
  gpuVendor: string;
  audioContext: string;
  mediaDevices: {
    cameras: number;
    microphones: number;
    speakers: number;
  };
  batteryLevel: number | null;
  batteryCharging: boolean | null;
  batteryChargingTime: number | null;
  batteryDischargingTime: number | null;
  sensors: {
    accelerometer: boolean;
    gyroscope: boolean;
    magnetometer: boolean;
    ambient_light: boolean;
    proximity: boolean;
  };
}

interface SecurityIntelligence {
  fingerprintHash: string;
  sessionId: string;
  cookiesEnabled: boolean;
  doNotTrack: boolean;
  adBlocker: boolean;
  incognito: boolean;
  webRTCLeaks: boolean;
  canvasFingerprint: string;
  webglFingerprint: string;
  audioFingerprint: string;
  fontFingerprint: string;
  pluginList: string[];
}

interface DHFDeviceData {
  location: LocationIntelligence;
  network: NetworkIntelligence;
  device: DeviceIntelligence;
  hardware: HardwareIntelligence;
  security: SecurityIntelligence;
  timestamp: string;
  syncedToZoe: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

const generateFingerprint = async (data: string): Promise<string> => {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
};

const getDeviceType = (userAgent: string): 'desktop' | 'tablet' | 'mobile' | 'tv' | 'unknown' => {
  if (/mobile/i.test(userAgent)) return 'mobile';
  if (/tablet|ipad/i.test(userAgent)) return 'tablet';
  if (/smart-tv|smarttv|googletv|appletv|hbbtv|pov_tv|netcast/i.test(userAgent)) return 'tv';
  if (/windows|macintosh|linux/i.test(userAgent)) return 'desktop';
  return 'unknown';
};

const getWebGLInfo = (): { renderer: string; vendor: string } => {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') as WebGLRenderingContext;
    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        return {
          renderer: gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL),
          vendor: gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL),
        };
      }
    }
  } catch (e) {
    console.log('[DHF-Intel] WebGL info unavailable');
  }
  return { renderer: 'Unknown', vendor: 'Unknown' };
};

const getCanvasFingerprint = (): string => {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = '#069';
      ctx.fillText('DHF-Intel', 2, 15);
      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
      ctx.fillText('DHF-Intel', 4, 17);
      return canvas.toDataURL().slice(-32);
    }
  } catch (e) {
    console.log('[DHF-Intel] Canvas fingerprint unavailable');
  }
  return 'unavailable';
};

// ═══════════════════════════════════════════════════════════════════════════════
// DATA COLLECTION HOOK
// ═══════════════════════════════════════════════════════════════════════════════

const useDeviceIntelligence = () => {
  const [data, setData] = useState<DHFDeviceData | null>(null);
  const [isCollecting, setIsCollecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const collectData = useCallback(async () => {
    setIsCollecting(true);
    setError(null);

    try {
      // Collect location data
      let locationData: LocationIntelligence = {
        latitude: null,
        longitude: null,
        accuracy: null,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
        timestamp: Date.now(),
        source: 'ip',
        confidence: 0,
      };

      // Try browser geolocation first (most accurate)
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          });
        });

        locationData = {
          ...locationData,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude,
          altitudeAccuracy: position.coords.altitudeAccuracy,
          heading: position.coords.heading,
          speed: position.coords.speed,
          timestamp: position.timestamp,
          source: position.coords.accuracy && position.coords.accuracy < 100 ? 'gps' : 'hybrid',
          confidence: Math.min(100, Math.max(0, 100 - (position.coords.accuracy || 100) / 10)),
        };
      } catch (geoError) {
        console.log('[DHF-Intel] Geolocation unavailable, using IP fallback');
      }

      // Fallback/supplement with IP geolocation
      try {
        const ipResponse = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(5000) });
        const ipData = await ipResponse.json();
        
        if (!locationData.latitude) {
          locationData.latitude = ipData.latitude;
          locationData.longitude = ipData.longitude;
          locationData.confidence = 30; // IP-based is less accurate
        }
        
        locationData.city = ipData.city;
        locationData.region = ipData.region;
        locationData.country = ipData.country_name;
        locationData.countryCode = ipData.country_code;
        locationData.timezone = ipData.timezone;
        locationData.isp = ipData.org;
        locationData.asn = ipData.asn;
      } catch (ipError) {
        console.log('[DHF-Intel] IP geolocation unavailable');
      }

      // Collect network data
      const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      const networkData: NetworkIntelligence = {
        type: connection?.type || 'unknown',
        effectiveType: connection?.effectiveType || 'unknown',
        downlink: connection?.downlink || 0,
        rtt: connection?.rtt || 0,
        saveData: connection?.saveData || false,
        connectionType: connection?.type === 'wifi' ? 'wifi' : 
                       connection?.type === 'cellular' ? 'cellular' : 
                       connection?.type === 'ethernet' ? 'ethernet' : 'unknown',
      };

      // Collect device data
      const deviceData: DeviceIntelligence = {
        platform: navigator.platform,
        userAgent: navigator.userAgent,
        vendor: navigator.vendor,
        appVersion: navigator.appVersion,
        deviceType: getDeviceType(navigator.userAgent),
        screenResolution: `${screen.width}x${screen.height}`,
        colorDepth: screen.colorDepth,
        pixelRatio: window.devicePixelRatio,
        orientation: screen.orientation?.type || 'unknown',
        touchPoints: navigator.maxTouchPoints,
        memory: (navigator as any).deviceMemory || null,
        hardwareConcurrency: navigator.hardwareConcurrency,
        language: navigator.language,
        languages: [...navigator.languages],
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        timezoneOffset: new Date().getTimezoneOffset(),
      };

      // Collect hardware data
      const webglInfo = getWebGLInfo();
      let batteryInfo = { level: null as number | null, charging: null as boolean | null, chargingTime: null as number | null, dischargingTime: null as number | null };
      
      try {
        const battery = await (navigator as any).getBattery?.();
        if (battery) {
          batteryInfo = {
            level: battery.level * 100,
            charging: battery.charging,
            chargingTime: battery.chargingTime,
            dischargingTime: battery.dischargingTime,
          };
        }
      } catch (e) {
        console.log('[DHF-Intel] Battery API unavailable');
      }

      let mediaDevices = { cameras: 0, microphones: 0, speakers: 0 };
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        mediaDevices = {
          cameras: devices.filter(d => d.kind === 'videoinput').length,
          microphones: devices.filter(d => d.kind === 'audioinput').length,
          speakers: devices.filter(d => d.kind === 'audiooutput').length,
        };
      } catch (e) {
        console.log('[DHF-Intel] Media devices unavailable');
      }

      const hardwareData: HardwareIntelligence = {
        gpu: webglInfo.renderer,
        gpuVendor: webglInfo.vendor,
        audioContext: typeof AudioContext !== 'undefined' ? 'supported' : 'unsupported',
        mediaDevices,
        batteryLevel: batteryInfo.level,
        batteryCharging: batteryInfo.charging,
        batteryChargingTime: batteryInfo.chargingTime,
        batteryDischargingTime: batteryInfo.dischargingTime,
        sensors: {
          accelerometer: 'Accelerometer' in window,
          gyroscope: 'Gyroscope' in window,
          magnetometer: 'Magnetometer' in window,
          ambient_light: 'AmbientLightSensor' in window,
          proximity: 'ProximitySensor' in window,
        },
      };

      // Collect security data
      const canvasFingerprint = getCanvasFingerprint();
      const fingerprintData = `${deviceData.userAgent}${deviceData.screenResolution}${webglInfo.renderer}${canvasFingerprint}`;
      const fingerprintHash = await generateFingerprint(fingerprintData);

      const securityData: SecurityIntelligence = {
        fingerprintHash,
        sessionId: crypto.randomUUID(),
        cookiesEnabled: navigator.cookieEnabled,
        doNotTrack: navigator.doNotTrack === '1',
        adBlocker: false, // Would need additional detection
        incognito: false, // Complex detection required
        webRTCLeaks: false, // Would need WebRTC detection
        canvasFingerprint,
        webglFingerprint: webglInfo.renderer.slice(0, 32),
        audioFingerprint: 'collected',
        fontFingerprint: 'collected',
        pluginList: Array.from(navigator.plugins || []).map(p => p.name),
      };

      const fullData: DHFDeviceData = {
        location: locationData,
        network: networkData,
        device: deviceData,
        hardware: hardwareData,
        security: securityData,
        timestamp: new Date().toISOString(),
        syncedToZoe: false,
      };

      setData(fullData);
      return fullData;

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to collect device data';
      setError(errorMsg);
      console.error('[DHF-Intel] Collection error:', err);
      return null;
    } finally {
      setIsCollecting(false);
    }
  }, []);

  return { data, isCollecting, error, collectData };
};

// ═══════════════════════════════════════════════════════════════════════════════
// METRIC CARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

const MetricCard: React.FC<{
  icon: React.ElementType;
  label: string;
  value: string | number | null;
  subValue?: string;
  status?: 'good' | 'warning' | 'error' | 'info';
}> = ({ icon: Icon, label, value, subValue, status = 'info' }) => {
  const statusColors = {
    good: 'text-emerald-400 border-emerald-500/30',
    warning: 'text-amber-400 border-amber-500/30',
    error: 'text-red-400 border-red-500/30',
    info: 'text-cyan-400 border-cyan-500/30',
  };

  return (
    <div className={`p-3 rounded-xl bg-white/5 backdrop-blur-xl border ${statusColors[status]} transition-all hover:bg-white/10`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`h-4 w-4 ${statusColors[status].split(' ')[0]}`} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className="font-mono text-sm font-medium truncate">{value ?? 'N/A'}</div>
      {subValue && <div className="text-xs text-muted-foreground mt-1">{subValue}</div>}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN DASHBOARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export const DHFDeviceIntelligenceDashboard: React.FC = () => {
  const { user } = useAuth();
  const { data, isCollecting, error, collectData } = useDeviceIntelligence();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  // Check admin access
  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) {
        setIsAdmin(false);
        setIsChecking(false);
        return;
      }

      try {
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .maybeSingle();

        if (roleError) throw roleError;
        setIsAdmin(!!roleData);
      } catch (err) {
        console.error('[DHF-Intel] Admin check failed:', err);
        setIsAdmin(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkAdmin();
  }, [user]);

  // Auto-collect on mount for admin
  useEffect(() => {
    if (isAdmin && !data) {
      collectData();
    }
  }, [isAdmin, data, collectData]);

  // Sync data to Zoe Sovereign Memory
  const syncToZoe = async () => {
    if (!data || !user) return;

    try {
      // Log to behavioral events for DHF
      await supabase.from('behavioral_events').insert({
        user_id: user.id,
        event_type: 'dhf_device_intel_sync',
        event_category: 'system',
        context_snippet: JSON.stringify({
          location: data.location.city || 'Unknown',
          device: data.device.deviceType,
          network: data.network.connectionType,
        }),
        metadata: {
          fingerprint: data.security.fingerprintHash,
          confidence: data.location.confidence,
          timestamp: data.timestamp,
        },
      });

      toast.success('Device intelligence synced to Zoe Sovereign DHF');
    } catch (err) {
      console.error('[DHF-Intel] Sync error:', err);
      toast.error('Failed to sync to Zoe');
    }
  };

  // Access denied for non-admins
  if (isChecking) {
    return (
      <Card className="bg-gradient-to-br from-background/80 to-secondary/10 backdrop-blur-xl border-primary/20">
        <CardContent className="py-12 text-center">
          <RefreshCw className="h-8 w-8 mx-auto mb-4 animate-spin text-primary" />
          <p className="text-muted-foreground">Verifying access permissions...</p>
        </CardContent>
      </Card>
    );
  }

  if (!isAdmin) {
    return (
      <Card className="bg-gradient-to-br from-red-950/20 to-background backdrop-blur-xl border-red-500/30">
        <CardContent className="py-12 text-center">
          <Lock className="h-12 w-12 mx-auto mb-4 text-red-500" />
          <h3 className="text-lg font-semibold text-red-400 mb-2">Access Restricted</h3>
          <p className="text-muted-foreground text-sm">
            Device Intelligence Dashboard is restricted to authorized administrators.
          </p>
          <Badge variant="outline" className="mt-4 text-red-400 border-red-500/30">
            Admin Access Required
          </Badge>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-background/90 to-primary/5 backdrop-blur-xl border-primary/20 shadow-2xl shadow-primary/5">
      <CardHeader className="border-b border-primary/10">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Fingerprint className="h-6 w-6 text-primary" />
              Device Intelligence Dashboard
            </CardTitle>
            <CardDescription className="mt-1">
              Deep system analytics • Network intelligence • Zoe Sovereign DHF integration
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={collectData}
              disabled={isCollecting}
              variant="outline"
              size="sm"
              className="border-primary/30 hover:bg-primary/10"
            >
              {isCollecting ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Rescan
            </Button>
            {data && (
              <Button
                onClick={syncToZoe}
                size="sm"
                className="bg-primary/20 hover:bg-primary/30"
              >
                <Database className="h-4 w-4 mr-2" />
                Sync to DHF
              </Button>
            )}
          </div>
        </div>
        {data && (
          <div className="flex items-center gap-2 mt-3">
            <Badge variant="outline" className="text-xs text-emerald-400 border-emerald-500/30">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Data Collected
            </Badge>
            <Badge variant="outline" className="text-xs text-cyan-400 border-cyan-500/30">
              <Clock className="h-3 w-3 mr-1" />
              {new Date(data.timestamp).toLocaleTimeString()}
            </Badge>
            <Badge variant="outline" className="text-xs text-primary border-primary/30">
              <Shield className="h-3 w-3 mr-1" />
              Fingerprint: {data.security.fingerprintHash.slice(0, 8)}...
            </Badge>
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-6">
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            <AlertTriangle className="h-4 w-4 inline mr-2" />
            {error}
          </div>
        )}

        {!data && !isCollecting && (
          <div className="py-12 text-center">
            <Satellite className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">Click "Rescan" to collect device intelligence</p>
          </div>
        )}

        {isCollecting && (
          <div className="py-12 text-center">
            <div className="animate-gpu-spin-2s">
              <Satellite className="h-12 w-12 mx-auto text-primary" />
            </div>
            <p className="text-muted-foreground mt-4">Collecting device intelligence...</p>
            <p className="text-xs text-muted-foreground mt-2">Scanning GPS, network, hardware, sensors...</p>
          </div>
        )}

        {data && (
          <Tabs defaultValue="location" className="w-full">
            <TabsList className="grid w-full grid-cols-5 bg-secondary/20">
              <TabsTrigger value="location" className="data-[state=active]:bg-primary/20">
                <MapPin className="h-4 w-4 mr-2" />
                Location
              </TabsTrigger>
              <TabsTrigger value="network" className="data-[state=active]:bg-primary/20">
                <Wifi className="h-4 w-4 mr-2" />
                Network
              </TabsTrigger>
              <TabsTrigger value="device" className="data-[state=active]:bg-primary/20">
                <Monitor className="h-4 w-4 mr-2" />
                Device
              </TabsTrigger>
              <TabsTrigger value="hardware" className="data-[state=active]:bg-primary/20">
                <Cpu className="h-4 w-4 mr-2" />
                Hardware
              </TabsTrigger>
              <TabsTrigger value="security" className="data-[state=active]:bg-primary/20">
                <Shield className="h-4 w-4 mr-2" />
                Security
              </TabsTrigger>
            </TabsList>

            {/* LOCATION TAB */}
            <TabsContent value="location" className="mt-4">
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {/* Coordinates Card */}
                  <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20">
                    <div className="flex items-center gap-2 mb-3">
                      <Navigation className="h-5 w-5 text-emerald-400" />
                      <h3 className="font-semibold">Precise Location</h3>
                      <Badge className="ml-auto bg-emerald-500/20 text-emerald-400">
                        {data.location.confidence}% Confidence
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <MetricCard icon={MapPin} label="Latitude" value={data.location.latitude?.toFixed(6)} status="good" />
                      <MetricCard icon={MapPin} label="Longitude" value={data.location.longitude?.toFixed(6)} status="good" />
                      <MetricCard icon={Gauge} label="Accuracy" value={data.location.accuracy ? `±${data.location.accuracy.toFixed(0)}m` : 'N/A'} status="info" />
                      <MetricCard icon={Activity} label="Source" value={data.location.source.toUpperCase()} status="info" />
                    </div>
                  </div>

                  {/* Geographic Info */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <MetricCard icon={Building2} label="City" value={data.location.city} status="info" />
                    <MetricCard icon={Globe} label="Region" value={data.location.region} status="info" />
                    <MetricCard icon={Globe} label="Country" value={data.location.country} subValue={data.location.countryCode} status="info" />
                    <MetricCard icon={Clock} label="Timezone" value={data.location.timezone} status="info" />
                    <MetricCard icon={Server} label="ISP" value={data.location.isp} status="info" />
                    <MetricCard icon={Network} label="ASN" value={data.location.asn} status="info" />
                  </div>

                  {/* Movement Data */}
                  {(data.location.speed || data.location.heading || data.location.altitude) && (
                    <div className="grid grid-cols-3 gap-3">
                      <MetricCard 
                        icon={Activity} 
                        label="Speed" 
                        value={data.location.speed ? `${(data.location.speed * 3.6).toFixed(1)} km/h` : 'Stationary'} 
                        status="info" 
                      />
                      <MetricCard 
                        icon={Navigation} 
                        label="Heading" 
                        value={data.location.heading ? `${data.location.heading.toFixed(0)}°` : 'N/A'} 
                        status="info" 
                      />
                      <MetricCard 
                        icon={Thermometer} 
                        label="Altitude" 
                        value={data.location.altitude ? `${data.location.altitude.toFixed(0)}m` : 'N/A'} 
                        status="info" 
                      />
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* NETWORK TAB */}
            <TabsContent value="network" className="mt-4">
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <MetricCard icon={Wifi} label="Connection Type" value={data.network.connectionType} status="good" />
                    <MetricCard icon={Signal} label="Effective Type" value={data.network.effectiveType} status="info" />
                    <MetricCard icon={Zap} label="Downlink" value={`${data.network.downlink} Mbps`} status="info" />
                    <MetricCard icon={Activity} label="RTT (Latency)" value={`${data.network.rtt}ms`} status={data.network.rtt < 100 ? 'good' : 'warning'} />
                    <MetricCard icon={HardDrive} label="Data Saver" value={data.network.saveData ? 'Enabled' : 'Disabled'} status="info" />
                    <MetricCard icon={Radio} label="Network Type" value={data.network.type} status="info" />
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>

            {/* DEVICE TAB */}
            <TabsContent value="device" className="mt-4">
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <MetricCard 
                      icon={data.device.deviceType === 'mobile' ? Smartphone : data.device.deviceType === 'tablet' ? Tablet : Monitor} 
                      label="Device Type" 
                      value={data.device.deviceType} 
                      status="info" 
                    />
                    <MetricCard icon={Monitor} label="Screen" value={data.device.screenResolution} subValue={`${data.device.pixelRatio}x DPR`} status="info" />
                    <MetricCard icon={Globe} label="Platform" value={data.device.platform} status="info" />
                    <MetricCard icon={Cpu} label="CPU Cores" value={data.device.hardwareConcurrency} status="info" />
                    <MetricCard icon={HardDrive} label="Memory" value={data.device.memory ? `${data.device.memory} GB` : 'N/A'} status="info" />
                    <MetricCard icon={Globe} label="Language" value={data.device.language} status="info" />
                    <MetricCard icon={Clock} label="Timezone" value={data.device.timezone} status="info" />
                    <MetricCard icon={Activity} label="Touch Points" value={data.device.touchPoints} status="info" />
                    <MetricCard icon={Monitor} label="Orientation" value={data.device.orientation} status="info" />
                  </div>

                  <Separator className="my-4 bg-primary/10" />

                  <div className="p-3 rounded-lg bg-secondary/20 border border-border/50">
                    <h4 className="text-xs font-medium text-muted-foreground mb-2">User Agent</h4>
                    <p className="text-xs font-mono break-all">{data.device.userAgent}</p>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>

            {/* HARDWARE TAB */}
            <TabsContent value="hardware" className="mt-4">
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {/* GPU */}
                  <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20">
                    <div className="flex items-center gap-2 mb-3">
                      <Cpu className="h-5 w-5 text-purple-400" />
                      <h3 className="font-semibold">Graphics Processor</h3>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-mono">{data.hardware.gpu}</p>
                      <p className="text-xs text-muted-foreground">Vendor: {data.hardware.gpuVendor}</p>
                    </div>
                  </div>

                  {/* Media Devices */}
                  <div className="grid grid-cols-3 gap-3">
                    <MetricCard icon={Camera} label="Cameras" value={data.hardware.mediaDevices.cameras} status={data.hardware.mediaDevices.cameras > 0 ? 'good' : 'info'} />
                    <MetricCard icon={Mic} label="Microphones" value={data.hardware.mediaDevices.microphones} status={data.hardware.mediaDevices.microphones > 0 ? 'good' : 'info'} />
                    <MetricCard icon={Activity} label="Speakers" value={data.hardware.mediaDevices.speakers} status="info" />
                  </div>

                  {/* Battery */}
                  {data.hardware.batteryLevel !== null && (
                    <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20">
                      <div className="flex items-center gap-2 mb-3">
                        <Battery className="h-5 w-5 text-amber-400" />
                        <h3 className="font-semibold">Battery Status</h3>
                        {data.hardware.batteryCharging && (
                          <Badge className="ml-auto bg-emerald-500/20 text-emerald-400">
                            <Zap className="h-3 w-3 mr-1" />
                            Charging
                          </Badge>
                        )}
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>Level</span>
                          <span className="font-mono">{data.hardware.batteryLevel.toFixed(0)}%</span>
                        </div>
                        <Progress value={data.hardware.batteryLevel} className="h-2" />
                      </div>
                    </div>
                  )}

                  {/* Sensors */}
                  <div className="p-4 rounded-xl bg-secondary/20 border border-border/50">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Activity className="h-4 w-4 text-cyan-400" />
                      Device Sensors
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {Object.entries(data.hardware.sensors).map(([sensor, available]) => (
                        <div key={sensor} className="flex items-center gap-2 text-sm">
                          {available ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                          ) : (
                            <XCircle className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className={available ? 'text-foreground' : 'text-muted-foreground'}>
                            {sensor.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>

            {/* SECURITY TAB */}
            <TabsContent value="security" className="mt-4">
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {/* Fingerprint */}
                  <div className="p-4 rounded-xl bg-gradient-to-br from-red-500/10 to-orange-500/10 border border-red-500/20">
                    <div className="flex items-center gap-2 mb-3">
                      <Fingerprint className="h-5 w-5 text-red-400" />
                      <h3 className="font-semibold">Device Fingerprint</h3>
                    </div>
                    <p className="font-mono text-sm break-all">{data.security.fingerprintHash}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Unique identifier generated from device characteristics
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <MetricCard icon={Lock} label="Cookies" value={data.security.cookiesEnabled ? 'Enabled' : 'Disabled'} status={data.security.cookiesEnabled ? 'good' : 'warning'} />
                    <MetricCard icon={Eye} label="Do Not Track" value={data.security.doNotTrack ? 'Enabled' : 'Disabled'} status="info" />
                  </div>

                  {/* Additional Fingerprints */}
                  <div className="space-y-2">
                    <div className="p-3 rounded-lg bg-secondary/20 border border-border/50">
                      <h4 className="text-xs font-medium text-muted-foreground mb-1">Canvas Fingerprint</h4>
                      <p className="text-xs font-mono">{data.security.canvasFingerprint}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-secondary/20 border border-border/50">
                      <h4 className="text-xs font-medium text-muted-foreground mb-1">WebGL Fingerprint</h4>
                      <p className="text-xs font-mono">{data.security.webglFingerprint}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-secondary/20 border border-border/50">
                      <h4 className="text-xs font-medium text-muted-foreground mb-1">Session ID</h4>
                      <p className="text-xs font-mono">{data.security.sessionId}</p>
                    </div>
                  </div>

                  {/* Plugins */}
                  {data.security.pluginList.length > 0 && (
                    <div className="p-4 rounded-xl bg-secondary/20 border border-border/50">
                      <h3 className="font-semibold mb-3">Browser Plugins ({data.security.pluginList.length})</h3>
                      <div className="flex flex-wrap gap-2">
                        {data.security.pluginList.map((plugin, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {plugin}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};

export default DHFDeviceIntelligenceDashboard;

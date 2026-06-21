import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Shield, Activity, Fingerprint, Waves, Network, Lock, Sparkles, Users } from "lucide-react";
import { toast } from "sonner";
import LiveIoTMap from "@/components/analytics/LiveIoTMap";
import DeviceFingerprinting from "@/components/analytics/DeviceFingerprinting";
import BiometricStreams from "@/components/analytics/BiometricStreams";
import NetworkFusion from "@/components/analytics/NetworkFusion";
import PrivacyGovernance from "@/components/analytics/PrivacyGovernance";
import UserConfidenceScore from "@/components/analytics/UserConfidenceScore";
import { AIAuditPanel } from "@/components/AIAuditPanel";
import VisitorIntelligencePanel from "@/components/analytics/VisitorIntelligencePanel";
import { isRootAdmin, checkRootAdminStatus } from "@/components/security/securityConfig";

const AnalyticsDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAccess();
  }, [user]);

  const checkAccess = async () => {
    if (!user) {
      toast.error("Authentication required");
      navigate("/auth");
      return;
    }

    // First check ROOT_ADMINS (moksh50, shivanth_kn, justmkbhd)
    const { isAdmin, username } = await checkRootAdminStatus(user.id);
    
    if (isAdmin) {
      setProfile({ username });
      setLoading(false);
      return;
    }

    // Fallback: Check user_roles table for admin role
    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError || !roleData) {
      toast.error("Access Denied: Admin privileges required");
      navigate("/");
      return;
    }

    // Get profile data for display
    const { data: profileData } = await supabase
      .from("profiles")
      .select("username")
      .eq("user_id", user.id)
      .maybeSingle();

    setProfile(profileData);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Shield className="w-12 h-12 text-primary animate-pulse" />
          <p className="text-muted-foreground font-mono">Verifying credentials...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold font-mono text-primary flex items-center gap-3">
                <Shield className="w-8 h-8" />
                OMNI-SENSE
              </h1>
              <p className="text-sm text-muted-foreground mt-1 font-mono">
                Advanced User Profiling & Intelligence Dashboard
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground/70 font-mono">ADMIN ACCESS</p>
              <p className="text-sm text-accent font-mono">@{profile?.username}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* AI Audit Panel */}
        <AIAuditPanel />

        {/* User Confidence Score Overview */}
        <div className="mt-8">
          <UserConfidenceScore />
        </div>

        {/* Tabbed Interface */}
        <Tabs defaultValue="visitors" className="mt-8">
          <TabsList className="grid grid-cols-6 w-full bg-card border border-border">
            <TabsTrigger value="visitors" className="font-mono data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              <Users className="w-4 h-4 mr-2" />
              Visitors
            </TabsTrigger>
            <TabsTrigger value="iot" className="font-mono data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              <Activity className="w-4 h-4 mr-2" />
              Live IoT
            </TabsTrigger>
            <TabsTrigger value="fingerprint" className="font-mono data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              <Fingerprint className="w-4 h-4 mr-2" />
              Fingerprint
            </TabsTrigger>
            <TabsTrigger value="biometric" className="font-mono data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              <Waves className="w-4 h-4 mr-2" />
              Biometrics
            </TabsTrigger>
            <TabsTrigger value="network" className="font-mono data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              <Network className="w-4 h-4 mr-2" />
              Network
            </TabsTrigger>
            <TabsTrigger value="privacy" className="font-mono data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              <Lock className="w-4 h-4 mr-2" />
              Privacy
            </TabsTrigger>
          </TabsList>

          <TabsContent value="visitors" className="mt-6">
            <VisitorIntelligencePanel />
          </TabsContent>

          <TabsContent value="iot" className="mt-6">
            <LiveIoTMap />
          </TabsContent>

          <TabsContent value="fingerprint" className="mt-6">
            <DeviceFingerprinting />
          </TabsContent>

          <TabsContent value="biometric" className="mt-6">
            <BiometricStreams />
          </TabsContent>

          <TabsContent value="network" className="mt-6">
            <NetworkFusion />
          </TabsContent>

          <TabsContent value="privacy" className="mt-6">
            <PrivacyGovernance />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;

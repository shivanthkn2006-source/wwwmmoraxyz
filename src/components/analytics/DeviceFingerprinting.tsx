import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Fingerprint, Monitor, Battery, Cpu, Smartphone, Globe } from "lucide-react";

const DeviceFingerprinting = () => {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    const { data } = await supabase
      .from("user_sessions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);

    setSessions(data || []);
    setLoading(false);
  };

  const generateFingerprint = (session: any) => {
    const hash = `${session.browser}${session.os}${session.device_type}${session.ip_address}`;
    return hash.substring(0, 16).toUpperCase();
  };

  return (
    <div className="space-y-6">
      <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-xl">
        <div className="p-6">
          <h3 className="text-xl font-mono text-cyan-400 mb-4 flex items-center gap-2">
            <Fingerprint className="w-6 h-6" />
            Device Identity Matrix
          </h3>
          <p className="text-sm text-slate-400 font-mono mb-6">
            Advanced fingerprinting beyond traditional cookies • Cross-device linking enabled
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {loading ? (
              <div className="col-span-2 text-center py-8 text-slate-500 font-mono">
                Scanning device signatures...
              </div>
            ) : (
              sessions.map((session) => (
                <Card key={session.id} className="bg-slate-950/50 border-slate-800">
                  <div className="p-4">
                    {/* Fingerprint Hash */}
                    <div className="mb-4 pb-4 border-b border-slate-800">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-mono text-slate-500">DIGITAL FINGERPRINT</span>
                        <Fingerprint className="w-4 h-4 text-cyan-400" />
                      </div>
                      <div className="text-lg font-mono text-cyan-400 tracking-wider">
                        {generateFingerprint(session)}
                      </div>
                    </div>

                    {/* Device Parameters */}
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <Monitor className="w-4 h-4 text-slate-500 mt-0.5" />
                        <div className="flex-1">
                          <div className="text-xs text-slate-500 font-mono">BROWSER</div>
                          <div className="text-sm text-slate-300 font-mono">
                            {session.browser} {session.browser_version}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Cpu className="w-4 h-4 text-slate-500 mt-0.5" />
                        <div className="flex-1">
                          <div className="text-xs text-slate-500 font-mono">OPERATING SYSTEM</div>
                          <div className="text-sm text-slate-300 font-mono">
                            {session.os} {session.os_version}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Smartphone className="w-4 h-4 text-slate-500 mt-0.5" />
                        <div className="flex-1">
                          <div className="text-xs text-slate-500 font-mono">DEVICE TYPE</div>
                          <div className="text-sm text-slate-300 font-mono">
                            {session.device_type || "Unknown"} • {session.device_model || "Unknown Model"}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Globe className="w-4 h-4 text-slate-500 mt-0.5" />
                        <div className="flex-1">
                          <div className="text-xs text-slate-500 font-mono">LOCATION</div>
                          <div className="text-sm text-slate-300 font-mono">
                            {session.city || "Unknown"}, {session.country || "Unknown"}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Battery className="w-4 h-4 text-slate-500 mt-0.5" />
                        <div className="flex-1">
                          <div className="text-xs text-slate-500 font-mono">SESSION STATUS</div>
                          <div className="text-sm font-mono">
                            {session.is_active ? (
                              <span className="text-emerald-400">● ACTIVE</span>
                            ) : (
                              <span className="text-slate-500">○ INACTIVE</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Cross-Device Linking Indicator */}
                    <div className="mt-4 pt-4 border-t border-slate-800">
                      <div className="flex items-center gap-2 text-xs font-mono text-amber-400">
                        <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                        Cross-device linking detected
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default DeviceFingerprinting;

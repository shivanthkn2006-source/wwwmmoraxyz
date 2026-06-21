import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Shield, Lock, Eye, EyeOff, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const PrivacyGovernance = () => {
  const [settings, setSettings] = useState({
    anonymizeData: true,
    gdprCompliance: true,
    biometricRetention: false,
    crossDeviceTracking: true,
    dataEncryption: true,
  });

  const handleToggle = (key: keyof typeof settings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
    toast.success(`Privacy setting updated: ${key}`);
  };

  const handlePurgeBiometric = () => {
    toast.success("Biometric history purged successfully");
  };

  const handleDataExport = () => {
    toast.success("Preparing GDPR data export...");
  };

  return (
    <div className="space-y-6">
      {/* Compliance Overview */}
      <Card className="bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border-emerald-500/20 backdrop-blur-xl">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-mono text-emerald-400 flex items-center gap-2">
                <Shield className="w-6 h-6" />
                Compliance Status
              </h3>
              <p className="text-sm text-slate-400 font-mono mt-1">
                Privacy & Data Protection Framework
              </p>
            </div>
            <div className="text-right">
              <div className="px-4 py-2 bg-emerald-500/20 border border-emerald-500/30 rounded-lg">
                <p className="text-xs text-slate-400 font-mono">STATUS</p>
                <p className="text-2xl font-bold font-mono text-emerald-400">COMPLIANT</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Privacy Controls */}
      <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-xl">
        <div className="p-6">
          <h3 className="text-lg font-mono text-cyan-400 mb-6 flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Privacy Control Panel
          </h3>

          <div className="space-y-6">
            {/* Anonymize Data */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-start gap-3">
                {settings.anonymizeData ? (
                  <EyeOff className="w-5 h-5 text-cyan-400 mt-1" />
                ) : (
                  <Eye className="w-5 h-5 text-amber-400 mt-1" />
                )}
                <div>
                  <p className="text-sm font-mono text-slate-300 font-semibold">Anonymize Data</p>
                  <p className="text-xs text-slate-500 font-mono mt-1">
                    Remove personally identifiable information from analytics streams
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.anonymizeData}
                onCheckedChange={() => handleToggle("anonymizeData")}
              />
            </div>

            {/* GDPR Compliance Mode */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-emerald-400 mt-1" />
                <div>
                  <p className="text-sm font-mono text-slate-300 font-semibold">GDPR Compliance Mode</p>
                  <p className="text-xs text-slate-500 font-mono mt-1">
                    Enforce EU data protection regulations and user consent requirements
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.gdprCompliance}
                onCheckedChange={() => handleToggle("gdprCompliance")}
              />
            </div>

            {/* Biometric Retention */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 mt-1" />
                <div>
                  <p className="text-sm font-mono text-slate-300 font-semibold">Biometric Data Retention</p>
                  <p className="text-xs text-slate-500 font-mono mt-1">
                    Store biometric sensor data for historical analysis (requires explicit consent)
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.biometricRetention}
                onCheckedChange={() => handleToggle("biometricRetention")}
              />
            </div>

            {/* Cross-Device Tracking */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-start gap-3">
                <Lock className="w-5 h-5 text-purple-400 mt-1" />
                <div>
                  <p className="text-sm font-mono text-slate-300 font-semibold">Cross-Device Tracking</p>
                  <p className="text-xs text-slate-500 font-mono mt-1">
                    Link user identity across multiple devices and platforms
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.crossDeviceTracking}
                onCheckedChange={() => handleToggle("crossDeviceTracking")}
              />
            </div>

            {/* Data Encryption */}
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-cyan-400 mt-1" />
                <div>
                  <p className="text-sm font-mono text-slate-300 font-semibold">End-to-End Encryption</p>
                  <p className="text-xs text-slate-500 font-mono mt-1">
                    Encrypt all data streams at rest and in transit (AES-256)
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.dataEncryption}
                onCheckedChange={() => handleToggle("dataEncryption")}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Data Management Actions */}
      <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-xl">
        <div className="p-6">
          <h3 className="text-lg font-mono text-cyan-400 mb-6 flex items-center gap-2">
            <Trash2 className="w-5 h-5" />
            Data Management
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              onClick={handlePurgeBiometric}
              variant="outline"
              className="h-auto py-4 flex-col items-start border-red-500/30 hover:bg-red-500/10 hover:border-red-500/50"
            >
              <div className="flex items-center gap-2 text-red-400 mb-1">
                <Trash2 className="w-4 h-4" />
                <span className="font-mono font-semibold">Purge Biometric History</span>
              </div>
              <p className="text-xs text-slate-500 font-mono text-left">
                Permanently delete all stored biometric sensor data
              </p>
            </Button>

            <Button
              onClick={handleDataExport}
              variant="outline"
              className="h-auto py-4 flex-col items-start border-cyan-500/30 hover:bg-cyan-500/10 hover:border-cyan-500/50"
            >
              <div className="flex items-center gap-2 text-cyan-400 mb-1">
                <Shield className="w-4 h-4" />
                <span className="font-mono font-semibold">Export User Data</span>
              </div>
              <p className="text-xs text-slate-500 font-mono text-left">
                Generate GDPR-compliant data export package
              </p>
            </Button>
          </div>
        </div>
      </Card>

      {/* Compliance Certifications */}
      <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-xl">
        <div className="p-6">
          <h3 className="text-lg font-mono text-cyan-400 mb-4">Compliance Certifications</h3>
          <div className="flex flex-wrap gap-2">
            {["GDPR", "CCPA", "HIPAA", "SOC 2", "ISO 27001"].map((cert) => (
              <div
                key={cert}
                className="px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-full text-xs font-mono text-emerald-400"
              >
                {cert}
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default PrivacyGovernance;

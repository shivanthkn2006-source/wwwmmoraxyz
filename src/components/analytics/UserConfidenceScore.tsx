import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Shield, TrendingUp, Activity, Zap } from "lucide-react";

const UserConfidenceScore = () => {
  const [score, setScore] = useState(0);
  const [metrics, setMetrics] = useState({
    deviceTrust: 0,
    biometricMatch: 0,
    behaviorPattern: 0,
    networkIntegrity: 0,
  });

  useEffect(() => {
    // Simulate AI-calculated confidence score
    const interval = setInterval(() => {
      const newMetrics = {
        deviceTrust: Math.floor(Math.random() * 30) + 70,
        biometricMatch: Math.floor(Math.random() * 20) + 80,
        behaviorPattern: Math.floor(Math.random() * 25) + 75,
        networkIntegrity: Math.floor(Math.random() * 15) + 85,
      };
      setMetrics(newMetrics);
      
      const avgScore = Math.floor(
        (newMetrics.deviceTrust + 
         newMetrics.biometricMatch + 
         newMetrics.behaviorPattern + 
         newMetrics.networkIntegrity) / 4
      );
      setScore(avgScore);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const getScoreColor = (value: number) => {
    if (value >= 90) return "text-emerald-400";
    if (value >= 75) return "text-cyan-400";
    if (value >= 60) return "text-amber-400";
    return "text-red-400";
  };

  return (
    <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-xl">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-mono text-cyan-400 flex items-center gap-2">
              <Shield className="w-5 h-5" />
              User Confidence Score
            </h2>
            <p className="text-xs text-slate-500 mt-1 font-mono">
              AI-Powered Data Fusion Analysis
            </p>
          </div>
          <div className="text-right">
            <div className={`text-5xl font-bold font-mono ${getScoreColor(score)}`}>
              {score}%
            </div>
            <div className="flex items-center gap-1 text-emerald-400 text-sm font-mono mt-1">
              <TrendingUp className="w-4 h-4" />
              <span>+2.3%</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
                <Activity className="w-3 h-3" />
                Device Trust
              </span>
              <span className={`text-sm font-mono font-bold ${getScoreColor(metrics.deviceTrust)}`}>
                {metrics.deviceTrust}%
              </span>
            </div>
            <Progress value={metrics.deviceTrust} className="h-1 bg-slate-800" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
                <Zap className="w-3 h-3" />
                Biometric Match
              </span>
              <span className={`text-sm font-mono font-bold ${getScoreColor(metrics.biometricMatch)}`}>
                {metrics.biometricMatch}%
              </span>
            </div>
            <Progress value={metrics.biometricMatch} className="h-1 bg-slate-800" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                Behavior Pattern
              </span>
              <span className={`text-sm font-mono font-bold ${getScoreColor(metrics.behaviorPattern)}`}>
                {metrics.behaviorPattern}%
              </span>
            </div>
            <Progress value={metrics.behaviorPattern} className="h-1 bg-slate-800" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
                <Shield className="w-3 h-3" />
                Network Integrity
              </span>
              <span className={`text-sm font-mono font-bold ${getScoreColor(metrics.networkIntegrity)}`}>
                {metrics.networkIntegrity}%
              </span>
            </div>
            <Progress value={metrics.networkIntegrity} className="h-1 bg-slate-800" />
          </div>
        </div>
      </div>
    </Card>
  );
};

export default UserConfidenceScore;

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { Heart, Activity, Zap, TrendingUp } from "lucide-react";

const BiometricStreams = () => {
  const [heartRateData, setHeartRateData] = useState<any[]>([]);
  const [accelerometerData, setAccelerometerData] = useState<any[]>([]);
  const [currentBPM, setCurrentBPM] = useState(72);
  const [activityStatus, setActivityStatus] = useState("Resting");

  useEffect(() => {
    // Initialize data
    const initData = Array.from({ length: 20 }, (_, i) => ({
      time: `${i}s`,
      bpm: 70 + Math.random() * 10,
      x: Math.random() * 2 - 1,
      y: Math.random() * 2 - 1,
      z: Math.random() * 2 - 1,
    }));
    setHeartRateData(initData);
    setAccelerometerData(initData);

    // Simulate real-time updates
    const interval = setInterval(() => {
      const activities = ["Resting", "Walking", "Jogging", "Climbing Stairs", "Sleeping"];
      const newActivity = activities[Math.floor(Math.random() * activities.length)];
      setActivityStatus(newActivity);

      const baseBPM = newActivity === "Jogging" ? 120 : newActivity === "Walking" ? 90 : 72;
      const newBPM = baseBPM + Math.random() * 10;
      setCurrentBPM(Math.floor(newBPM));

      setHeartRateData((prev) => {
        const newData = [
          ...prev.slice(1),
          {
            time: `${prev.length}s`,
            bpm: newBPM,
          },
        ];
        return newData;
      });

      const movement = newActivity === "Jogging" ? 3 : newActivity === "Walking" ? 1.5 : 0.3;
      setAccelerometerData((prev) => {
        const newData = [
          ...prev.slice(1),
          {
            time: `${prev.length}s`,
            x: (Math.random() - 0.5) * movement,
            y: (Math.random() - 0.5) * movement,
            z: (Math.random() - 0.5) * movement,
          },
        ];
        return newData;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const getActivityColor = () => {
    switch (activityStatus) {
      case "Jogging":
        return "text-red-400";
      case "Walking":
        return "text-amber-400";
      case "Climbing Stairs":
        return "text-orange-400";
      default:
        return "text-emerald-400";
    }
  };

  return (
    <div className="space-y-6">
      {/* AI Inference Widget */}
      <Card className="bg-gradient-to-br from-cyan-500/10 to-purple-500/10 border-cyan-500/20 backdrop-blur-xl">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-mono text-cyan-400 mb-2 flex items-center gap-2">
                <Zap className="w-5 h-5" />
                AI Activity Inference
              </h3>
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-xs text-slate-500 font-mono">CURRENT STATUS</p>
                  <p className={`text-2xl font-bold font-mono ${getActivityColor()}`}>
                    {activityStatus}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-mono">HEART RATE</p>
                  <p className="text-2xl font-bold font-mono text-red-400 flex items-center gap-2">
                    <Heart className="w-6 h-6" />
                    {currentBPM} BPM
                  </p>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="px-4 py-2 bg-cyan-500/20 border border-cyan-500/30 rounded-lg">
                <p className="text-xs text-slate-400 font-mono">CONFIDENCE</p>
                <p className="text-2xl font-bold font-mono text-cyan-400">94.2%</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Heart Rate Chart */}
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-xl">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-mono text-red-400 flex items-center gap-2">
                <Heart className="w-5 h-5" />
                Heart Rate (BPM)
              </h3>
              <div className="flex items-center gap-1 text-xs font-mono text-slate-500">
                <Activity className="w-3 h-3" />
                LIVE STREAM
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={heartRateData}>
                <defs>
                  <linearGradient id="bpmGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f87171" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis 
                  dataKey="time" 
                  stroke="#64748b" 
                  style={{ fontSize: "10px", fontFamily: "monospace" }}
                />
                <YAxis 
                  stroke="#64748b" 
                  style={{ fontSize: "10px", fontFamily: "monospace" }}
                  domain={[60, 140]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    border: "1px solid #334155",
                    borderRadius: "8px",
                    fontFamily: "monospace",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="bpm"
                  stroke="#f87171"
                  strokeWidth={2}
                  fill="url(#bpmGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Accelerometer Chart */}
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-xl">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-mono text-cyan-400 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Accelerometer (Movement)
              </h3>
              <div className="flex items-center gap-1 text-xs font-mono text-slate-500">
                <Activity className="w-3 h-3" />
                3-AXIS
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={accelerometerData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis 
                  dataKey="time" 
                  stroke="#64748b" 
                  style={{ fontSize: "10px", fontFamily: "monospace" }}
                />
                <YAxis 
                  stroke="#64748b" 
                  style={{ fontSize: "10px", fontFamily: "monospace" }}
                  domain={[-3, 3]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    border: "1px solid #334155",
                    borderRadius: "8px",
                    fontFamily: "monospace",
                  }}
                />
                <Line type="monotone" dataKey="x" stroke="#06b6d4" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="y" stroke="#22c55e" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="z" stroke="#f59e0b" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
            <div className="flex items-center justify-center gap-4 mt-4 text-xs font-mono">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-cyan-400 rounded-full" />
                <span className="text-slate-400">X-Axis</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-emerald-400 rounded-full" />
                <span className="text-slate-400">Y-Axis</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-amber-400 rounded-full" />
                <span className="text-slate-400">Z-Axis</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default BiometricStreams;

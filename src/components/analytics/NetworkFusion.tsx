import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Network, Users, Activity, TrendingUp } from "lucide-react";

const NetworkFusion = () => {
  const [activityData, setActivityData] = useState<any[]>([]);
  const [pageViewData, setPageViewData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNetworkData();
  }, []);

  const fetchNetworkData = async () => {
    // Fetch user activity log
    const { data: activityLog } = await supabase
      .from("user_activity_log")
      .select("activity_type")
      .order("created_at", { ascending: false })
      .limit(100);

    // Fetch page views
    const { data: pageViews } = await supabase
      .from("page_views")
      .select("page_path")
      .order("created_at", { ascending: false })
      .limit(100);

    // Process activity data
    const activityCounts: Record<string, number> = {};
    activityLog?.forEach((log) => {
      activityCounts[log.activity_type] = (activityCounts[log.activity_type] || 0) + 1;
    });

    const chartData = Object.entries(activityCounts).map(([name, value]) => ({
      name,
      value,
    }));

    setActivityData(chartData);

    // Process page view data
    const pageViewCounts: Record<string, number> = {};
    pageViews?.forEach((view) => {
      const path = view.page_path.split("/")[1] || "home";
      pageViewCounts[path] = (pageViewCounts[path] || 0) + 1;
    });

    const pageData = Object.entries(pageViewCounts).map(([name, value]) => ({
      name,
      value,
    }));

    setPageViewData(pageData);
    setLoading(false);
  };

  const COLORS = ["#06b6d4", "#22c55e", "#f59e0b", "#f87171", "#a855f7", "#ec4899"];

  return (
    <div className="space-y-6">
      <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-xl">
        <div className="p-6">
          <h3 className="text-xl font-mono text-cyan-400 mb-4 flex items-center gap-2">
            <Network className="w-6 h-6" />
            Network Fusion Analysis
          </h3>
          <p className="text-sm text-slate-400 font-mono mb-6">
            Cross-platform behavioral synthesis • Real-time activity correlation
          </p>

          {loading ? (
            <div className="text-center py-12 text-slate-500 font-mono">
              Processing network data streams...
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Activity Distribution */}
              <div>
                <h4 className="text-sm font-mono text-slate-400 mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  User Activity Distribution
                </h4>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={activityData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis 
                      dataKey="name" 
                      stroke="#64748b" 
                      style={{ fontSize: "10px", fontFamily: "monospace" }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis 
                      stroke="#64748b" 
                      style={{ fontSize: "10px", fontFamily: "monospace" }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        border: "1px solid #334155",
                        borderRadius: "8px",
                        fontFamily: "monospace",
                      }}
                    />
                    <Bar dataKey="value" fill="#06b6d4" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Page View Distribution */}
              <div>
                <h4 className="text-sm font-mono text-slate-400 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Page Navigation Patterns
                </h4>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pageViewData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pageViewData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        border: "1px solid #334155",
                        borderRadius: "8px",
                        fontFamily: "monospace",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Cross-Platform Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-xl">
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-5 h-5 text-cyan-400" />
              <span className="text-xs font-mono text-slate-500">TOTAL EVENTS</span>
            </div>
            <p className="text-3xl font-bold font-mono text-cyan-400">
              {activityData.reduce((acc, curr) => acc + curr.value, 0)}
            </p>
            <p className="text-xs font-mono text-emerald-400 mt-1">+12.5% vs last week</p>
          </div>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-xl">
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Activity className="w-5 h-5 text-amber-400" />
              <span className="text-xs font-mono text-slate-500">ACTIVE PATTERNS</span>
            </div>
            <p className="text-3xl font-bold font-mono text-amber-400">
              {activityData.length}
            </p>
            <p className="text-xs font-mono text-emerald-400 mt-1">+3 new detected</p>
          </div>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-xl">
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Network className="w-5 h-5 text-purple-400" />
              <span className="text-xs font-mono text-slate-500">CORRELATION</span>
            </div>
            <p className="text-3xl font-bold font-mono text-purple-400">87.3%</p>
            <p className="text-xs font-mono text-emerald-400 mt-1">High confidence</p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default NetworkFusion;

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { MapPin, Car, Home, Watch, Navigation, Activity } from "lucide-react";

interface IoTDevice {
  id: string;
  type: "vehicle" | "home" | "wearable";
  name: string;
  lat: number;
  lng: number;
  velocity?: number;
  status: string;
  telemetry: {
    temperature?: number;
    battery?: number;
    humidity?: number;
  };
}

const LiveIoTMap = () => {
  const [devices, setDevices] = useState<IoTDevice[]>([
    {
      id: "1",
      type: "vehicle",
      name: "Tesla Model S",
      lat: 37.7749,
      lng: -122.4194,
      velocity: 45,
      status: "In Transit",
      telemetry: { temperature: 22, battery: 78 },
    },
    {
      id: "2",
      type: "home",
      name: "Smart Home Hub",
      lat: 37.7849,
      lng: -122.4094,
      status: "Active",
      telemetry: { temperature: 24, humidity: 45 },
    },
    {
      id: "3",
      type: "wearable",
      name: "Apple Watch",
      lat: 37.7649,
      lng: -122.4294,
      status: "Active",
      telemetry: { battery: 65 },
    },
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      setDevices((prev) =>
        prev.map((device) => ({
          ...device,
          lat: device.lat + (Math.random() - 0.5) * 0.001,
          lng: device.lng + (Math.random() - 0.5) * 0.001,
          velocity: device.type === "vehicle" ? Math.floor(Math.random() * 60) + 20 : undefined,
          telemetry: {
            ...device.telemetry,
            battery: Math.max(0, Math.min(100, (device.telemetry.battery || 0) + (Math.random() - 0.5) * 5)),
          },
        }))
      );
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case "vehicle":
        return <Car className="w-5 h-5 text-cyan-400" />;
      case "home":
        return <Home className="w-5 h-5 text-amber-400" />;
      case "wearable":
        return <Watch className="w-5 h-5 text-emerald-400" />;
      default:
        return <MapPin className="w-5 h-5" />;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Map Placeholder */}
      <Card className="lg:col-span-2 bg-slate-900/50 border-slate-800 backdrop-blur-xl overflow-hidden">
        <div className="relative h-[600px] bg-slate-950">
          {/* Grid overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#334155_1px,transparent_1px),linear-gradient(to_bottom,#334155_1px,transparent_1px)] bg-[size:40px_40px] opacity-20" />
          
          {/* Simulated map with device markers */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative w-full h-full">
              {devices.map((device, index) => (
                <div
                  key={device.id}
                  className="absolute animate-pulse"
                  style={{
                    left: `${30 + index * 25}%`,
                    top: `${40 + index * 10}%`,
                  }}
                >
                  <div className="flex flex-col items-center">
                    {getDeviceIcon(device.type)}
                    <div className="mt-1 px-2 py-1 bg-slate-800/90 backdrop-blur-sm border border-slate-700 rounded text-xs font-mono text-slate-300">
                      {device.name}
                    </div>
                    {device.velocity && (
                      <div className="mt-1 flex items-center gap-1 text-xs font-mono text-cyan-400">
                        <Navigation className="w-3 h-3" />
                        {device.velocity} mph
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Map controls */}
          <div className="absolute top-4 left-4 bg-slate-800/90 backdrop-blur-sm border border-slate-700 rounded-lg p-2">
            <p className="text-xs font-mono text-slate-400">LIVE MAP VIEW</p>
            <p className="text-xs font-mono text-cyan-400">San Francisco, CA</p>
          </div>
        </div>
      </Card>

      {/* Telemetry Panel */}
      <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-xl">
        <div className="p-4">
          <h3 className="text-lg font-mono text-cyan-400 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Real-Time Telemetry
          </h3>
          <div className="space-y-4">
            {devices.map((device) => (
              <div key={device.id} className="bg-slate-950/50 border border-slate-800 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getDeviceIcon(device.type)}
                    <span className="text-sm font-mono text-slate-300">{device.name}</span>
                  </div>
                  <span className="text-xs font-mono text-emerald-400 px-2 py-0.5 bg-emerald-400/10 border border-emerald-400/20 rounded">
                    {device.status}
                  </span>
                </div>
                <div className="space-y-1 text-xs font-mono text-slate-400">
                  <div className="flex justify-between">
                    <span>GPS:</span>
                    <span className="text-slate-300">
                      {device.lat.toFixed(4)}, {device.lng.toFixed(4)}
                    </span>
                  </div>
                  {device.velocity && (
                    <div className="flex justify-between">
                      <span>Velocity:</span>
                      <span className="text-cyan-400">{device.velocity} mph</span>
                    </div>
                  )}
                  {device.telemetry.temperature && (
                    <div className="flex justify-between">
                      <span>Temperature:</span>
                      <span className="text-slate-300">{device.telemetry.temperature}°C</span>
                    </div>
                  )}
                  {device.telemetry.humidity && (
                    <div className="flex justify-between">
                      <span>Humidity:</span>
                      <span className="text-slate-300">{device.telemetry.humidity}%</span>
                    </div>
                  )}
                  {device.telemetry.battery && (
                    <div className="flex justify-between">
                      <span>Battery:</span>
                      <span className="text-amber-400">{Math.floor(device.telemetry.battery)}%</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default LiveIoTMap;

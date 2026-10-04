// Development-only VR World test bench: lets automated browser tests mount the
// world without signing in, and read window.__vrStats. Never routed in production.
import { Suspense, lazy } from 'react';
const VROMEGAWorld = lazy(() => import('@/components/VROMEGAWorld'));

export default function VRHarnessPage() {
  return (
    <div className="h-screen w-screen bg-background">
      <Suspense fallback={<p className="p-4 text-muted-foreground">Loading VR test bench…</p>}>
        <VROMEGAWorld integrityLevel={80} onIntegrityRestore={() => {}} isActive />
      </Suspense>
    </div>
  );
}

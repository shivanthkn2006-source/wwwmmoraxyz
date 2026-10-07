// Development-only VR World test bench: lets automated browser tests mount the
import "@/lib/domRemoveGuard";
// world without signing in, and read window.__vrStats. Only opens on localhost; everywhere else it is the normal 404 page.
import { Suspense, lazy } from 'react';
import NotFound from './NotFound';
import VRTopDock from '@/components/vr/VRTopDock';
const VROMEGAWorld = lazy(() => import('@/components/VROMEGAWorld'));

export default function VRHarnessPage() {
  if (!['localhost', '127.0.0.1'].includes(window.location.hostname)) return <NotFound />;
  return (
    <div className="h-screen w-screen bg-background">
      <Suspense fallback={<p className="p-4 text-muted-foreground">Loading VR test bench…</p>}>
        <VROMEGAWorld integrityLevel={80} onIntegrityRestore={() => {}} isActive />
        <VRTopDock />
      </Suspense>
    </div>
  );
}

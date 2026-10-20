import { useEffect } from 'react';
import { Rotate3d } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { resetInspection, toggleInspection, useInspection } from '@/lib/vrInspection';
import { useVRView } from '@/lib/vrView';
import { useWorldState } from '@/worlds/worldMode';

export function VRInspectionToggle() {
  const active = useInspection();
  const view = useVRView();
  const { mode } = useWorldState();
  const visible = mode === 'mmora' && view.thirdPerson && !view.face;
  useEffect(() => {
    if (!visible) { resetInspection(); return; }
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || (e.target instanceof Element && e.target.closest('input, textarea, select, [contenteditable="true"]'))) return;
      if (e.code === 'KeyO') { e.preventDefault(); toggleInspection(); }
    };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); resetInspection(); };
  }, [visible]);
  if (!visible) return null;
  return <Button variant="ghost" size="icon" aria-label="360° inspection" aria-pressed={active} title="360° inspection (O)" data-exclude-phantom-tap
    onClick={toggleInspection} className="fixed bottom-24 left-1/2 z-[61] -translate-x-1/2 rounded-full surface-warm-tan text-foreground">
    <Rotate3d />
  </Button>;
}
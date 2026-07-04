// ═══════════════════════════════════════════════════════════════════════════════
// ZOE HAIRSTYLE MODAL — self-contained, isolated
// ═══════════════════════════════════════════════════════════════════════════════
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { X, Camera, Upload, Sparkles, Download, Trash2, Loader2, FileDown, Image as ImageIcon, RefreshCw, ShieldCheck, ShieldAlert, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MEN_CUTS, WOMEN_CUTS, HAIR_COLORS, type HairCut } from './catalog';
import { generateHairstyleImage } from './pollinations';
import { loadHairDesigns, saveHairDesign, deleteHairDesign, type HairDesign } from './gallery';
import { supabase } from '@/integrations/supabase/client';
import jsPDF from 'jspdf';
import type { Gender } from './intent';

interface Props { open: boolean; initialGender?: Gender; onClose: () => void; }

export function ZoeHairstyleModal({ open, initialGender = 'any', onClose }: Props) {
  const [gender, setGender] = useState<'men' | 'women'>(initialGender === 'men' ? 'men' : 'women');
  const [cutId, setCutId] = useState<string>('');
  const [color, setColor] = useState<string>(HAIR_COLORS[0]);
  const [source, setSource] = useState<string | undefined>();
  const [isCam, setIsCam] = useState(false);
  const [facing, setFacing] = useState<'user' | 'environment'>('user');
  const [isGen, setIsGen] = useState(false);
  const [designs, setDesigns] = useState<HairDesign[]>(() => loadHairDesigns());
  const [health, setHealth] = useState<{ status: 'checking' | 'ok' | 'missing' | 'error'; message?: string }>({ status: 'checking' });
  const [confirmPreview, setConfirmPreview] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const cuts = gender === 'men' ? MEN_CUTS : WOMEN_CUTS;
  const selectedCut = useMemo<HairCut | undefined>(() => cuts.find(c => c.id === cutId) ?? cuts[0], [cuts, cutId]);

  useEffect(() => { if (!open) stop(); /* eslint-disable-next-line */ }, [open]);
  useEffect(() => { if (initialGender && initialGender !== 'any') setGender(initialGender); }, [initialGender]);

  // Health check on open — verify the face-preserving image-edit backend is ready.
  useEffect(() => {
    if (!open) return;
    let alive = true;
    setHealth({ status: 'checking' });
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke('pollinations-image', { body: { mode: 'health', prompt: 'health' } });
        if (!alive) return;
        if (error) { setHealth({ status: 'error', message: error.message || 'Health check failed' }); return; }
        setHealth({ status: data?.hasKey ? 'ok' : 'missing', message: data?.message });
      } catch (e: any) {
        if (alive) setHealth({ status: 'error', message: e?.message || 'Health check failed' });
      }
    })();
    return () => { alive = false; };
  }, [open]);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null; setIsCam(false);
  }, []);

  const start = useCallback(async (mode: 'user' | 'environment' = facing) => {
    try {
      stop();
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: mode } });
      streamRef.current = s;
      if (videoRef.current) { videoRef.current.srcObject = s; await videoRef.current.play(); }
      setIsCam(true); setFacing(mode);
    } catch (e) { console.error('[ZoeHair] cam', e); alert('Camera unavailable — use Upload.'); }
  }, [facing, stop]);

  const flip = useCallback(() => start(facing === 'user' ? 'environment' : 'user'), [facing, start]);

  const capture = useCallback(() => {
    if (!videoRef.current) return;
    const c = document.createElement('canvas');
    c.width = videoRef.current.videoWidth; c.height = videoRef.current.videoHeight;
    c.getContext('2d')?.drawImage(videoRef.current, 0, 0);
    setSource(c.toDataURL('image/jpeg', 0.9)); stop();
  }, [stop]);

  const upload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader(); r.onload = () => setSource(typeof r.result === 'string' ? r.result : undefined); r.readAsDataURL(f);
  }, []);

  const generate = useCallback(async () => {
    if (!selectedCut) return;
    setIsGen(true);
    try {
      const { imageUrl, prompt } = await generateHairstyleImage({ cut: selectedCut.name, color, gender, sourceImage: source });
      setDesigns(saveHairDesign({
        id: `hair_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        createdAt: Date.now(), cut: selectedCut.name, color, gender, prompt,
        sourceImage: source, generatedImage: imageUrl,
      }));
    } catch (e: any) { alert(`Generation failed: ${e?.message ?? 'unknown'}`); }
    finally { setIsGen(false); }
  }, [selectedCut, color, gender, source]);

  const downloadOne = (d: HairDesign) => {
    const a = document.createElement('a');
    a.href = d.generatedImage; a.download = `zoe-hair-${d.cut}-${d.color}-${d.id}.jpg`; a.click();
  };

  const exportPDF = async () => {
    if (designs.length === 0) return;
    const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
    for (let i = 0; i < Math.min(designs.length, 20); i++) {
      const d = designs[i];
      if (i > 0) pdf.addPage();
      pdf.setFontSize(16); pdf.text(`Zoe Hairstyle — ${d.cut}`, 40, 40);
      pdf.setFontSize(11); pdf.text(`Color: ${d.color} · ${new Date(d.createdAt).toLocaleString()}`, 40, 60);
      try { pdf.addImage(d.generatedImage, 'JPEG', 40, 80, 500, 660); } catch (e) { pdf.text('(image unavailable)', 40, 100); }
    }
    pdf.save(`zoe-hairstyle-gallery.pdf`);
  };

  const latest = designs[0];
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-2 sm:p-4" onClick={onClose}>
      <div className="relative w-full max-w-5xl max-h-[95vh] overflow-y-auto rounded-2xl bg-slate-900 border border-pink-500/30 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 bg-slate-900/95 border-b border-pink-500/20">
          <h2 className="text-lg font-semibold text-pink-300 flex items-center gap-2"><Sparkles className="w-5 h-5" /> Zoe Hairstyle Studio</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4 grid md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="relative aspect-[3/4] rounded-xl bg-black/60 border border-white/10 flex items-center justify-center overflow-hidden">
              {isCam ? (
                <>
                  <video ref={videoRef} className={`w-full h-full object-cover ${facing === 'user' ? 'scale-x-[-1]' : ''}`} muted playsInline />
                  <button onClick={flip} title="Flip camera" className="absolute bottom-2 right-2 p-2 rounded-full bg-black/70 text-white hover:bg-black/90"><RefreshCw className="w-4 h-4" /></button>
                </>
              ) : source ? (
                <img src={source} alt="you" className="w-full h-full object-cover" />
              ) : (
                <div className="text-white/40 text-sm flex flex-col items-center gap-2"><ImageIcon className="w-8 h-8" />Take a selfie or upload</div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {!isCam ? (
                <Button size="sm" onClick={() => start('user')} className="bg-pink-600 hover:bg-pink-500"><Camera className="w-4 h-4 mr-1" />Selfie</Button>
              ) : (
                <Button size="sm" onClick={capture} className="bg-emerald-600 hover:bg-emerald-500">Capture</Button>
              )}
              <label className="inline-flex">
                <input type="file" accept="image/*" className="hidden" onChange={upload} />
                <span className="inline-flex items-center px-3 py-1.5 text-sm rounded-md bg-slate-700 hover:bg-slate-600 text-white cursor-pointer"><Upload className="w-4 h-4 mr-1" />Upload</span>
              </label>
              {source && <Button size="sm" variant="ghost" onClick={() => setSource(undefined)} className="text-red-300">Clear</Button>}
            </div>

            <div className="flex gap-2">
              {(['men','women'] as const).map(g => (
                <button key={g} onClick={() => { setGender(g); setCutId(''); }} className={`px-3 py-1 text-xs rounded-md ${gender === g ? 'bg-pink-600 text-white' : 'bg-white/10 text-white/70'}`}>{g}</button>
              ))}
            </div>

            <div>
              <label className="text-xs text-white/60">Cut ({cuts.length})</label>
              <div className="flex flex-wrap gap-1 mt-1 max-h-40 overflow-y-auto">
                {cuts.map(c => (
                  <button key={c.id} onClick={() => setCutId(c.id)} className={`px-2 py-1 text-xs rounded-md ${(selectedCut?.id === c.id) ? 'bg-pink-600 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}>{c.name}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-white/60">Color ({HAIR_COLORS.length})</label>
              <div className="flex flex-wrap gap-1 mt-1 max-h-32 overflow-y-auto">
                {HAIR_COLORS.map(c => (
                  <button key={c} onClick={() => setColor(c)} className={`px-2 py-1 text-xs rounded-md ${color === c ? 'bg-amber-500 text-black' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}>{c}</button>
                ))}
              </div>
            </div>

            <Button onClick={generate} disabled={isGen} className="w-full bg-gradient-to-r from-pink-500 to-amber-500 text-black font-semibold">
              {isGen ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Styling…</> : <><Sparkles className="w-4 h-4 mr-2" />Try This Style</>}
            </Button>
          </div>

          <div className="space-y-3">
            <div className="aspect-[3/4] rounded-xl bg-black/60 border border-amber-500/20 overflow-hidden flex items-center justify-center">
              {latest ? <img src={latest.generatedImage} alt="latest" className="w-full h-full object-cover" /> : <div className="text-white/40 text-sm">Your new look appears here</div>}
            </div>
            {latest && (
              <div className="flex gap-2">
                <Button size="sm" onClick={() => downloadOne(latest)} className="bg-emerald-600 hover:bg-emerald-500"><Download className="w-4 h-4 mr-1" />JPG</Button>
                <Button size="sm" onClick={exportPDF} className="bg-amber-500 text-black hover:bg-amber-400"><FileDown className="w-4 h-4 mr-1" />PDF</Button>
              </div>
            )}
            <div>
              <div className="text-xs text-white/60 mb-1">Gallery ({designs.length}/50)</div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-72 overflow-y-auto pr-1">
                {designs.map(d => (
                  <div key={d.id} className="relative group">
                    <img src={d.generatedImage} alt="" className="w-full aspect-square object-cover rounded-md border border-white/10" />
                    <button onClick={() => setDesigns(deleteHairDesign(d.id))} className="absolute top-1 right-1 p-1 rounded bg-black/70 opacity-0 group-hover:opacity-100"><Trash2 className="w-3 h-3 text-red-300" /></button>
                    <button onClick={() => downloadOne(d)} className="absolute bottom-1 right-1 p-1 rounded bg-black/70 opacity-0 group-hover:opacity-100"><Download className="w-3 h-3 text-white" /></button>
                  </div>
                ))}
                {designs.length === 0 && <div className="col-span-full text-white/40 text-xs">No styles yet.</div>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

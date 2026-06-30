// ═══════════════════════════════════════════════════════════════════════════════
// ZOE DECORATOR MODAL — fully self-contained
// Reuses existing Zoe permissions (camera/mic already granted at session start).
// Does NOT touch any existing Zoe Infinity UI/code.
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { X, Camera, Upload, Sparkles, Download, Trash2, Loader2, FileDown, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { generateDecoratorImage } from './pollinations';
import { saveDesign, loadDesigns, deleteDesign, type DecoratorDesign } from './gallery';
import { exportDesignsToPDF } from './pdfExport';
import type { DecoratorSpace, DecoratorTheme, ZoeDecoratorOpenDetail } from './intent';

const SPACES: DecoratorSpace[] = ['home', 'living-room', 'bedroom', 'kitchen', 'bathroom', 'garden', 'landscape', 'office', 'space'];
const THEMES: DecoratorTheme[] = ['modern', 'minimalist', 'scandinavian', 'industrial', 'bohemian', 'luxury', 'rustic', 'japandi', 'tropical', 'mediterranean', 'futuristic', 'cozy'];

interface Props {
  open: boolean;
  initial?: ZoeDecoratorOpenDetail;
  onClose: () => void;
}

export function ZoeDecoratorModal({ open, initial, onClose }: Props) {
  const [space, setSpace] = useState<DecoratorSpace>(initial?.space ?? 'living-room');
  const [theme, setTheme] = useState<DecoratorTheme>(initial?.theme ?? 'modern');
  const [notes, setNotes] = useState(initial?.prompt ?? '');
  const [originalPhoto, setOriginalPhoto] = useState<string | undefined>();
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [designs, setDesigns] = useState<DecoratorDesign[]>(() => loadDesigns());
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (open) {
      setSpace(initial?.space ?? 'living-room');
      setTheme(initial?.theme ?? 'modern');
      setNotes(initial?.prompt ?? '');
      setDesigns(loadDesigns());
    } else {
      stopCamera();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setIsCameraOn(false);
  }, []);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsCameraOn(true);
    } catch (e) {
      console.error('[ZoeDecorator] camera error', e);
      alert('Camera unavailable. Use Upload instead.');
    }
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current) return;
    const c = document.createElement('canvas');
    c.width = videoRef.current.videoWidth;
    c.height = videoRef.current.videoHeight;
    c.getContext('2d')?.drawImage(videoRef.current, 0, 0);
    setOriginalPhoto(c.toDataURL('image/jpeg', 0.9));
    stopCamera();
  }, [stopCamera]);

  const onUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => setOriginalPhoto(typeof r.result === 'string' ? r.result : undefined);
    r.readAsDataURL(f);
  }, []);

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    try {
      const { imageUrl, prompt } = await generateDecoratorImage({ space, theme, customNotes: notes });
      const design: DecoratorDesign = {
        id: `dec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        createdAt: Date.now(), space, theme, prompt, originalImage: originalPhoto, generatedImage: imageUrl,
      };
      setDesigns(saveDesign(design));
    } catch (e: any) {
      alert(`Generation failed: ${e?.message ?? 'unknown'}`);
    } finally { setIsGenerating(false); }
  }, [space, theme, notes, originalPhoto]);

  const downloadOne = (d: DecoratorDesign) => {
    const a = document.createElement('a');
    a.href = d.generatedImage; a.download = `zoe-${d.space}-${d.theme}-${d.id}.jpg`; a.click();
  };

  const exportPDF = () => exportDesignsToPDF(designs, originalPhoto);

  const latest = designs[0];

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-2 sm:p-4" onClick={onClose}>
      <div className="relative w-full max-w-5xl max-h-[95vh] overflow-y-auto rounded-2xl bg-slate-900 border border-cyan-500/30 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 bg-slate-900/95 border-b border-cyan-500/20">
          <h2 className="text-lg font-semibold text-cyan-300 flex items-center gap-2"><Sparkles className="w-5 h-5" /> Zoe Decorator</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-4 grid md:grid-cols-2 gap-4">
          {/* LEFT: source + controls */}
          <div className="space-y-3">
            <div className="aspect-video rounded-xl bg-black/60 border border-white/10 flex items-center justify-center overflow-hidden">
              {isCameraOn ? (
                <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
              ) : originalPhoto ? (
                <img src={originalPhoto} alt="source" className="w-full h-full object-cover" />
              ) : (
                <div className="text-white/40 text-sm flex flex-col items-center gap-2"><ImageIcon className="w-8 h-8" />No photo yet</div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {!isCameraOn ? (
                <Button size="sm" onClick={startCamera} className="bg-cyan-600 hover:bg-cyan-500"><Camera className="w-4 h-4 mr-1" />Camera</Button>
              ) : (
                <Button size="sm" onClick={capturePhoto} className="bg-emerald-600 hover:bg-emerald-500">Capture</Button>
              )}
              <label className="inline-flex">
                <input type="file" accept="image/*" className="hidden" onChange={onUpload} />
                <span className="inline-flex items-center px-3 py-1.5 text-sm rounded-md bg-slate-700 hover:bg-slate-600 text-white cursor-pointer"><Upload className="w-4 h-4 mr-1" />Upload</span>
              </label>
              {originalPhoto && <Button size="sm" variant="ghost" onClick={() => setOriginalPhoto(undefined)} className="text-red-300">Clear</Button>}
            </div>

            <div>
              <label className="text-xs text-white/60">Space</label>
              <div className="flex flex-wrap gap-1 mt-1">
                {SPACES.map(s => (
                  <button key={s} onClick={() => setSpace(s)} className={`px-2 py-1 text-xs rounded-md ${space === s ? 'bg-cyan-600 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}>{s}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-white/60">Theme</label>
              <div className="flex flex-wrap gap-1 mt-1">
                {THEMES.map(t => (
                  <button key={t} onClick={() => setTheme(t)} className={`px-2 py-1 text-xs rounded-md ${theme === t ? 'bg-amber-500 text-black' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}>{t}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-white/60">Notes (optional)</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="mt-1 w-full rounded-md bg-black/40 border border-white/10 text-white text-sm p-2" placeholder="e.g. add indoor plants, warm wood tones" />
            </div>
            <Button onClick={handleGenerate} disabled={isGenerating} className="w-full bg-gradient-to-r from-cyan-500 to-amber-500 text-black font-semibold">
              {isGenerating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Designing…</> : <><Sparkles className="w-4 h-4 mr-2" />Generate Redesign</>}
            </Button>
          </div>

          {/* RIGHT: latest + gallery */}
          <div className="space-y-3">
            <div className="aspect-video rounded-xl bg-black/60 border border-amber-500/20 overflow-hidden flex items-center justify-center">
              {latest ? <img src={latest.generatedImage} alt="latest" className="w-full h-full object-cover" /> : <div className="text-white/40 text-sm">Generated design appears here</div>}
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
                    <button onClick={() => setDesigns(deleteDesign(d.id))} className="absolute top-1 right-1 p-1 rounded bg-black/70 opacity-0 group-hover:opacity-100 transition" title="Delete">
                      <Trash2 className="w-3 h-3 text-red-300" />
                    </button>
                    <button onClick={() => downloadOne(d)} className="absolute bottom-1 right-1 p-1 rounded bg-black/70 opacity-0 group-hover:opacity-100 transition" title="Download">
                      <Download className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
                {designs.length === 0 && <div className="col-span-full text-white/40 text-xs">No designs yet.</div>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

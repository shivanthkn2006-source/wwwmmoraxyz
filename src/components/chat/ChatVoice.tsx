import { useEffect, useRef, useState } from 'react';
import { Mic, Pause, Play, Send, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useFreshMessageUrl } from '@/components/chat/ChatSignedImage';

export const VOICE_MAX_SECONDS = 300;
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/** Plain mic: tap to record (max 5 min), tap send to deliver, X to cancel. */
export const VoiceRecorderButton = ({
  userId,
  onSend,
}: {
  userId?: string;
  onSend: (url: string) => Promise<boolean>;
}) => {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [hint, setHint] = useState(true);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const cancelled = useRef(false);
  const timer = useRef<number>();

  useEffect(() => { const t = window.setTimeout(() => setHint(false), 5000); return () => clearTimeout(t); }, []);
  useEffect(() => () => { clearInterval(timer.current); recRef.current?.stream.getTracks().forEach(t => t.stop()); }, []);

  const upload = async (blob: Blob) => {
    if (!userId || blob.size === 0) return;
    const ext = blob.type.includes('mp4') ? 'm4a' : blob.type.includes('ogg') ? 'ogg' : 'webm';
    const path = `${userId}/voice_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from('messages').upload(path, blob, { contentType: blob.type || 'audio/webm' });
    if (error) { toast.error('Voice message could not upload'); return; }
    const { data } = await supabase.storage.from('messages').createSignedUrl(path, 604800);
    if (!data?.signedUrl || !(await onSend(data.signedUrl))) toast.error('Voice message could not send');
  };

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunks.current = []; cancelled.current = false;
      rec.ondataavailable = e => e.data.size && chunks.current.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        clearInterval(timer.current);
        setRecording(false);
        if (!cancelled.current) void upload(new Blob(chunks.current, { type: rec.mimeType }));
      };
      rec.start(250);
      recRef.current = rec;
      setSeconds(0); setRecording(true); setHint(false);
      timer.current = window.setInterval(() => setSeconds(s => {
        if (s + 1 >= VOICE_MAX_SECONDS) { recRef.current?.state === 'recording' && recRef.current.stop(); }
        return s + 1;
      }), 1000);
    } catch {
      toast.error('Microphone permission is needed for voice messages');
    }
  };
  const stop = (cancel: boolean) => { cancelled.current = cancel; if (recRef.current?.state === 'recording') recRef.current.stop(); };

  if (recording) {
    return (
      <div className="flex items-center gap-2 text-white">
        <button type="button" aria-label="Cancel voice message" onClick={() => stop(true)} className="bg-transparent border-0 p-1"><X className="w-5 h-5" /></button>
        <span className="text-xs tabular-nums animate-pulse">● {fmt(seconds)} / 5:00</span>
        <button type="button" aria-label="Send voice message" onClick={() => stop(false)} className="bg-transparent border-0 p-1"><Send className="w-5 h-5" /></button>
      </div>
    );
  }
  return (
    <button type="button" aria-label="Record voice message" onClick={() => void start()} className="relative flex items-center gap-1 bg-transparent border-0 p-1 text-white">
      <Mic className={`w-5 h-5 ${hint ? 'animate-pulse' : ''}`} />
      {hint && <span className="text-[10px] whitespace-nowrap">Voice message</span>}
    </button>
  );
};

/** Voice bubble: re-signs the link, play/pause, progress and duration. */
export const VoiceMessagePlayer = ({ url }: { url: string }) => {
  const fresh = useFreshMessageUrl(url);
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  const [dur, setDur] = useState(0);

  useEffect(() => {
    if (!fresh) return;
    const a = new Audio(fresh);
    a.preload = 'metadata';
    a.onloadedmetadata = () => Number.isFinite(a.duration) && setDur(a.duration);
    a.ontimeupdate = () => { setPos(a.currentTime); if (Number.isFinite(a.duration)) setDur(a.duration); };
    a.onended = () => { setPlaying(false); setPos(0); };
    audio.current = a;
    return () => { a.pause(); audio.current = null; };
  }, [fresh]);

  const toggle = () => {
    const a = audio.current; if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { window.dispatchEvent(new CustomEvent('chat-voice-play', { detail: a })); void a.play().then(() => setPlaying(true)).catch(() => toast.error('Could not play voice message')); }
  };
  useEffect(() => {
    const other = (e: Event) => { if ((e as CustomEvent).detail !== audio.current && audio.current) { audio.current.pause(); setPlaying(false); } };
    window.addEventListener('chat-voice-play', other);
    return () => window.removeEventListener('chat-voice-play', other);
  }, []);

  return (
    <div className="flex items-center gap-2 mb-2 min-w-[180px] text-white">
      <button type="button" aria-label={playing ? 'Pause voice message' : 'Play voice message'} onClick={toggle} className="bg-transparent border-0 p-1">
        {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
      </button>
      <div className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
        <div className="h-full bg-white rounded-full" style={{ width: dur ? `${Math.min(100, (pos / dur) * 100)}%` : '0%' }} />
      </div>
      <span className="text-[10px] tabular-nums">{fmt(playing || pos ? pos : dur)}</span>
    </div>
  );
};

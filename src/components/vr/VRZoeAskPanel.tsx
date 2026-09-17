// ═══════════════════════════════════════════════════════════════════════════════
// VR ZOE ASK PANEL
// Additive in-world question box: a typed question is answered by the same Zoe
// chat brain used elsewhere, and the answer is shown inside this VR panel.
// Music requests are resolved locally first, so "play my mood song" plays a real
// track instead of spending tokens on a guess.
// ═══════════════════════════════════════════════════════════════════════════════
import React, { useState } from 'react';
import { Loader2, Send, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { resolveMusicIntent } from '@/features/music/musicIntent';
import { executeMusicIntent } from '@/features/music/executeMusicIntent';

const VRZoeAskPanel: React.FC = () => {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [busy, setBusy] = useState(false);

  const ask = async () => {
    const text = question.trim();
    if (!text || busy) return;
    setBusy(true);
    setAnswer('');
    try {
      const intent = resolveMusicIntent(text);
      if (intent) {
        const result = await executeMusicIntent(intent, () => undefined);
        setAnswer(result.message);
        return;
      }
      const { data, error } = await supabase.functions.invoke('zoe-chat', {
        body: { messages: [{ role: 'user', content: text }] },
      });
      if (error) throw error;
      const reply = (data as { message?: string; response?: string } | null);
      setAnswer(reply?.message || reply?.response || 'Zoe had no answer for that just now.');
    } catch {
      setAnswer('Zoe could not answer right now. Check your connection and try again.');
    } finally {
      setBusy(false);
      setQuestion('');
    }
  };

  return (
    <div className="w-64 sm:w-72 rounded-2xl bg-black/50 p-3 text-white backdrop-blur-xl">
      <form className="flex items-center gap-2" onSubmit={(event) => { event.preventDefault(); void ask(); }}>
        <Sparkles className="h-4 w-4 shrink-0 text-purple-300" aria-hidden="true" />
        <input
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Ask Zoe"
          aria-label="Ask Zoe a question inside the VR world"
          className="min-w-0 flex-1 rounded-full bg-white/10 px-3 py-2 text-xs text-white placeholder:text-white/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        />
        <button type="submit" aria-label="Send question to Zoe" className="rounded-full bg-white/10 p-2 focus-visible:ring-2 focus-visible:ring-white/60">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </form>
      <p role="status" aria-live="polite" className="mt-2 max-h-44 overflow-y-auto whitespace-pre-wrap text-[11px] leading-relaxed text-white/80">
        {busy ? 'Zoe is thinking…' : answer}
      </p>
    </div>
  );
};

export default VRZoeAskPanel;

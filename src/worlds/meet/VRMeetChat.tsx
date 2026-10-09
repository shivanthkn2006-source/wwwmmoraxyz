/**
 * See-through chat inside VR World, like a live-stream chat: round photo,
 * @name, a colour tag (blue friend, yellow follower, green new), the text.
 * Messages fade after a while unless the chat is open.
 */
import React, { useEffect, useRef, useState } from 'react';
import { MessageCircle, Send, Smile, Eye, EyeOff, X, Mic, MicOff, UserPlus } from 'lucide-react';
import { useGpsFollow, startGpsFollow, stopGpsFollow } from '../realmap/gpsFollow';
import { useMeet, sendChat, setChatOpen, setMeetVisible, TAG_LABEL } from './vrMeet';
import { useVoice, startVoice, stopVoice } from './vrVoice';
import { loadFriends, sendPortalInvite, arriveFromInvite, type Friend } from './vrInvite';

const FADE_MS = 25_000;
const EMOJI = ['👋', '😀', '❤️', '🔥', '👍', '🎉'];

export const VRMeetChat: React.FC = () => {
  const m = useMeet();
  const gps = useGpsFollow();
  const [text, setText] = useState('');
  const [emoji, setEmoji] = useState(false);
  const [, tick] = useState(0);
  const voice = useVoice();
  const [invite, setInvite] = useState<null | Friend[]>(null);
  const [sent, setSent] = useState<Record<string, string>>({});
  useEffect(() => { arriveFromInvite(); return () => stopVoice(); }, []);
  const openInvite = async () => { if (invite) return setInvite(null); setInvite([]); setInvite(await loadFriends().catch(() => [])); };
  const invite1 = async (f: Friend) => {
    setSent((x) => ({ ...x, [f.id]: 'Sending…' }));
    const r = await sendPortalInvite(f.id);
    setSent((x) => ({ ...x, [f.id]: r.ok ? 'Invited ✓' : r.error ?? 'Failed' }));
    if (r.ok) sendChat(`invited @${f.username} to the portal`, true);
  };
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { const id = window.setInterval(() => tick((n) => n + 1), 5000); return () => window.clearInterval(id); }, []);
  useEffect(() => { listRef.current?.scrollTo({ top: 1e6 }); }, [m.messages.length, m.chatOpen]);
  useEffect(() => { if (m.chatOpen && m.chatFocus) inputRef.current?.focus(); }, [m.chatFocus]); // eslint-disable-line react-hooks/exhaustive-deps

  const now = Date.now();
  const shown = m.chatOpen ? m.messages.slice(-30) : m.messages.filter((x) => now - x.at < FADE_MS).slice(-5);
  const submit = () => { if (sendChat(text)) setText(''); };
  const others = m.players.length;

  return (
    <div className="vr-meet-chat fixed left-3 z-[9990] flex w-[min(340px,46vw)] flex-col gap-1.5" data-exclude-phantom-tap data-testid="vr-meet-chat">
      {m.nearest && m.nearest.dist < 2.5 && !m.chatOpen && (
        <button type="button" onClick={() => setChatOpen(true, true)} className="vr-chat-chip self-start">@{m.nearest.username} is next to you — tap or press Use to chat</button>
      )}
      <div ref={listRef} className={`flex flex-col gap-1 overflow-y-auto ${m.chatOpen ? 'max-h-[34vh] pointer-events-auto' : 'max-h-[24vh] pointer-events-none'}`} aria-live="polite">
        {shown.map((x) => (
          <div key={x.id} className="vr-chat-line" style={{ opacity: m.chatOpen ? 1 : Math.max(0.25, 1 - (now - x.at) / FADE_MS) }}>
            {x.photo ? <img src={x.photo} alt="" className="vr-chat-avatar" /> : <span className={`vr-chat-avatar vr-chat-avatar-${x.tag}`}>{(x.username || '?').slice(0, 1).toUpperCase()}</span>}
            <p className="min-w-0 break-words leading-snug">
              <span className="vr-chat-name">@{x.username}</span>
              {x.tag !== 'me' && <span className={`vr-meet-tag vr-meet-tag-${x.tag} ml-1`}>{TAG_LABEL[x.tag]}</span>}
              <span className={x.system ? 'vr-chat-text italic' : 'vr-chat-text'}> {x.text}</span>
            </p>
          </div>
        ))}
      </div>
      {m.chatOpen ? (
        <div className="pointer-events-auto flex flex-col gap-1">
          {invite && (
            <div className="vr-chat-input flex max-h-[30vh] flex-col gap-0.5 overflow-y-auto px-2 py-1.5" data-testid="vr-invite-list">
              <p className="vr-chat-text px-1 text-xs opacity-80">Invite a friend to the portal</p>
              {invite.length === 0 && <p className="vr-chat-text px-1 py-1 text-xs opacity-70">No friends to invite yet</p>}
              {invite.map((f) => (
                <button key={f.id} type="button" onClick={() => void invite1(f)} disabled={!!sent[f.id] && sent[f.id] !== 'Failed'} className="flex items-center gap-2 rounded-lg px-1 py-1 text-left">
                  {f.photo ? <img src={f.photo} alt="" className="vr-chat-avatar" /> : <span className="vr-chat-avatar vr-chat-avatar-friend">{f.username.slice(0, 1).toUpperCase()}</span>}
                  <span className="vr-chat-name min-w-0 flex-1 truncate">@{f.username}</span>
                  <span className="vr-meet-tag vr-meet-tag-friend">{sent[f.id] ?? 'Invite'}</span>
                </button>
              ))}
            </div>
          )}
          {emoji && <div className="vr-chat-input flex gap-1 self-start px-2 py-1">{EMOJI.map((e) => <button key={e} type="button" className="text-lg" onClick={() => setText((t) => t + e)}>{e}</button>)}</div>}
          <form className="vr-chat-input flex items-center gap-1 px-2" onSubmit={(e) => { e.preventDefault(); submit(); inputRef.current?.blur(); }}>
            <input ref={inputRef} onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Escape') inputRef.current?.blur(); }} onKeyUp={(e) => e.stopPropagation()} value={text} onChange={(e) => setText(e.target.value)} maxLength={240} placeholder="Chat…" aria-label="Chat message" className="vr-chat-text min-w-0 flex-1 bg-transparent py-2 outline-none placeholder:opacity-70" />
            <button type="button" aria-label={voice.on ? 'Turn voice chat off' : 'Turn voice chat on'} aria-pressed={voice.on} onClick={() => void (voice.on ? stopVoice() : startVoice())} className="vr-chat-icon">{voice.on ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}</button>
            <button type="button" aria-label="Invite a friend to the portal" aria-pressed={!!invite} onClick={() => void openInvite()} className="vr-chat-icon"><UserPlus className="h-4 w-4" /></button>
            <button type="button" aria-label="Emoji" onClick={() => setEmoji((v) => !v)} className="vr-chat-icon"><Smile className="h-4 w-4" /></button>
            <button type="submit" aria-label="Send" className="vr-chat-icon"><Send className="h-4 w-4" /></button>
            <button type="button" aria-label="Close chat" onClick={() => setChatOpen(false)} className="vr-chat-icon"><X className="h-4 w-4" /></button>
          </form>
          <button type="button" aria-pressed={gps.on} aria-label="Follow my GPS" onClick={() => (gps.on ? stopGpsFollow() : startGpsFollow())} className="vr-chat-chip self-start">
            📍 {gps.on ? (gps.paused === 'driving' ? 'GPS paused — moving too fast' : gps.error ?? 'Following my GPS') : 'Follow my GPS'}
          </button>
          <button type="button" aria-pressed={m.visible} onClick={() => void setMeetVisible(!m.visible)} className="vr-chat-chip self-start">
            {m.visible ? <Eye className="mr-1 inline h-3 w-3" /> : <EyeOff className="mr-1 inline h-3 w-3" />}
            {m.visible ? 'Visible to others' : 'Hidden from others'}
          </button>
          {(voice.on || voice.error) && <p className="vr-chat-text px-1 text-xs" aria-live="polite">{voice.error ?? (voice.talkingWith.length ? `🎙 Talking with ${voice.talkingWith.length}` : '🎙 Voice on — waiting for others with voice on')}</p>}
        </div>
      ) : (
        <button type="button" onClick={() => setChatOpen(true, true)} className="vr-chat-chip pointer-events-auto self-start" aria-label="Open chat">
          <MessageCircle className="inline h-4 w-4" />
        </button>
      )}
    </div>
  );
};
export default VRMeetChat;

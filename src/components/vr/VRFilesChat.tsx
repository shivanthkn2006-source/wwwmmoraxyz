import React, { useState } from 'react';
import { useMeet, sendChat } from '@/worlds/meet/vrMeet';

/** In-world chat inside Files: same live room as the bubbles over members' heads. */
export const FilesChat: React.FC = () => {
  const { messages, connected } = useMeet();
  const [text, setText] = useState('');
  const send = () => { const t = text.trim(); if (t && sendChat(t)) setText(''); };
  return (
    <div className="re-case-row">
      <div className="font-semibold">Village chat {connected ? '' : '· connecting…'}</div>
      <div className="mt-1 max-h-32 overflow-y-auto text-[11px]">
        {messages.filter((m) => !m.system).slice(-20).map((m) => <div key={m.id}><b>@{m.username}</b> {m.text}</div>)}
        {!messages.some((m) => !m.system) && <div className="opacity-60">No messages yet</div>}
      </div>
      <div className="mt-1 flex gap-1">
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') send(); }} maxLength={140} placeholder="Say something…" className="min-w-0 flex-1 rounded bg-transparent px-1 text-[11px] outline-none" style={{ border: '1px solid currentColor' }} />
        <button type="button" onClick={send} className="text-[11px] underline">Send</button>
      </div>
    </div>
  );
};

/**
 * "M'Mora world" loading screen: frosted glass panels over a deep blue-grey
 * backdrop, a progress ring, a "Connecting…" card, a VR headset badge and a
 * cyan wireframe skyline. Same layout on phones and desktops (it scales).
 */
import React, { useEffect, useState } from 'react';

const Headset: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 64 40" className={className} aria-hidden fill="none">
    <path d="M6 10c0-3 2-5 5-5h42c3 0 5 2 5 5v16c0 3-2 5-5 5H42c-2 0-3-1-4-3l-2-4c-1-2-3-2-4-2s-3 0-4 2l-2 4c-1 2-2 3-4 3H11c-3 0-5-2-5-5V10z" fill="currentColor" opacity=".95" />
    <path d="M14 13h12M38 13h12" stroke="hsl(205 40% 20%)" strokeWidth="3" strokeLinecap="round" opacity=".55" />
    <path d="M2 14v8M62 14v8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

const Skyline: React.FC = () => (
  <svg viewBox="0 0 400 160" className="mmw-skyline" preserveAspectRatio="xMidYMax meet" aria-hidden>
    <g stroke="currentColor" strokeWidth="1" fill="currentColor" fillOpacity=".08">
      {[[10,90,34,70],[50,50,30,110],[86,70,26,90],[118,20,34,140],[158,60,28,100],[192,35,40,125],[238,75,30,85],[274,45,34,115],[314,85,26,75],[346,58,40,102]].map(([x,y,w,h],i)=>(
        <g key={i}>
          <rect x={x} y={y} width={w} height={h} />
          {Array.from({ length: Math.floor(h / 14) }, (_, k) => <line key={k} x1={x} x2={x + w} y1={y + 14 * (k + 1)} y2={y + 14 * (k + 1)} strokeOpacity=".45" />)}
          <line x1={x + w / 2} x2={x + w / 2} y1={y} y2={y + h} strokeOpacity=".35" />
        </g>
      ))}
      <path d="M0 160 L200 128 L400 160" fill="none" strokeOpacity=".5" />
    </g>
  </svg>
);

export const MMoraWorldLoader: React.FC<{ progress?: number; label?: string }> = ({ progress, label = 'Connecting…' }) => {
  const [t, setT] = useState(0);
  useEffect(() => { const s = performance.now(); const id = window.setInterval(() => setT(performance.now() - s), 120); return () => window.clearInterval(id); }, []);
  // Without a real number, ease towards 95 % (never claims "done" before it is).
  const pct = Math.round(progress ?? 95 * (1 - Math.exp(-t / 3500)));
  const R = 44, C = 2 * Math.PI * R;
  return (
    <div className="mmw-loader" role="status" aria-label={`Loading M'Mora world, ${pct}%`}>
      <div className="mmw-glass mmw-main">
        <h1 className="mmw-title">M'Mora world</h1>
        <p className="mmw-sub">Your new world. Experience limitless possibilities.</p>
        <svg viewBox="0 0 100 100" className="mmw-ring" aria-hidden>
          <circle cx="50" cy="50" r={R} className="mmw-ring-track" />
          <circle cx="50" cy="50" r={R} className="mmw-ring-fill" strokeDasharray={C} strokeDashoffset={C * (1 - pct / 100)} />
          <text x="50" y="55" textAnchor="middle" className="mmw-ring-text">{pct}%</text>
        </svg>
        <Skyline />
      </div>
      <div className="mmw-glass mmw-connect">
        <span>{label.toUpperCase()}</span>
        <div className="mmw-bar"><div style={{ width: `${Math.max(12, pct)}%` }} /></div>
      </div>
      <div className="mmw-glass mmw-badge"><Headset className="mmw-headset" /></div>
    </div>
  );
};
export default MMoraWorldLoader;

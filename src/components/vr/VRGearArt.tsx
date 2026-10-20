/** Realistic case drawings for village weapons, armour and quest items (real-world colours). */
import React from 'react';

const S: React.FC<{ vb: string; children: React.ReactNode }> = ({ vb, children }) => (
  <svg viewBox={vb} className="h-full w-full" aria-hidden>{children}</svg>
);

const ART: Record<string, React.ReactNode> = {
  // 9mm handgun: matte black slide, dark polymer grip, steel barrel tip.
  pistol: <S vb="0 0 64 48">
    <rect x="8" y="12" width="46" height="10" rx="1.5" fill="#2a2c2f" stroke="#111" />
    {[0, 1, 2, 3, 4].map((i) => <rect key={i} x={40 + i * 2.4} y="13.5" width="1" height="7" fill="#151617" />)}
    <rect x="52" y="14.5" width="5" height="5" fill="#8b9097" />
    <path d="M14 22 L32 22 L30 28 Q28 31 24 31 L22 31 Q18 31 18 28 Z" fill="none" stroke="#1b1c1e" strokeWidth="2.2" />
    <path d="M10 22 L22 22 L18 44 Q17 46 14 46 L8 46 Q5 46 6 43 Z" fill="#1d1e20" stroke="#0c0c0c" />
    {[0, 1, 2, 3].map((i) => <line key={i} x1="9" y1={28 + i * 4} x2="18" y2={28 + i * 4} stroke="#333" />)}
  </S>,
  // Pump shotgun: walnut stock & fore-end, blued steel barrel and receiver.
  shotgun: <S vb="0 0 120 40">
    <rect x="34" y="12" width="84" height="5" rx="1" fill="#3a3f45" stroke="#1a1d20" />
    <rect x="44" y="18" width="70" height="4" rx="1" fill="#2c3035" />
    <rect x="62" y="17" width="24" height="8" rx="2" fill="#7a4a22" stroke="#4a2a10" />
    {[0, 1, 2, 3, 4].map((i) => <line key={i} x1={65 + i * 4} y1="18" x2={65 + i * 4} y2="24" stroke="#5a3415" />)}
    <rect x="22" y="11" width="22" height="12" rx="1.5" fill="#2a2e33" stroke="#111" />
    <path d="M30 23 Q30 30 37 29" fill="none" stroke="#1d1f22" strokeWidth="2" />
    <path d="M24 13 L4 18 Q1 19 2 23 L4 33 Q5 35 8 34 L26 22 Z" fill="#8a5428" stroke="#4a2a10" />
    <path d="M6 20 L22 16" stroke="#a86a36" strokeWidth="1.2" />
    <rect x="1.5" y="22" width="3" height="11" rx="1" fill="#1a1a1a" />
  </S>,
  // Combat knife: steel blade with fuller, black handle, guard.
  knife: <S vb="0 0 80 30">
    <path d="M30 10 L70 10 Q78 12 74 16 L66 20 L30 20 Z" fill="#c9ced4" stroke="#6c737b" />
    <path d="M34 13 L64 13" stroke="#8e959d" strokeWidth="1.5" />
    <path d="M70 10 Q78 12 74 16" fill="none" stroke="#eef1f4" />
    <rect x="27" y="6" width="4" height="18" rx="1" fill="#5a5f66" />
    <rect x="6" y="10" width="21" height="10" rx="3" fill="#1c1c1c" />
    {[0, 1, 2, 3].map((i) => <line key={i} x1={10 + i * 4.5} y1="10.5" x2={10 + i * 4.5} y2="19.5" stroke="#333" />)}
    <circle cx="5" cy="15" r="2.5" fill="#5a5f66" />
  </S>,
  // Rocket launcher: olive drab tube, grip, sight, red warhead tip.
  rocket: <S vb="0 0 120 40">
    <rect x="10" y="12" width="96" height="12" rx="3" fill="#4b5320" stroke="#2c3112" />
    <rect x="4" y="10" width="8" height="16" rx="2" fill="#3a4018" />
    <path d="M106 11 L114 14 L114 22 L106 25 Z" fill="#a31d1d" stroke="#5c0e0e" />
    <rect x="40" y="6" width="12" height="6" fill="#222" />
    <rect x="48" y="24" width="6" height="12" rx="1.5" fill="#1d1d1d" />
    <rect x="66" y="24" width="5" height="8" rx="1.5" fill="#1d1d1d" />
    <line x1="20" y1="15" x2="100" y2="15" stroke="#5c662a" />
    <text x="72" y="21" fontSize="5" fill="#d8d3a8" fontFamily="monospace">M'MORA</text>
  </S>,
  // Brown leather vest with buckles.
  vest: <S vb="0 0 48 52">
    <path d="M12 4 L18 4 Q24 12 30 4 L36 4 L44 14 L42 48 L26 48 L24 18 L22 48 L6 48 L4 14 Z" fill="#6b4226" stroke="#3a220f" />
    <path d="M24 18 L24 48" stroke="#2a180a" strokeWidth="1.2" />
    {[24, 32, 40].map((y) => <g key={y}><rect x="14" y={y} width="20" height="2.4" fill="#4a2c15" /><rect x="22" y={y - 0.8} width="4" height="4" fill="none" stroke="#b9a37a" /></g>)}
    <path d="M8 16 L14 20 M40 16 L34 20" stroke="#8a5a36" />
  </S>,
  // Headlamp: elastic band with a round lamp and lens.
  headlamp: <S vb="0 0 52 40">
    <path d="M4 22 Q26 10 48 22" stroke="#2b2b2b" strokeWidth="5" fill="none" />
    <rect x="17" y="10" width="18" height="14" rx="3" fill="#3a3d40" stroke="#1d1f21" />
    <circle cx="26" cy="17" r="5" fill="#fff1c8" stroke="#a9a28a" />
  </S>,
  // Iron helmet: dark grey steel dome, rivets, brim.
  helmet: <S vb="0 0 52 40">
    <path d="M6 30 Q6 6 26 6 Q46 6 46 30 Z" fill="#6d737a" stroke="#33383d" />
    <path d="M14 12 Q26 8 38 12" stroke="#a7adb4" fill="none" strokeWidth="1.5" />
    <rect x="2" y="29" width="48" height="5" rx="2" fill="#4c5156" stroke="#2b2f33" />
    {[10, 18, 26, 34, 42].map((x) => <circle key={x} cx={x} cy="31.5" r="1" fill="#c0c5ca" />)}
    <rect x="24" y="6" width="4" height="24" fill="#5c6268" />
  </S>,
  // Lord's crest: heraldic shield with gold border.
  crest: <S vb="0 0 40 48">
    <path d="M4 4 L36 4 L36 22 Q36 38 20 46 Q4 38 4 22 Z" fill="#7a1420" stroke="#d4a838" strokeWidth="2.5" />
    <path d="M20 10 L20 38 M10 20 L30 20" stroke="#d4a838" strokeWidth="2" />
    <text x="20" y="34" fontSize="6" textAnchor="middle" fill="#f1d27a" fontFamily="Georgia, serif" fontStyle="italic">M</text>
  </S>,
  // Church medallion: old gold disc on a faded ribbon.
  medallion: <S vb="0 0 40 52">
    <path d="M12 2 L20 20 L28 2" fill="none" stroke="#6b1d2a" strokeWidth="5" />
    <circle cx="20" cy="34" r="14" fill="#c9971f" stroke="#7a5a10" strokeWidth="2" />
    <circle cx="20" cy="34" r="9" fill="none" stroke="#f0cf6a" />
    <path d="M20 27 L20 41 M15 32 L25 32" stroke="#7a5a10" strokeWidth="2" />
  </S>,
  // Old village map: aged parchment, ink roads, red X.
  map: <S vb="0 0 52 40">
    <path d="M3 5 L18 2 L34 6 L49 3 L49 36 L34 38 L18 35 L3 38 Z" fill="#d9c08a" stroke="#8a6b38" />
    <path d="M18 2 L18 35 M34 6 L34 38" stroke="#b39556" />
    <path d="M7 30 Q16 18 26 22 T44 10" stroke="#5a3b1a" fill="none" strokeDasharray="2 1.5" />
    <path d="M40 8 L45 13 M45 8 L40 13" stroke="#a11" strokeWidth="1.6" />
    <circle cx="12" cy="12" r="3" fill="none" stroke="#5a3b1a" />
  </S>,
};

export const GearArt: React.FC<{ id: string }> = ({ id }) => <>{id === 'w870' ? <S vb="0 0 120 40">
  <path d="M2 17 L24 13 L34 10 L49 11 L49 23 L32 22 L25 27 L22 35 L3 35 Z" fill="#333b40" stroke="#12171a" />
  <rect x="49" y="12" width="68" height="4" rx="1" fill="#626b73" />
  <rect x="49" y="19" width="42" height="3" rx="1" fill="#414a50" />
  <rect x="55" y="18" width="30" height="9" rx="2" fill="#30393f" stroke="#151b1f" />
  {[0,1,2,3,4,5,6].map((i) => <path key={i} d={`M${58+i*3.5} 20 v5`} stroke="#56616a" />)}
  <path d="M34 23 Q34 31 43 28 L45 23" fill="none" stroke="#30383e" strokeWidth="2" />
  <path d="M51 10 H116 M112 9 v3" stroke="#7d8790" />
  <rect x="2" y="18" width="3" height="17" rx="1" fill="#1a2125" />
</S> : ART[id] ?? <span className="text-2xl">{({ sentinel9: '🔫', boltrifle: '🎯', shockgrenade: '💥', styli: '💉', extmag: '🔩', lasersight: '🔴', reagent: '🧪', fraggrenade: '💣', flashgrenade: '⚡', incgrenade: '🔥', smokegrenade: '🌫️', knife: '🔪' } as Record<string, string>)[id] ?? '🎒'}</span>}</>;

/** Golden herb: same sprig as the green herb, in gold. */
export const GoldHerbArt: React.FC<{ green?: boolean }> = ({ green }) => (
  <S vb="0 0 40 80">
    <path d="M20 78 L20 30" stroke={green ? "hsl(95 45% 35%)" : "hsl(40 60% 35%)"} strokeWidth="2" />
    {[0, 1, 2, 3, 4, 5].map((i) => (
      <g key={i} transform={`translate(20 ${66 - i * 9})`}>
        <path d={`M0 0 Q${-12 + i} -6 ${-15 + i * 1.5} -14 Q-4 -10 0 0`} fill={green ? "hsl(100 75% 52%)" : "hsl(45 95% 58%)"} />
        <path d={`M0 0 Q${12 - i} -6 ${15 - i * 1.5} -14 Q4 -10 0 0`} fill={green ? "hsl(105 70% 46%)" : "hsl(40 90% 48%)"} />
      </g>
    ))}
    <path d="M20 14 Q14 4 20 2 Q26 4 20 14" fill={green ? "hsl(100 80% 58%)" : "hsl(48 100% 65%)"} />
  </S>
);

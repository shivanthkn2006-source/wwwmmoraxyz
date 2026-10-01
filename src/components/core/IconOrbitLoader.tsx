import { useState } from 'react';
import {
  Lightbulb, Sparkles, MessageCircle, Bell, User, Compass, Headphones, Music, Camera, ScanFace, Glasses,
  ShoppingBag, Briefcase, Network, Orbit, Brain, Home, Scale, Building2, Clock, Bot, LifeBuoy,
  Map as MapIcon, Music2, Users, Activity, Layers, type LucideIcon,
} from 'lucide-react';
import ZoeCallsIcon from '@/components/icons/ZoeCallsIcon';

// Plain symbols already used in the Home menu panel.
const POOL: LucideIcon[] = [
  Lightbulb, Sparkles, MessageCircle, Bell, User, Compass, Headphones, Music, Camera, ScanFace, Glasses,
  ShoppingBag, Briefcase, Network, Orbit, Brain, Home, Scale, Building2, Clock, Bot, LifeBuoy,
  MapIcon, Music2, Users, Activity, Layers, ZoeCallsIcon as unknown as LucideIcon,
];
const KEY = 'mmora-loader-last-set';

/** Picks 5 symbols, avoiding the set shown on the previous load. */
function pickSet(): LucideIcon[] {
  let last: number[] = [];
  try { last = JSON.parse(sessionStorage.getItem(KEY) || localStorage.getItem(KEY) || '[]'); } catch { /* ignore */ }
  const fresh = POOL.map((_, i) => i).filter((i) => !last.includes(i));
  for (let i = fresh.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [fresh[i], fresh[j]] = [fresh[j], fresh[i]];
  }
  const chosen = fresh.slice(0, 5);
  try { localStorage.setItem(KEY, JSON.stringify(chosen)); } catch { /* ignore */ }
  return chosen.map((i) => POOL[i]);
}

let cached: LucideIcon[] | null = null;

export default function IconOrbitLoader() {
  const [icons] = useState(() => (cached ??= pickSet()));
  return (
    <div className="relative h-32 w-32" aria-hidden="true">
      <div className="absolute inset-0 animate-[spin_24s_linear_infinite]">
        {icons.map((Icon, i) => {
          const a = (i / icons.length) * 2 * Math.PI;
          return (
            <span
              key={i}
              className="absolute left-1/2 top-1/2 text-foreground"
              style={{ transform: `translate(-50%, -50%) translate(${Math.cos(a) * 52}px, ${Math.sin(a) * 52}px)` }}
            >
              <span className="block animate-[spin_24s_linear_infinite_reverse]">
                <Icon className="h-6 w-6" strokeWidth={1.8} />
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

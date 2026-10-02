// Member referral dashboard: personal invite link plus visitors and sign-ups it brought in.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Copy, Share2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { fetchMyReferrals, memberRefCode } from '@/lib/visitTracker';
import { shareTargets } from '@/lib/referral';

type Stats = { code: string; visits: number; visitors: number; signups: number; recent: string[] };

export default function ReferralsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const code = user ? memberRefCode(user.id) : '';
  const link = `${window.location.origin}/auth?r=${code}`;

  useEffect(() => {
    if (!user) return;
    let alive = true;
    const load = () => fetchMyReferrals().then((s) => { if (alive) { setStats(s); setLoading(false); } }).catch(() => setLoading(false));
    load();
    const t = window.setInterval(load, 30_000);
    return () => { alive = false; window.clearInterval(t); };
  }, [user]);

  const copy = async () => {
    try { await navigator.clipboard.writeText(link); toast.success('Link copied'); } catch { toast.error('Could not copy'); }
  };
  const share = async () => {
    if (navigator.share) { try { await navigator.share({ title: "Join me on M'Mora", url: link }); } catch { /* cancelled */ } }
    else void copy();
  };

  const tiles = [
    { label: 'Visitors', value: stats?.visitors },
    { label: 'Page views', value: stats?.visits },
    { label: 'Sign-ups', value: stats?.signups },
  ];

  return (
    <div className="min-h-screen surface-warm-tan text-white px-4 py-6">
      <div className="max-w-xl mx-auto space-y-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-white/90" aria-label="Back">
          <ArrowLeft className="w-5 h-5" /> Back
        </button>
        <div>
          <h1 className="text-2xl font-bold">Invite friends</h1>
          <p className="text-white/80 text-sm mt-1">Share your link. Everyone who visits or signs up through it is counted here.</p>
        </div>
        <div className="space-y-3">
          <p className="font-mono text-sm break-all">{link}</p>
          <div className="flex gap-4">
            <button onClick={copy} className="flex items-center gap-2"><Copy className="w-4 h-4" /> Copy</button>
            <button onClick={share} className="flex items-center gap-2"><Share2 className="w-4 h-4" /> Share</button>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-white/85">
            {shareTargets(link, "Join me on M'Mora").map((t) => (
              <a key={t.label} href={t.href} target="_blank" rel="noopener noreferrer">{t.label}</a>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 text-center">
          {tiles.map((t) => (
            <div key={t.label}>
              <p className="text-3xl font-bold">{loading ? '…' : t.value ?? 0}</p>
              <p className="text-xs text-white/80">{t.label}</p>
            </div>
          ))}
        </div>
        {stats && stats.recent.length > 0 && (
          <div>
            <h2 className="font-semibold mb-2">Recent sign-ups</h2>
            {stats.recent.map((d, i) => (
              <p key={i} className="text-sm text-white/85">New member · {new Date(d).toLocaleString()}</p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

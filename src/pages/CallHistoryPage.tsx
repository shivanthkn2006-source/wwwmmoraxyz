import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, PhoneIncoming, PhoneMissed, PhoneOutgoing, User } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { fetchCallHistory, formatCallDuration, type CallHistoryEntry } from '@/features/calls/callHistory';

const CallHistoryPage = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<CallHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async (userId: string) => {
    setLoading(true);
    setFailed(false);
    try {
      setEntries(await fetchCallHistory(userId));
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.id) void load(user.id);
  }, [load, user?.id]);

  if (!user) return null;

  return (
    <main className="calls-liquid-page relative min-h-[100dvh] overflow-y-auto bg-transparent px-4 pb-28 pt-6 text-white">
      <header className="mx-auto flex w-full max-w-xl items-center gap-3">
        <Link to="/calls" aria-label="Back to calls" className="rounded-full p-2 text-white/80 hover:bg-white/10 hover:text-white">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-medium text-white">Call history</h1>
      </header>

      <section className="mx-auto mt-5 w-full max-w-xl overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-2xl" aria-label="Call history">
        {loading && <p className="px-4 py-8 text-center text-sm text-white/60">Loading your calls…</p>}
        {!loading && failed && (
          <div className="px-4 py-8 text-center text-sm text-white/70">
            <p>Your calls could not be loaded just now.</p>
            <button type="button" onClick={() => void load(user.id)} className="mt-3 rounded-full border border-white/20 px-4 py-1.5 text-white hover:bg-white/10">
              Try again
            </button>
          </div>
        )}
        {!loading && !failed && entries.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-white/60">No calls yet. Start one from the Calls screen.</p>
        )}
        <ul className="divide-y divide-white/10">
          {entries.map(entry => (
            <li key={entry.id} className="flex items-center gap-3 px-4 py-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10">
                {entry.counterpartAvatar
                  ? <img src={entry.counterpartAvatar} alt="" className="h-full w-full object-cover" />
                  : <User className="h-5 w-5 text-white/60" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-white">{entry.counterpartName}</span>
                <span className="block text-xs text-white/55">
                  {new Date(entry.startedAt).toLocaleString()} · {entry.missed ? 'Missed' : formatCallDuration(entry.durationSeconds)}
                </span>
              </span>
              <span aria-label={entry.missed ? 'Missed call' : entry.direction === 'outgoing' ? 'Outgoing call' : 'Incoming call'} className="text-white/60">
                {entry.missed
                  ? <PhoneMissed className="h-4 w-4" />
                  : entry.direction === 'outgoing'
                    ? <PhoneOutgoing className="h-4 w-4" />
                    : <PhoneIncoming className="h-4 w-4" />}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
};

export default CallHistoryPage;

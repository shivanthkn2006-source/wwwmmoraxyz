import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import HumorDropCard from '@/components/humor/HumorDropCard';
import { useHumorDrops } from '@/hooks/useHumorDrops';

export default function ZoeLolPage() {
  const navigate = useNavigate();
  const drops = useHumorDrops(12);
  return (
    <main className="min-h-[100dvh] w-full bg-transparent px-4 pb-28 pt-[max(1rem,env(safe-area-inset-top))] text-white">
      <header className="mb-4 flex items-center gap-3">
        <button type="button" aria-label="Back" onClick={() => navigate(-1)} className="rounded-full p-2 text-white">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold">Zoe's LOL</h1>
      </header>
      {drops.length === 0 ? (
        <p className="text-white/80" data-humor-empty>Fresh skits are on the way — check back soon.</p>
      ) : (
        <div className="mx-auto flex max-w-xl flex-col gap-4">
          {drops.map((d) => <HumorDropCard key={d.id} drop={d} />)}
        </div>
      )}
    </main>
  );
}

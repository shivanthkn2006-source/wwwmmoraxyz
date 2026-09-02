/**
 * Isolated sandbox for the Zoe search console. Nothing on this route touches
 * the home feed, loops or navigation — it exists purely to verify the search
 * modal's glassmorphism, sanitisation and retrieval wiring before going live.
 */
import React from 'react';
import ZoeSearchModal from '@/components/search/ZoeSearchModal';

export default function SearchPreviewPage() {
  const [open, setOpen] = React.useState(false);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-black px-6 text-center">
      <h1 className="text-lg font-medium text-white/80">Zoe search console — preview</h1>
      <p className="max-w-md text-xs text-white/40">
        Isolated sandbox route. Open the console and try entity (@handle), semantic,
        media, shopping and weather queries.
      </p>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-blue-500/50 bg-blue-500/15 px-6 py-2.5 text-sm text-blue-300 backdrop-blur-2xl transition hover:bg-blue-500/25"
      >
        Open Search
      </button>
      <ZoeSearchModal isOpen={open} onClose={() => setOpen(false)} />
    </main>
  );
}

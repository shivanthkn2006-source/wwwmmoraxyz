/**
 * Mosaic page — the standalone home for the new scrapbook feed. Monochrome,
 * card-first, and completely separate from the existing Home/Loops surfaces.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import MosaicFeed from '@/components/feed/MosaicFeed';
import { useAgeCohort } from '@/hooks/useAgeCohort';

const MosaicFeedPage: React.FC = () => {
  const navigate = useNavigate();
  const { cohort } = useAgeCohort();

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/90 px-3 py-3 backdrop-blur">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          aria-label="Go back"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <h1 className="text-base font-semibold">Mosaic</h1>
        <button
          type="button"
          onClick={() => navigate('/home')}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-foreground"
          aria-label="Create a post on Home"
        >
          <Plus className="h-4 w-4" />
        </button>
      </header>

      <p className="sr-only">Cohort layout: {cohort}</p>
      <MosaicFeed limit={60} className="pb-28" />
    </main>
  );
};

export default MosaicFeedPage;

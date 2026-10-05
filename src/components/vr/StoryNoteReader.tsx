/** Full-screen note reader (Resident Evil "file" view) for notes found in M'Mora World. */
import React from 'react';
import { useStory, closeNote, NOTES } from '@/lib/vrStory';

export const StoryNoteReader: React.FC = () => {
  const { reading } = useStory();
  const n = reading ? NOTES[reading] : null;
  if (!n) return null;
  return (
    <div role="dialog" aria-label={n.title} className="fixed inset-0 z-[9998] flex items-center justify-center bg-background/50 p-6" data-exclude-phantom-tap onClick={closeNote}>
      <div className="surface-warm-tan max-w-sm rounded-2xl p-5 text-white" onClick={(e) => e.stopPropagation()}>
        <p className="mb-2 text-sm font-semibold">{n.title}</p>
        <p className="text-sm leading-relaxed">{n.text}</p>
        <button type="button" onClick={closeNote} className="mt-4 text-xs underline">Close</button>
      </div>
    </div>
  );
};
export default StoryNoteReader;

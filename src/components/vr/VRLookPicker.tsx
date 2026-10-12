import React from 'react';
import { useLook, setLook, LOOK_OPTIONS, type Look } from '@/lib/vrLook';

const LABEL: Record<keyof Look, string> = { skin: 'Skin', hair_color: 'Hair', shirt: 'Shirt', trousers: 'Trousers' };

/** "Look" row in Files: pick skin, hair and clothes colours (saved to the account). */
export const LookPicker: React.FC = () => {
  const look = useLook();
  return (
    <div className="re-case-row">
      <div className="font-semibold">Look</div>
      {(Object.keys(LOOK_OPTIONS) as (keyof Look)[]).map((k) => (
        <div key={k} className="flex items-center gap-1 mt-1 text-[11px]">
          <span className="w-14 opacity-80">{LABEL[k]}</span>
          {LOOK_OPTIONS[k].map((c) => (
            <button key={c} type="button" aria-label={`${LABEL[k]} ${c}`} onClick={() => setLook({ [k]: c } as Partial<Look>)}
              className="h-4 w-4 rounded-full" style={{ background: c, outline: look[k] === c ? '2px solid currentColor' : 'none', outlineOffset: 1 }} />
          ))}
        </div>
      ))}
    </div>
  );
};

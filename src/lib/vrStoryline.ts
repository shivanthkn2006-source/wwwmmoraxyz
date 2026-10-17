/**
 * M'Mora Village story — "The Verdant Bell" (2050). An original survival-horror
 * storyline inspired by classic Resident Evil structure (radio handler,
 * field reports, item-chain puzzles, stalker threat, final core room), with
 * new characters and world. Chapters follow the village quest chain:
 * map → medallion → crest → done.
 *
 * Cast: the player (an operative of the M'Mora Watch); Commander Ilse Varga
 * (radio handler, 61, walks in an exo-brace after the 2037 outbreak);
 * Dr. Oren Kalle (missing researcher); the Bell-Ringer (500-year tower keeper);
 * The Hollow Warden (stalker that hunts by sound).
 * The Verdant Strain: an old mould first catalogued by the castle Lords in
 * the 1700s, abandoned, then refined in 2049 by the Kalle Institute — so the
 * timeline stays consistent (old origin, modern weaponisation).
 */
export type Chapter = 'map' | 'medallion' | 'crest' | 'done';

export const CHAPTER_TITLE: Record<Chapter, string> = {
  map: 'Chapter 1 · The Quiet Lanes',
  medallion: 'Chapter 2 · The Altar Below',
  crest: 'Chapter 3 · The Lord\'s Keep',
  done: 'Epilogue · The Verdant Bell',
};

/** Villager lines for each chapter (shown in bubbles, spoken aloud). */
export const VILLAGER_STORY: Record<Chapter, string[]> = {
  map: [
    'You came with the Watch? Then find Dr. Kalle\'s map — he dropped it in the lanes when the green fog came.',
    'Since the year turned 2050 the mould grows on the walls at night. The map shows where it started.',
  ],
  medallion: [
    'The map is real, then. The church altar hides the Kalle medallion — the key to the old crypt.',
    'Quiet in the church. The Hollow Warden hunts by sound. Walk, do not run.',
  ],
  crest: [
    'The medallion glows… the Lords knew the Verdant Strain three hundred years ago. Their crest seals the keep.',
    'Bring the Lord\'s crest from the keep and the bell can finally rest.',
  ],
  done: [
    'The crest is back. The fog is thinning — for now.',
    'They say the Kalle Institute is still out there. The bell will tell us if they return.',
  ],
};

/** Field reports found with each quest item (opened and read aloud on pickup). */
export const FIELD_REPORTS: Record<string, { id: string; title: string; text: string }> = {
  map: {
    id: 'log_map', title: 'Field report 1 · Dr. Oren Kalle',
    text: 'March 2050. The strain from the castle cellars is not dead — it was waiting. The Institute fed it new code and it learned to move. I marked the church, the keep and the shore. If the bell rings, it is already too late to run.',
  },
  medallion: {
    id: 'log_medallion', title: 'Radio · Commander Varga',
    text: 'Operative, your vitals are spiking. That medallion is the crypt key Kalle hid. Do not force locks with brute strength — noise draws the Warden. Use what you find. Varga out.',
  },
  crest: {
    id: 'log_crest', title: 'Field report 2 · The Lord\'s Keep',
    text: 'The Lords sealed the first outbreak in 1752 and buried their notes in the keep. The Institute dug them up. With the crest returned, the village core falls quiet. Somewhere, the Institute is already growing the next one.',
  },
};

/** Commander Varga's radio line when a chapter begins (read aloud once). */
export const RADIO: Record<Chapter, string> = {
  map: 'Operative, this is Varga. M\'Mora Village has gone dark. Find Dr. Kalle\'s map in the lanes and report.',
  medallion: 'Good work. The map points to the church. Get the medallion from the altar — quietly.',
  crest: 'The keep is next. The Lord\'s crest seals whatever is under that castle. Bring it back.',
  done: 'Core is quiet. Rest at the typewriter, operative. This isn\'t over.',
};

/** Briefings: each must be read (opens in the note reader, read aloud, kept in Files) before its chapter's item can be taken. */
export const BRIEFINGS: Record<'intro' | Chapter, { id: string; title: string; text: string }> = {
  intro: { id: 'brief_intro', title: 'Briefing 0 · Welcome to M\'Mora Village',
    text: 'The year is 2050. M\'Mora Village went silent three nights ago under a green fog. You are an operative of the M\'Mora Watch. Commander Varga guides you by radio. Basics: move with the stick, turn with the arrows, tap Use near anything that glows. Open the case to use herbs — one Green Herb heals 20, three combine into a Golden Herb that heals fully. Guns need ammo and reloading. Save at the typewriter beside the blue ring. The hidden merchant trades coins for weapons. If the bell tower rings, danger is near. Read each briefing to unlock the next chapter.' },
  map: { id: 'brief_map', title: `Briefing 1 · ${CHAPTER_TITLE.map}`, text: `${RADIO.map} Villagers turn hostile if you attack them. Ammo is scarce — the knife costs nothing.` },
  medallion: { id: 'brief_medallion', title: `Briefing 2 · ${CHAPTER_TITLE.medallion}`, text: `${RADIO.medallion} The Hollow Warden hunts by sound. Walk inside the church; running draws attention.` },
  crest: { id: 'brief_crest', title: `Briefing 3 · ${CHAPTER_TITLE.crest}`, text: `${RADIO.crest} Equip armour before the keep. Stock herbs from the merchant.` },
  done: { id: 'brief_done', title: `Briefing 4 · ${CHAPTER_TITLE.done}`, text: RADIO.done },
};

/** Part 13 (Nexus) story pieces: Dr. Silas Vance of the Paradigm Group and the scout Kendo. */
export const NEXUS_NOTES: Record<string, { id: string; title: string; text: string }> = {
  vance: { id: 'log_vance', title: 'Intercepted broadcast · Dr. Silas Vance',
    text: 'They burned Raccoon City before it could bloom. A missed window. The Paradigm Group will not miss again — the Chimera-Strain takes root in this village tonight, and from here, the world.' },
  kendo: { id: 'log_kendo', title: 'Field note · Kendo, Watch scout',
    text: 'Docks are rotting through — watch your footing past the shoreline. The Drowned spit saltwater bile from a few metres out, so keep moving. And if you hear metal dragging on stone near the old sanatorium, run. Something up there fused its arm to an anchor.' },
};

/** Anonymous-safe engagement log (admin-only to read): which chapters, characters and items members engage with. */
export function logStory(kind: string, ref: string) {
  void (async () => {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data } = await supabase.auth.getSession(); const id = data.session?.user?.id; if (!id) return;
      const standalone = window.matchMedia?.('(display-mode: standalone)').matches;
      const platform = `${standalone ? 'pwa' : 'web'}-${window.innerWidth < 768 ? 'mobile' : window.innerWidth < 1100 ? 'tablet' : 'desktop'}`;
      await supabase.from('vr_story_events').insert({ user_id: id, kind: kind.slice(0, 40), ref: ref.slice(0, 80), platform });
    } catch { /* offline */ }
  })();
}

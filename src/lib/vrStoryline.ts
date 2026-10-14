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

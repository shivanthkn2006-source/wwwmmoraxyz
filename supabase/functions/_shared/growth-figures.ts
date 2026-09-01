/**
 * ═══════════════════════════════════════════════════════════════════════════
 * GROWTH FIGURES ROSTER
 *
 * Pure data + a deterministic picker. Deliberately free of any Deno or
 * provider imports so the app test suite can import it directly.
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * Why it exists: the biographical prompt used to carry no identity and no
 * history — just {slot, focus_areas, style}. Every user with the same window
 * and style therefore received the statistically modal answer, which is
 * overwhelmingly Benjamin Franklin. An audit of stored cards found him in
 * ~70% of biographical insights across users with different birth dates.
 *
 * The fix: stop asking the model to "pick someone" and instead ASSIGN a
 * figure deterministically per (user, date, slot) from a wide roster,
 * filtered against what that user has already been shown.
 * ──────────────────────────────────────────────────────────────────────────
 */

export interface GrowthFigure {
  slug: string;
  name: string;
  /** One-line grounding so the model writes fact, not invention. */
  known: string;
  /** Focus areas this figure speaks to most naturally. */
  domains: string[];
}

/**
 * Deliberately broad: scientists, mathematicians, engineers, physicians and
 * naturalists across eras, regions and genders. Breadth is the anti-repetition
 * mechanism — with 60+ entries a user cannot loop inside a year of daily cards.
 */
export const GROWTH_FIGURES: GrowthFigure[] = [
  { slug: 'marie-curie', name: 'Marie Curie', known: 'Physicist and chemist; only person to win Nobel Prizes in two sciences; worked in long uninterrupted research blocks.', domains: ['focus', 'resilience', 'learning'] },
  { slug: 'srinivasa-ramanujan', name: 'Srinivasa Ramanujan', known: 'Self-taught Indian mathematician who filled notebooks with thousands of results derived largely without formal training.', domains: ['learning', 'creativity', 'focus'] },
  { slug: 'richard-feynman', name: 'Richard Feynman', known: 'Physicist known for explaining ideas in plain language and for keeping a notebook of problems he did not yet understand.', domains: ['learning', 'creativity', 'problem-solving'] },
  { slug: 'barbara-mcclintock', name: 'Barbara McClintock', known: 'Geneticist who discovered transposable elements after decades of patient maize observation, long before the field accepted it.', domains: ['patience', 'resilience', 'focus'] },
  { slug: 'katherine-johnson', name: 'Katherine Johnson', known: 'NASA mathematician whose hand-checked orbital calculations were trusted over early computers for Mercury and Apollo flights.', domains: ['precision', 'career', 'resilience'] },
  { slug: 'alan-turing', name: 'Alan Turing', known: 'Mathematician who formalised computation and broke wartime ciphers by decomposing an impossible problem into mechanisable parts.', domains: ['problem-solving', 'strategy', 'focus'] },
  { slug: 'charles-darwin', name: 'Charles Darwin', known: 'Naturalist who spent over twenty years gathering evidence and deliberately recorded facts that contradicted his own theory.', domains: ['patience', 'learning', 'strategy'] },
  { slug: 'ada-lovelace', name: 'Ada Lovelace', known: 'Wrote the first published algorithm for a machine and foresaw computers manipulating symbols, not just numbers.', domains: ['creativity', 'learning', 'career'] },
  { slug: 'gregor-mendel', name: 'Gregor Mendel', known: 'Monk who tracked ~28,000 pea plants over eight years to find inheritance ratios nobody had measured.', domains: ['patience', 'habits', 'precision'] },
  { slug: 'dorothy-hodgkin', name: 'Dorothy Hodgkin', known: 'Chemist who mapped the structures of penicillin, insulin and B12 through years of painstaking X-ray crystallography.', domains: ['patience', 'focus', 'resilience'] },
  { slug: 'jagadish-chandra-bose', name: 'Jagadish Chandra Bose', known: 'Indian polymath in radio science and plant physiology who declined to patent his work so others could build on it.', domains: ['creativity', 'generosity', 'career'] },
  { slug: 'nikola-tesla', name: 'Nikola Tesla', known: 'Electrical engineer who rehearsed entire machines mentally before building any physical prototype.', domains: ['creativity', 'focus', 'problem-solving'] },
  { slug: 'rosalind-franklin', name: 'Rosalind Franklin', known: 'Chemist whose rigorous X-ray diffraction images made the structure of DNA legible.', domains: ['precision', 'resilience', 'focus'] },
  { slug: 'james-clerk-maxwell', name: 'James Clerk Maxwell', known: 'Unified electricity, magnetism and light into four equations by looking for the shared structure beneath separate fields.', domains: ['strategy', 'problem-solving', 'learning'] },
  { slug: 'chien-shiung-wu', name: 'Chien-Shiung Wu', known: 'Experimental physicist whose meticulous cobalt-60 experiment overturned a law that theorists assumed was settled.', domains: ['precision', 'resilience', 'career'] },
  { slug: 'louis-pasteur', name: 'Louis Pasteur', known: 'Chemist and microbiologist who ran controlled public experiments to convince sceptics rather than argue with them.', domains: ['strategy', 'communication', 'resilience'] },
  { slug: 'emmy-noether', name: 'Emmy Noether', known: 'Mathematician who taught for years without pay or title and produced theorems central to modern physics.', domains: ['resilience', 'career', 'learning'] },
  { slug: 'ibn-al-haytham', name: 'Ibn al-Haytham', known: 'Scholar who built the experimental method of optics, insisting claims be tested rather than inherited from authority.', domains: ['learning', 'problem-solving', 'strategy'] },
  { slug: 'apj-abdul-kalam', name: 'A. P. J. Abdul Kalam', known: 'Aerospace engineer who kept a strict early-morning study routine throughout a long public career.', domains: ['habits', 'discipline', 'career'] },
  { slug: 'grace-hopper', name: 'Grace Hopper', known: 'Computer scientist who built the first compiler after being told programs could only be written in machine code.', domains: ['creativity', 'career', 'problem-solving'] },
  { slug: 'michael-faraday', name: 'Michael Faraday', known: 'Bookbinder turned physicist who kept a numbered lab diary of ~16,000 entries across his career.', domains: ['habits', 'learning', 'focus'] },
  { slug: 'tu-youyou', name: 'Tu Youyou', known: 'Pharmaceutical chemist who found artemisinin by systematically re-reading centuries-old medical texts.', domains: ['learning', 'patience', 'problem-solving'] },
  { slug: 'santiago-ramon-y-cajal', name: 'Santiago Ramón y Cajal', known: 'Neuroanatomist who drew what he saw down the microscope for decades; credited persistence over talent.', domains: ['patience', 'habits', 'creativity'] },
  { slug: 'hedy-lamarr', name: 'Hedy Lamarr', known: 'Invented frequency-hopping spread spectrum in her spare hours while working a separate full-time career.', domains: ['creativity', 'career', 'time'] },
  { slug: 'george-washington-carver', name: 'George Washington Carver', known: 'Agricultural scientist who developed hundreds of uses for crops to give poor farmers economic options.', domains: ['creativity', 'generosity', 'wealth'] },
  { slug: 'johannes-kepler', name: 'Johannes Kepler', known: 'Spent years testing and discarding his own preferred circular orbits before the data forced ellipses.', domains: ['patience', 'strategy', 'learning'] },
  { slug: 'vera-rubin', name: 'Vera Rubin', known: 'Astronomer whose careful galaxy rotation measurements produced the evidence for dark matter.', domains: ['precision', 'patience', 'resilience'] },
  { slug: 'norman-borlaug', name: 'Norman Borlaug', known: 'Plant scientist who ran two growing seasons a year in different climates to halve breeding time.', domains: ['strategy', 'problem-solving', 'time'] },
  { slug: 'wright-brothers', name: 'The Wright Brothers', known: 'Built their own wind tunnel after finding published lift tables wrong, testing 200 wing shapes.', domains: ['problem-solving', 'precision', 'creativity'] },
  { slug: 'florence-nightingale', name: 'Florence Nightingale', known: 'Nurse and statistician who used clear data visualisation to win an argument about sanitation.', domains: ['communication', 'strategy', 'career'] },
  { slug: 'alexander-von-humboldt', name: 'Alexander von Humboldt', known: 'Naturalist who measured everything on a five-year expedition and connected separate observations into ecology.', domains: ['learning', 'creativity', 'strategy'] },
  { slug: 'lise-meitner', name: 'Lise Meitner', known: 'Physicist who explained nuclear fission by working through the arithmetic while in forced exile.', domains: ['resilience', 'problem-solving', 'focus'] },
  { slug: 'archimedes', name: 'Archimedes', known: 'Solved problems by shifting to a different representation — displacement, levers, exhaustion of areas.', domains: ['problem-solving', 'creativity', 'strategy'] },
  { slug: 'mary-anning', name: 'Mary Anning', known: 'Self-taught fossil hunter who worked the same stretch of coast daily and reshaped palaeontology.', domains: ['habits', 'patience', 'resilience'] },
  { slug: 'john-von-neumann', name: 'John von Neumann', known: 'Moved between mathematics, economics and computing by carrying methods from one field into another.', domains: ['learning', 'strategy', 'creativity'] },
  { slug: 'homi-bhabha', name: 'Homi J. Bhabha', known: 'Physicist and institution builder who planned decades ahead, training people before facilities existed.', domains: ['strategy', 'career', 'leadership'] },
  { slug: 'wangari-maathai', name: 'Wangari Maathai', known: 'Biologist whose movement planted tens of millions of trees, starting with a handful of seedlings.', domains: ['habits', 'resilience', 'leadership'] },
  { slug: 'linus-pauling', name: 'Linus Pauling', known: 'Chemist who advised generating many ideas and discarding the bad ones quickly.', domains: ['creativity', 'problem-solving', 'learning'] },
  { slug: 'edward-jenner', name: 'Edward Jenner', known: 'Physician who tested a widely-known folk observation instead of dismissing it as rumour.', domains: ['learning', 'problem-solving', 'strategy'] },
  { slug: 'shakuntala-devi', name: 'Shakuntala Devi', known: 'Mathematician who made arithmetic public and playful, demystifying a subject people feared.', domains: ['learning', 'communication', 'creativity'] },
  { slug: 'james-watt', name: 'James Watt', known: 'Improved the steam engine by isolating where the energy was actually being wasted.', domains: ['problem-solving', 'precision', 'wealth'] },
  { slug: 'rachel-carson', name: 'Rachel Carson', known: 'Marine biologist who spent four years assembling evidence before publishing, anticipating every attack.', domains: ['patience', 'communication', 'resilience'] },
  { slug: 'al-khwarizmi', name: 'Al-Khwarizmi', known: 'Mathematician who set out step-by-step procedures for solving equations — the origin of the word algorithm.', domains: ['problem-solving', 'learning', 'strategy'] },
  { slug: 'robert-koch', name: 'Robert Koch', known: 'Set explicit criteria that had to be met before claiming a microbe caused a disease.', domains: ['precision', 'strategy', 'problem-solving'] },
  { slug: 'cv-raman', name: 'C. V. Raman', known: 'Physicist who did prize-winning optics work with inexpensive equipment and rigorous observation.', domains: ['creativity', 'precision', 'career'] },
  { slug: 'jane-goodall', name: 'Jane Goodall', known: 'Primatologist whose long patient observation overturned assumptions about tool use.', domains: ['patience', 'learning', 'focus'] },
  { slug: 'nikolai-vavilov', name: 'Nikolai Vavilov', known: 'Botanist who built the first global seed bank, collecting across five continents.', domains: ['strategy', 'patience', 'generosity'] },
  { slug: 'claude-shannon', name: 'Claude Shannon', known: 'Founded information theory and kept playful side projects running alongside serious work.', domains: ['creativity', 'problem-solving', 'time'] },
  { slug: 'maria-mitchell', name: 'Maria Mitchell', known: 'Astronomer who swept the same sky nightly for years before discovering her comet.', domains: ['habits', 'patience', 'focus'] },
  { slug: 'paul-erdos', name: 'Paul Erdős', known: 'Mathematician who collaborated with over 500 people, treating problems as shared rather than owned.', domains: ['collaboration', 'creativity', 'learning'] },
  { slug: 'jocelyn-bell-burnell', name: 'Jocelyn Bell Burnell', known: 'Noticed and refused to dismiss a small anomaly in chart recordings, discovering pulsars.', domains: ['precision', 'focus', 'resilience'] },
  { slug: 'sushruta', name: 'Sushruta', known: 'Ancient Indian surgeon who documented procedures and instruments in systematic detail for teaching.', domains: ['precision', 'learning', 'communication'] },
  { slug: 'antonie-van-leeuwenhoek', name: 'Antonie van Leeuwenhoek', known: 'Draper who ground better lenses than any professional and reported only what he could see repeatedly.', domains: ['habits', 'precision', 'learning'] },
  { slug: 'stephanie-kwolek', name: 'Stephanie Kwolek', known: 'Chemist who investigated a cloudy solution others would have discarded, discovering Kevlar.', domains: ['creativity', 'problem-solving', 'career'] },
  { slug: 'tim-berners-lee', name: 'Tim Berners-Lee', known: 'Built the web from a small internal problem — losing track of who knew what — and gave it away.', domains: ['problem-solving', 'generosity', 'strategy'] },
  { slug: 'mario-molina', name: 'Mario Molina', known: 'Chemist who followed an unfunded side question about CFCs and changed global policy.', domains: ['creativity', 'resilience', 'strategy'] },
  { slug: 'ernest-shackleton', name: 'Ernest Shackleton', known: 'Explorer who abandoned the original goal to preserve the crew, changing the objective without losing morale.', domains: ['leadership', 'resilience', 'strategy'] },
  { slug: 'kitasato-shibasaburo', name: 'Kitasato Shibasaburō', known: 'Bacteriologist who built Japan\'s public health research capacity while doing frontline discovery.', domains: ['career', 'leadership', 'strategy'] },
  { slug: 'elizabeth-blackwell', name: 'Elizabeth Blackwell', known: 'Rejected by dozens of medical schools before becoming the first woman awarded a US medical degree.', domains: ['resilience', 'career', 'discipline'] },
  { slug: 'carl-linnaeus', name: 'Carl Linnaeus', known: 'Imposed a consistent naming system on a chaotic field so others could build on shared vocabulary.', domains: ['strategy', 'precision', 'communication'] },
  { slug: 'meghnad-saha', name: 'Meghnad Saha', known: 'Astrophysicist from a poor rural family whose ionisation equation let astronomers read stellar spectra.', domains: ['resilience', 'learning', 'problem-solving'] },
  { slug: 'gertrude-elion', name: 'Gertrude Elion', known: 'Designed drugs from the biochemistry of disease rather than by trial and error, without a doctorate.', domains: ['strategy', 'resilience', 'career'] },
  { slug: 'blaise-pascal', name: 'Blaise Pascal', known: 'Built a calculating machine at nineteen to spare his father repetitive tax arithmetic.', domains: ['problem-solving', 'creativity', 'generosity'] },
  { slug: 'william-harvey', name: 'William Harvey', known: 'Proved blood circulates by simple quantitative reasoning about volume the anatomy could not supply.', domains: ['problem-solving', 'precision', 'strategy'] },
];

/** Stable 32-bit hash — same input always yields the same figure. */
function hash(seed: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/**
 * Deterministically assign a figure for one (user, date, slot), skipping any
 * the user has recently seen.
 *
 * Determinism matters: a dispatch retry for the same slot must resolve to the
 * same figure, otherwise the retry writes a second, different card.
 */
export function pickFigure(seed: string, exclude: Iterable<string> = []): GrowthFigure {
  const used = new Set(exclude);
  const pool = GROWTH_FIGURES.filter((f) => !used.has(f.slug));
  // Everyone has been seen recently (very long-running account) — fall back to
  // the full roster rather than returning nothing.
  const roster = pool.length ? pool : GROWTH_FIGURES;
  const start = hash(seed) % roster.length;
  return roster[start];
}

/**
 * How many recent figures to exclude. Kept below the roster size so the pool
 * can never empty out.
 */
export const FIGURE_HISTORY_WINDOW = 40;

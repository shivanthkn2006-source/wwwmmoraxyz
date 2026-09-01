/**
 * ═══════════════════════════════════════════════════════════════════════════
 * GROWTH FIGURES ROSTER
 *
 * Pure data + a deterministic, resonance-weighted picker. Deliberately free of
 * any Deno or provider imports so the app test suite can import it directly.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Why it exists: the biographical prompt used to carry no identity and no
 * history — just {slot, focus_areas, style}. Every user with the same window
 * and style therefore received the statistically modal answer, which is
 * overwhelmingly Benjamin Franklin. An audit of stored cards found him in
 * ~70% of biographical insights across users with different birth dates.
 *
 * The fix is NOT to ban the famous names — a roster without Newton, Einstein
 * or Gandhi is a worse product. The fix is to stop asking the model to "pick
 * someone" at all, and instead ASSIGN a figure per (user, date, slot) from a
 * wide roster, filtered against what that member has already been shown. A
 * famous name then appears at its fair 1/N share instead of 70%.
 *
 * Three signals shape the assignment (see pickFigure):
 *   1. slot affinity   — a documented early riser for the morning card, a
 *                        philosopher for the evening reflection, and so on;
 *   2. birth resonance — figures who share the member's birth month, or who
 *                        hit their defining milestone at the member's current
 *                        age ("at exactly your age, she…");
 *   3. seeded spread   — a hash tiebreak so members who share a birth month
 *                        still diverge, and so a retry is idempotent.
 */

export type FigureSlot = 'morning' | 'midday' | 'afternoon' | 'evening' | 'night';

export type Discipline =
  | 'science' | 'mathematics' | 'engineering' | 'medicine'
  | 'philosophy' | 'letters' | 'arts'
  | 'enterprise' | 'leadership' | 'social' | 'exploration' | 'sport';

/**
 * Documented daily working rhythm. Set to 'any' unless the rhythm is genuinely
 * attested — inventing a chronotype would defeat the point of the fact anchor.
 */
export type Chronotype = 'early' | 'late' | 'any';

export interface GrowthFigure {
  slug: string;
  name: string;
  /** One-line grounding so the model writes fact, not invention. */
  known: string;
  /** Focus areas this figure speaks to most naturally. */
  domains: string[];
  /** ISO birth date where reliably known, else null (ancient/disputed). */
  born: string | null;
  region: string;
  discipline: Discipline;
  chronotype: Chronotype;
  /** Age at their defining milestone, for "at your age…" resonance. */
  milestoneAge: number | null;
  /** What happened at that age. Present iff milestoneAge is set. */
  milestone: string | null;
}

/**
 * Deliberately broad: scientists, mathematicians, engineers, physicians,
 * philosophers, writers, artists, founders, leaders, explorers and athletes
 * across eras, regions and genders. Breadth is the anti-repetition mechanism —
 * at this size a daily reader cannot loop inside a year.
 */
export const GROWTH_FIGURES: GrowthFigure[] = [
  // ── Science & mathematics ────────────────────────────────────────────────
  { slug: 'marie-curie', name: 'Marie Curie', known: 'Physicist and chemist; the only person to win Nobel Prizes in two different sciences; worked in long uninterrupted research blocks.', domains: ['focus', 'resilience', 'learning'], born: '1867-11-07', region: 'Poland/France', discipline: 'science', chronotype: 'any', milestoneAge: 36, milestone: 'shared the 1903 physics Nobel after years of processing tonnes of pitchblende by hand' },
  { slug: 'srinivasa-ramanujan', name: 'Srinivasa Ramanujan', known: 'Self-taught Indian mathematician who filled notebooks with thousands of results derived largely without formal training.', domains: ['learning', 'creativity', 'focus'], born: '1887-12-22', region: 'India', discipline: 'mathematics', chronotype: 'any', milestoneAge: 26, milestone: 'wrote to Hardy at Cambridge with 120 theorems and changed his life with one letter' },
  { slug: 'richard-feynman', name: 'Richard Feynman', known: 'Physicist known for explaining ideas in plain language and for keeping a notebook of problems he did not yet understand.', domains: ['learning', 'creativity', 'problem-solving'], born: '1918-05-11', region: 'United States', discipline: 'science', chronotype: 'any', milestoneAge: 24, milestone: 'was leading a group at Los Alamos while still finishing his doctorate' },
  { slug: 'barbara-mcclintock', name: 'Barbara McClintock', known: 'Geneticist who discovered transposable elements after decades of patient maize observation, long before the field accepted it.', domains: ['patience', 'resilience', 'focus'], born: '1902-06-16', region: 'United States', discipline: 'science', chronotype: 'any', milestoneAge: 81, milestone: 'received the Nobel more than thirty years after the work was dismissed' },
  { slug: 'katherine-johnson', name: 'Katherine Johnson', known: 'NASA mathematician whose hand-checked orbital calculations were trusted over early computers for the Mercury and Apollo flights.', domains: ['precision', 'career', 'resilience'], born: '1918-08-26', region: 'United States', discipline: 'mathematics', chronotype: 'any', milestoneAge: 43, milestone: 'was asked personally by John Glenn to verify the computer before he would fly' },
  { slug: 'alan-turing', name: 'Alan Turing', known: 'Mathematician who formalised computation and broke wartime ciphers by decomposing an impossible problem into mechanisable parts.', domains: ['problem-solving', 'strategy', 'focus'], born: '1912-06-23', region: 'United Kingdom', discipline: 'mathematics', chronotype: 'any', milestoneAge: 24, milestone: 'published the paper defining the universal machine at twenty-four' },
  { slug: 'charles-darwin', name: 'Charles Darwin', known: 'Naturalist who spent over twenty years gathering evidence and deliberately recorded facts that contradicted his own theory.', domains: ['patience', 'learning', 'strategy'], born: '1809-02-12', region: 'United Kingdom', discipline: 'science', chronotype: 'early', milestoneAge: 22, milestone: 'sailed on the Beagle at twenty-two and spent five years collecting' },
  { slug: 'ada-lovelace', name: 'Ada Lovelace', known: 'Wrote the first published algorithm for a machine and foresaw computers manipulating symbols, not just numbers.', domains: ['creativity', 'learning', 'career'], born: '1815-12-10', region: 'United Kingdom', discipline: 'mathematics', chronotype: 'any', milestoneAge: 27, milestone: 'published the notes containing the first algorithm at twenty-seven' },
  { slug: 'gregor-mendel', name: 'Gregor Mendel', known: 'Monk who tracked roughly 28,000 pea plants over eight years to find inheritance ratios nobody had measured.', domains: ['patience', 'habits', 'precision'], born: '1822-07-20', region: 'Moravia', discipline: 'science', chronotype: 'early', milestoneAge: 43, milestone: 'presented eight years of pea data to a room that did not understand it' },
  { slug: 'dorothy-hodgkin', name: 'Dorothy Hodgkin', known: 'Chemist who mapped the structures of penicillin, insulin and B12 through years of painstaking X-ray crystallography.', domains: ['patience', 'focus', 'resilience'], born: '1910-05-12', region: 'United Kingdom', discipline: 'science', chronotype: 'any', milestoneAge: 54, milestone: 'won the chemistry Nobel after a 35-year pursuit of insulin' },
  { slug: 'jagadish-chandra-bose', name: 'Jagadish Chandra Bose', known: 'Indian polymath in radio science and plant physiology who declined to patent his work so others could build on it.', domains: ['creativity', 'generosity', 'career'], born: '1858-11-30', region: 'India', discipline: 'science', chronotype: 'any', milestoneAge: 36, milestone: 'demonstrated wireless transmission publicly in Kolkata in 1895' },
  { slug: 'nikola-tesla', name: 'Nikola Tesla', known: 'Electrical engineer who rehearsed entire machines mentally before building any physical prototype, and habitually worked deep into the night.', domains: ['creativity', 'focus', 'problem-solving'], born: '1856-07-10', region: 'Serbia/United States', discipline: 'engineering', chronotype: 'late', milestoneAge: 31, milestone: 'filed the alternating-current motor patents that electrified the world' },
  { slug: 'rosalind-franklin', name: 'Rosalind Franklin', known: 'Chemist whose rigorous X-ray diffraction images made the structure of DNA legible.', domains: ['precision', 'resilience', 'focus'], born: '1920-07-25', region: 'United Kingdom', discipline: 'science', chronotype: 'any', milestoneAge: 31, milestone: 'produced Photo 51, the image that settled the double helix' },
  { slug: 'james-clerk-maxwell', name: 'James Clerk Maxwell', known: 'Unified electricity, magnetism and light into four equations by looking for the shared structure beneath separate fields.', domains: ['strategy', 'problem-solving', 'learning'], born: '1831-06-13', region: 'United Kingdom', discipline: 'science', chronotype: 'any', milestoneAge: 33, milestone: 'published the electromagnetic theory of light at thirty-three' },
  { slug: 'chien-shiung-wu', name: 'Chien-Shiung Wu', known: 'Experimental physicist whose meticulous cobalt-60 experiment overturned a law that theorists assumed was settled.', domains: ['precision', 'resilience', 'career'], born: '1912-05-31', region: 'China/United States', discipline: 'science', chronotype: 'any', milestoneAge: 44, milestone: 'disproved the conservation of parity that every theorist took for granted' },
  { slug: 'louis-pasteur', name: 'Louis Pasteur', known: 'Chemist and microbiologist who ran controlled public experiments to convince sceptics rather than argue with them.', domains: ['strategy', 'communication', 'resilience'], born: '1822-12-27', region: 'France', discipline: 'science', chronotype: 'any', milestoneAge: 59, milestone: 'staged the public Pouilly-le-Fort anthrax trial and won the argument with evidence' },
  { slug: 'emmy-noether', name: 'Emmy Noether', known: 'Mathematician who taught for years without pay or title and produced theorems central to modern physics.', domains: ['resilience', 'career', 'learning'], born: '1882-03-23', region: 'Germany', discipline: 'mathematics', chronotype: 'any', milestoneAge: 33, milestone: 'proved the symmetry theorem that underpins modern physics while unpaid' },
  { slug: 'ibn-al-haytham', name: 'Ibn al-Haytham', known: 'Scholar who built the experimental method of optics, insisting claims be tested rather than inherited from authority.', domains: ['learning', 'problem-solving', 'strategy'], born: null, region: 'Iraq/Egypt', discipline: 'science', chronotype: 'any', milestoneAge: null, milestone: null },
  { slug: 'apj-abdul-kalam', name: 'A. P. J. Abdul Kalam', known: 'Aerospace engineer and president who kept a strict early-morning study routine throughout a long public career.', domains: ['habits', 'discipline', 'career'], born: '1931-10-15', region: 'India', discipline: 'engineering', chronotype: 'early', milestoneAge: 49, milestone: 'led the team that put India\'s first indigenous satellite into orbit' },
  { slug: 'grace-hopper', name: 'Grace Hopper', known: 'Computer scientist who built the first compiler after being told programs could only be written in machine code.', domains: ['creativity', 'career', 'problem-solving'], born: '1906-12-09', region: 'United States', discipline: 'engineering', chronotype: 'any', milestoneAge: 45, milestone: 'shipped the first working compiler against unanimous expert advice' },
  { slug: 'michael-faraday', name: 'Michael Faraday', known: 'Bookbinder turned physicist who kept a numbered laboratory diary of roughly 16,000 entries across his career.', domains: ['habits', 'learning', 'focus'], born: '1791-09-22', region: 'United Kingdom', discipline: 'science', chronotype: 'early', milestoneAge: 40, milestone: 'discovered electromagnetic induction with almost no formal schooling' },
  { slug: 'tu-youyou', name: 'Tu Youyou', known: 'Pharmaceutical chemist who found artemisinin by systematically re-reading centuries-old medical texts.', domains: ['learning', 'patience', 'problem-solving'], born: '1930-12-30', region: 'China', discipline: 'medicine', chronotype: 'any', milestoneAge: 41, milestone: 'extracted artemisinin after screening 2,000 traditional recipes' },
  { slug: 'santiago-ramon-y-cajal', name: 'Santiago Ramón y Cajal', known: 'Neuroanatomist who drew what he saw down the microscope for decades and credited persistence over talent.', domains: ['patience', 'habits', 'creativity'], born: '1852-05-01', region: 'Spain', discipline: 'medicine', chronotype: 'any', milestoneAge: 54, milestone: 'won the Nobel for drawings made one neuron at a time' },
  { slug: 'hedy-lamarr', name: 'Hedy Lamarr', known: 'Invented frequency-hopping spread spectrum in her spare hours while working a separate full-time career.', domains: ['creativity', 'career', 'time'], born: '1914-11-09', region: 'Austria/United States', discipline: 'engineering', chronotype: 'any', milestoneAge: 27, milestone: 'patented the spread-spectrum idea behind modern wireless while acting full time' },
  { slug: 'george-washington-carver', name: 'George Washington Carver', known: 'Agricultural scientist who developed hundreds of uses for crops to give poor farmers economic options.', domains: ['creativity', 'generosity', 'wealth'], born: null, region: 'United States', discipline: 'science', chronotype: 'early', milestoneAge: null, milestone: null },
  { slug: 'johannes-kepler', name: 'Johannes Kepler', known: 'Spent years testing and discarding his own preferred circular orbits before the data forced ellipses.', domains: ['patience', 'strategy', 'learning'], born: '1571-12-27', region: 'Germany', discipline: 'science', chronotype: 'any', milestoneAge: 38, milestone: 'abandoned a theory he loved because eight minutes of arc would not fit' },
  { slug: 'vera-rubin', name: 'Vera Rubin', known: 'Astronomer whose careful galaxy rotation measurements produced the evidence for dark matter.', domains: ['precision', 'patience', 'resilience'], born: '1928-07-23', region: 'United States', discipline: 'science', chronotype: 'any', milestoneAge: 42, milestone: 'measured rotation curves that implied most of the universe is unseen' },
  { slug: 'norman-borlaug', name: 'Norman Borlaug', known: 'Plant scientist who ran two growing seasons a year in different climates to halve his breeding time.', domains: ['strategy', 'problem-solving', 'time'], born: '1914-03-25', region: 'United States', discipline: 'science', chronotype: 'early', milestoneAge: 56, milestone: 'won the Peace Nobel for wheat credited with saving a billion lives' },
  { slug: 'wright-brothers', name: 'The Wright Brothers', known: 'Built their own wind tunnel after finding the published lift tables wrong, then tested some 200 wing shapes.', domains: ['problem-solving', 'precision', 'creativity'], born: null, region: 'United States', discipline: 'engineering', chronotype: 'any', milestoneAge: null, milestone: null },
  { slug: 'florence-nightingale', name: 'Florence Nightingale', known: 'Nurse and statistician who used clear data visualisation to win an argument about sanitation.', domains: ['communication', 'strategy', 'career'], born: '1820-05-12', region: 'United Kingdom', discipline: 'medicine', chronotype: 'any', milestoneAge: 38, milestone: 'invented the polar-area diagram to make mortality data impossible to ignore' },
  { slug: 'alexander-von-humboldt', name: 'Alexander von Humboldt', known: 'Naturalist who measured everything on a five-year expedition and connected separate observations into ecology.', domains: ['learning', 'creativity', 'strategy'], born: '1769-09-14', region: 'Germany', discipline: 'exploration', chronotype: 'any', milestoneAge: 30, milestone: 'set out on the five-year expedition that invented ecological thinking' },
  { slug: 'lise-meitner', name: 'Lise Meitner', known: 'Physicist who explained nuclear fission by working through the arithmetic while in forced exile.', domains: ['resilience', 'problem-solving', 'focus'], born: '1878-11-07', region: 'Austria/Sweden', discipline: 'science', chronotype: 'any', milestoneAge: 60, milestone: 'explained fission from exile, on a walk, with a scrap of paper' },
  { slug: 'archimedes', name: 'Archimedes', known: 'Solved problems by shifting to a different representation — displacement, levers, the exhaustion of areas.', domains: ['problem-solving', 'creativity', 'strategy'], born: null, region: 'Sicily', discipline: 'mathematics', chronotype: 'any', milestoneAge: null, milestone: null },
  { slug: 'mary-anning', name: 'Mary Anning', known: 'Self-taught fossil hunter who worked the same stretch of coast daily and reshaped palaeontology.', domains: ['habits', 'patience', 'resilience'], born: '1799-05-21', region: 'United Kingdom', discipline: 'science', chronotype: 'early', milestoneAge: 12, milestone: 'uncovered her first complete ichthyosaur skeleton as a child' },
  { slug: 'john-von-neumann', name: 'John von Neumann', known: 'Moved between mathematics, economics and computing by carrying methods from one field into another.', domains: ['learning', 'strategy', 'creativity'], born: '1903-12-28', region: 'Hungary/United States', discipline: 'mathematics', chronotype: 'any', milestoneAge: 41, milestone: 'sketched the stored-program computer architecture still used today' },
  { slug: 'homi-bhabha', name: 'Homi J. Bhabha', known: 'Physicist and institution builder who founded India\'s nuclear research programme from a single department.', domains: ['strategy', 'career', 'leadership'], born: '1909-10-30', region: 'India', discipline: 'science', chronotype: 'any', milestoneAge: 36, milestone: 'founded a national research institute with a letter and a plan' },
  { slug: 'isaac-newton', name: 'Isaac Newton', known: 'Developed calculus, optics and the laws of motion during an eighteen-month plague isolation away from Cambridge.', domains: ['focus', 'problem-solving', 'learning'], born: '1643-01-04', region: 'United Kingdom', discipline: 'science', chronotype: 'late', milestoneAge: 23, milestone: 'used a plague year at home to invent calculus and the theory of gravity' },
  { slug: 'albert-einstein', name: 'Albert Einstein', known: 'Published four papers that reshaped physics in one year while working full time as a patent clerk.', domains: ['creativity', 'focus', 'career'], born: '1879-03-14', region: 'Germany/United States', discipline: 'science', chronotype: 'any', milestoneAge: 26, milestone: 'wrote four field-changing papers in his spare hours as a patent examiner' },
  { slug: 'niels-bohr', name: 'Niels Bohr', known: 'Physicist who built an institute around argument, insisting every idea be attacked before it was believed.', domains: ['learning', 'communication', 'strategy'], born: '1885-10-07', region: 'Denmark', discipline: 'science', chronotype: 'any', milestoneAge: 28, milestone: 'published the atomic model that made quantum theory concrete' },
  { slug: 'max-planck', name: 'Max Planck', known: 'Physicist who accepted a result he personally disliked because the mathematics demanded it.', domains: ['resilience', 'learning', 'precision'], born: '1858-04-23', region: 'Germany', discipline: 'science', chronotype: 'any', milestoneAge: 42, milestone: 'introduced the quantum as a reluctant act of desperation that proved right' },
  { slug: 'cv-raman', name: 'C. V. Raman', known: 'Physicist who did Nobel-winning optics work in a borrowed laboratory outside his day job at the finance department.', domains: ['focus', 'career', 'creativity'], born: '1888-11-07', region: 'India', discipline: 'science', chronotype: 'early', milestoneAge: 40, milestone: 'discovered the scattering effect named after him using inexpensive equipment' },
  { slug: 'subrahmanyan-chandrasekhar', name: 'Subrahmanyan Chandrasekhar', known: 'Astrophysicist whose stellar limit was publicly ridiculed for decades before being vindicated.', domains: ['resilience', 'patience', 'precision'], born: '1910-10-19', region: 'India/United States', discipline: 'science', chronotype: 'any', milestoneAge: 19, milestone: 'derived the white-dwarf mass limit on a ship at nineteen' },
  { slug: 'har-gobind-khorana', name: 'Har Gobind Khorana', known: 'Biochemist who helped crack the genetic code after moving countries repeatedly for a place to work.', domains: ['resilience', 'career', 'focus'], born: '1922-01-09', region: 'India/United States', discipline: 'science', chronotype: 'any', milestoneAge: 46, milestone: 'shared the Nobel for showing how the genetic code builds proteins' },
  { slug: 'katalin-kariko', name: 'Katalin Karikó', known: 'Biochemist demoted and defunded for years over mRNA research that later enabled the covid vaccines.', domains: ['resilience', 'patience', 'career'], born: '1955-01-17', region: 'Hungary/United States', discipline: 'medicine', chronotype: 'any', milestoneAge: 68, milestone: 'won the Nobel for work she was demoted for pursuing' },
  { slug: 'jennifer-doudna', name: 'Jennifer Doudna', known: 'Biochemist who turned a bacterial immune curiosity into the CRISPR gene-editing tool.', domains: ['creativity', 'problem-solving', 'career'], born: '1964-02-19', region: 'United States', discipline: 'science', chronotype: 'any', milestoneAge: 48, milestone: 'published the CRISPR editing method that rewrote biotechnology' },
  { slug: 'frances-arnold', name: 'Frances Arnold', known: 'Engineer who applied directed evolution to enzymes rather than trying to design them rationally.', domains: ['strategy', 'creativity', 'problem-solving'], born: '1956-07-25', region: 'United States', discipline: 'engineering', chronotype: 'any', milestoneAge: 62, milestone: 'won the Nobel for letting selection solve what design could not' },
  { slug: 'rita-levi-montalcini', name: 'Rita Levi-Montalcini', known: 'Neurologist who ran experiments in a bedroom laboratory after being barred from academic work.', domains: ['resilience', 'creativity', 'focus'], born: '1909-04-22', region: 'Italy', discipline: 'medicine', chronotype: 'any', milestoneAge: 77, milestone: 'won the Nobel for nerve growth factor, begun in a home laboratory' },
  { slug: 'gertrude-elion', name: 'Gertrude Elion', known: 'Pharmacologist who designed drugs from disease mechanism rather than trial and error, without ever holding a doctorate.', domains: ['strategy', 'career', 'problem-solving'], born: '1918-01-23', region: 'United States', discipline: 'medicine', chronotype: 'any', milestoneAge: 70, milestone: 'won the Nobel for rational drug design without a PhD' },
  { slug: 'shakuntala-devi', name: 'Shakuntala Devi', known: 'Mental calculator who multiplied thirteen-digit numbers faster than the computers of her day.', domains: ['focus', 'learning', 'precision'], born: '1929-11-04', region: 'India', discipline: 'mathematics', chronotype: 'any', milestoneAge: 50, milestone: 'beat a computer at thirteen-digit multiplication in front of witnesses' },
  { slug: 'margaret-hamilton', name: 'Margaret Hamilton', known: 'Engineer who coined "software engineering" and wrote the error-handling that saved the Apollo 11 landing.', domains: ['precision', 'career', 'problem-solving'], born: '1936-08-17', region: 'United States', discipline: 'engineering', chronotype: 'any', milestoneAge: 32, milestone: 'wrote the priority code that let Apollo 11 land through an alarm storm' },
  { slug: 'tim-berners-lee', name: 'Tim Berners-Lee', known: 'Invented the web as a side project to solve his own laboratory\'s document-sharing problem, then gave it away royalty-free.', domains: ['creativity', 'generosity', 'strategy'], born: '1955-06-08', region: 'United Kingdom', discipline: 'engineering', chronotype: 'any', milestoneAge: 34, milestone: 'wrote the proposal for the web to fix an internal filing problem' },
  { slug: 'linus-torvalds', name: 'Linus Torvalds', known: 'Released an unfinished hobby kernel publicly and let contributions from strangers finish it.', domains: ['career', 'strategy', 'creativity'], born: '1969-12-28', region: 'Finland', discipline: 'engineering', chronotype: 'any', milestoneAge: 21, milestone: 'posted a "just a hobby, won\'t be big" kernel that now runs most of the internet' },
  { slug: 'dennis-ritchie', name: 'Dennis Ritchie', known: 'Designed C and co-created Unix by ruthlessly removing features rather than adding them.', domains: ['strategy', 'precision', 'problem-solving'], born: '1941-09-09', region: 'United States', discipline: 'engineering', chronotype: 'any', milestoneAge: 31, milestone: 'built the language most software is still ultimately written on top of' },

  // ── Philosophy & thought ─────────────────────────────────────────────────
  { slug: 'marcus-aurelius', name: 'Marcus Aurelius', known: 'Roman emperor who wrote private notes to himself each night, never intending them to be read.', domains: ['reflection', 'resilience', 'habits'], born: '121-04-26', region: 'Rome', discipline: 'philosophy', chronotype: 'early', milestoneAge: null, milestone: null },
  { slug: 'seneca', name: 'Seneca', known: 'Stoic writer who reviewed each day at night, asking what he had done badly and what he had improved.', domains: ['reflection', 'habits', 'time'], born: null, region: 'Rome', discipline: 'philosophy', chronotype: 'late', milestoneAge: null, milestone: null },
  { slug: 'epictetus', name: 'Epictetus', known: 'Born enslaved and later taught that the only reliable freedom is control over one\'s own judgements.', domains: ['resilience', 'reflection', 'emotion'], born: null, region: 'Greece/Rome', discipline: 'philosophy', chronotype: 'any', milestoneAge: null, milestone: null },
  { slug: 'confucius', name: 'Confucius', known: 'Teacher who framed character as the accumulation of small daily rites rather than grand gestures.', domains: ['habits', 'reflection', 'relationships'], born: null, region: 'China', discipline: 'philosophy', chronotype: 'any', milestoneAge: null, milestone: null },
  { slug: 'lao-tzu', name: 'Lao Tzu', known: 'Taoist thinker who argued that acting with the grain of a situation beats forcing it.', domains: ['reflection', 'strategy', 'emotion'], born: null, region: 'China', discipline: 'philosophy', chronotype: 'any', milestoneAge: null, milestone: null },
  { slug: 'chanakya', name: 'Chanakya', known: 'Indian strategist and economist whose Arthashastra treated planning, incentives and risk as a single system.', domains: ['strategy', 'wealth', 'leadership'], born: null, region: 'India', discipline: 'philosophy', chronotype: 'any', milestoneAge: null, milestone: null },
  { slug: 'montaigne', name: 'Michel de Montaigne', known: 'Invented the personal essay by writing to find out what he actually thought.', domains: ['reflection', 'learning', 'creativity'], born: '1533-02-28', region: 'France', discipline: 'philosophy', chronotype: 'any', milestoneAge: 38, milestone: 'retired to a tower library at thirty-eight to think and write' },
  { slug: 'immanuel-kant', name: 'Immanuel Kant', known: 'Philosopher whose daily walk was so punctual that neighbours reportedly set their clocks by it.', domains: ['habits', 'discipline', 'reflection'], born: '1724-04-22', region: 'Prussia', discipline: 'philosophy', chronotype: 'early', milestoneAge: 57, milestone: 'published the Critique of Pure Reason after eleven silent years' },
  { slug: 'rene-descartes', name: 'René Descartes', known: 'Worked from bed in the late morning by lifelong habit and rebuilt knowledge from what he could not doubt.', domains: ['reflection', 'problem-solving', 'learning'], born: '1596-03-31', region: 'France', discipline: 'philosophy', chronotype: 'late', milestoneAge: 41, milestone: 'published the method of systematic doubt' },
  { slug: 'baruch-spinoza', name: 'Baruch Spinoza', known: 'Ground optical lenses for a living so his philosophy would never depend on a patron.', domains: ['career', 'reflection', 'resilience'], born: '1632-11-24', region: 'Netherlands', discipline: 'philosophy', chronotype: 'any', milestoneAge: 24, milestone: 'was expelled from his community at twenty-four and refused to recant' },
  { slug: 'hannah-arendt', name: 'Hannah Arendt', known: 'Political theorist who insisted that thinking is something one must do for oneself, in public.', domains: ['reflection', 'communication', 'resilience'], born: '1906-10-14', region: 'Germany/United States', discipline: 'philosophy', chronotype: 'any', milestoneAge: 45, milestone: 'published The Origins of Totalitarianism as a stateless refugee' },
  { slug: 'simone-de-beauvoir', name: 'Simone de Beauvoir', known: 'Wrote to a fixed daily schedule for decades and treated freedom as something practised, not owned.', domains: ['habits', 'reflection', 'career'], born: '1908-01-09', region: 'France', discipline: 'philosophy', chronotype: 'any', milestoneAge: 41, milestone: 'published The Second Sex after fourteen months of daily work' },
  { slug: 'bertrand-russell', name: 'Bertrand Russell', known: 'Worked in short concentrated stints and argued that the ability to fill leisure well is a mark of maturity.', domains: ['time', 'reflection', 'learning'], born: '1872-05-18', region: 'United Kingdom', discipline: 'philosophy', chronotype: 'any', milestoneAge: 38, milestone: 'finished Principia Mathematica after a decade that exhausted him' },
  { slug: 'viktor-frankl', name: 'Viktor Frankl', known: 'Psychiatrist who found that a reason to live predicted survival better than physical strength.', domains: ['resilience', 'emotion', 'reflection'], born: '1905-03-26', region: 'Austria', discipline: 'philosophy', chronotype: 'any', milestoneAge: 40, milestone: 'wrote Man\'s Search for Meaning in nine days after the camps' },
  { slug: 'carl-jung', name: 'Carl Jung', known: 'Psychiatrist who kept a stone tower without electricity as a place to think without interruption.', domains: ['reflection', 'creativity', 'emotion'], born: '1875-07-26', region: 'Switzerland', discipline: 'philosophy', chronotype: 'any', milestoneAge: 47, milestone: 'built a retreat by hand as a deliberate escape from modern distraction' },
  { slug: 'william-james', name: 'William James', known: 'Psychologist who argued that habit is the flywheel of society and that attention is a trainable skill.', domains: ['habits', 'focus', 'learning'], born: '1842-01-11', region: 'United States', discipline: 'philosophy', chronotype: 'any', milestoneAge: 48, milestone: 'published the Principles of Psychology after twelve years of writing' },
  { slug: 'swami-vivekananda', name: 'Swami Vivekananda', known: 'Monk who taught concentration as the single skill underlying every other, and spoke without notes.', domains: ['focus', 'communication', 'reflection'], born: '1863-01-12', region: 'India', discipline: 'philosophy', chronotype: 'early', milestoneAge: 30, milestone: 'addressed the Chicago Parliament of Religions as an unknown at thirty' },
  { slug: 'daniel-kahneman', name: 'Daniel Kahneman', known: 'Psychologist who mapped the systematic errors of intuition and won an economics Nobel for it.', domains: ['strategy', 'reflection', 'problem-solving'], born: '1934-03-05', region: 'Israel/United States', discipline: 'philosophy', chronotype: 'any', milestoneAge: 68, milestone: 'won the economics Nobel as a psychologist who never took an economics class' },
  { slug: 'herbert-simon', name: 'Herbert Simon', known: 'Showed that good decisions under real constraints mean satisficing, not optimising.', domains: ['strategy', 'problem-solving', 'time'], born: '1916-06-15', region: 'United States', discipline: 'philosophy', chronotype: 'any', milestoneAge: 62, milestone: 'won a Nobel for explaining decision-making with limited information' },
  { slug: 'elinor-ostrom', name: 'Elinor Ostrom', known: 'Political economist who disproved the tragedy of the commons by studying what communities actually do.', domains: ['strategy', 'relationships', 'leadership'], born: '1933-08-07', region: 'United States', discipline: 'social', chronotype: 'any', milestoneAge: 76, milestone: 'became the first woman to win the economics Nobel, for fieldwork others skipped' },
  { slug: 'amartya-sen', name: 'Amartya Sen', known: 'Economist who redefined development as the expansion of real freedoms rather than income.', domains: ['strategy', 'reflection', 'wealth'], born: '1933-11-03', region: 'India', discipline: 'social', chronotype: 'any', milestoneAge: 65, milestone: 'won the economics Nobel for work on famine, welfare and capability' },

  // ── Enterprise & wealth ──────────────────────────────────────────────────
  { slug: 'benjamin-franklin', name: 'Benjamin Franklin', known: 'Printer and statesman who opened each morning asking what good he would do that day and closed it asking what good he had done.', domains: ['habits', 'reflection', 'career'], born: '1706-01-17', region: 'United States', discipline: 'enterprise', chronotype: 'early', milestoneAge: 20, milestone: 'wrote a thirteen-virtue tracking chart at twenty and used it for life' },
  { slug: 'warren-buffett', name: 'Warren Buffett', known: 'Investor who keeps most of his calendar deliberately empty and reads for hours every working day.', domains: ['wealth', 'time', 'strategy'], born: '1930-08-30', region: 'United States', discipline: 'enterprise', chronotype: 'any', milestoneAge: 11, milestone: 'bought his first shares at eleven and later called it starting too late' },
  { slug: 'charlie-munger', name: 'Charlie Munger', known: 'Investor who assembled a latticework of mental models from many disciplines and inverted every problem.', domains: ['strategy', 'learning', 'wealth'], born: '1924-01-01', region: 'United States', discipline: 'enterprise', chronotype: 'early', milestoneAge: null, milestone: null },
  { slug: 'ray-dalio', name: 'Ray Dalio', known: 'Investor who wrote down every decision rule after a wrong public call nearly ended his firm.', domains: ['strategy', 'resilience', 'wealth'], born: '1949-08-08', region: 'United States', discipline: 'enterprise', chronotype: 'any', milestoneAge: 32, milestone: 'lost everything on a confident forecast and rebuilt on written principles' },
  { slug: 'elon-musk', name: 'Elon Musk', known: 'Engineer and founder who reasons from first principles and works in scheduled blocks across companies.', domains: ['strategy', 'problem-solving', 'career'], born: '1971-06-28', region: 'South Africa/United States', discipline: 'enterprise', chronotype: 'late', milestoneAge: 31, milestone: 'put his entire proceeds from one company into two that nearly failed' },
  { slug: 'jeff-bezos', name: 'Jeff Bezos', known: 'Founder who protects his mornings for high-quality decisions and refuses to schedule early meetings.', domains: ['time', 'strategy', 'career'], born: '1964-01-12', region: 'United States', discipline: 'enterprise', chronotype: 'early', milestoneAge: 30, milestone: 'left a secure job using a regret-minimisation test he could explain in a sentence' },
  { slug: 'oprah-winfrey', name: 'Oprah Winfrey', known: 'Broadcaster who built a media company after being told she was unfit for television news.', domains: ['resilience', 'communication', 'career'], born: '1954-01-29', region: 'United States', discipline: 'enterprise', chronotype: 'early', milestoneAge: 32, milestone: 'took ownership of her own show rather than a bigger salary' },
  { slug: 'ratan-tata', name: 'Ratan Tata', known: 'Industrialist who started on the shop floor shovelling limestone before leading the group.', domains: ['career', 'leadership', 'patience'], born: '1937-12-28', region: 'India', discipline: 'enterprise', chronotype: 'any', milestoneAge: 53, milestone: 'took over a fragmented group and spent a decade unifying it' },
  { slug: 'jrd-tata', name: 'J. R. D. Tata', known: 'Aviator and industrialist who flew the first commercial mail flight in India himself.', domains: ['career', 'leadership', 'precision'], born: '1904-07-29', region: 'India', discipline: 'enterprise', chronotype: 'any', milestoneAge: 28, milestone: 'personally flew the inaugural flight of the airline he founded' },
  { slug: 'narayana-murthy', name: 'N. R. Narayana Murthy', known: 'Founder who started a software firm with borrowed capital and a written commitment to transparent governance.', domains: ['career', 'discipline', 'leadership'], born: '1946-08-20', region: 'India', discipline: 'enterprise', chronotype: 'early', milestoneAge: 35, milestone: 'founded a company on borrowed money with six colleagues' },
  { slug: 'dhirubhai-ambani', name: 'Dhirubhai Ambani', known: 'Started as a petrol-pump attendant and built one of India\'s largest industrial groups from trading.', domains: ['career', 'wealth', 'resilience'], born: '1932-12-28', region: 'India', discipline: 'enterprise', chronotype: 'early', milestoneAge: 34, milestone: 'moved from trading into manufacturing against every expert\'s advice' },
  { slug: 'jack-ma', name: 'Jack Ma', known: 'Rejected from dozens of jobs before founding a marketplace, having taught himself English by guiding tourists free.', domains: ['resilience', 'career', 'learning'], born: '1964-09-10', region: 'China', discipline: 'enterprise', chronotype: 'any', milestoneAge: 34, milestone: 'started a company in his apartment after failing the university exam twice' },
  { slug: 'bill-gates', name: 'Bill Gates', known: 'Takes twice-yearly "think weeks" alone with a stack of books and no meetings.', domains: ['learning', 'time', 'strategy'], born: '1955-10-28', region: 'United States', discipline: 'enterprise', chronotype: 'late', milestoneAge: 20, milestone: 'dropped out at twenty to take a window he judged would not stay open' },
  { slug: 'henry-ford', name: 'Henry Ford', known: 'Cut assembly time from twelve hours to ninety minutes by rethinking the sequence rather than the workers.', domains: ['strategy', 'problem-solving', 'time'], born: '1863-07-30', region: 'United States', discipline: 'enterprise', chronotype: 'early', milestoneAge: 45, milestone: 'launched the Model T after two failed companies' },
  { slug: 'andrew-carnegie', name: 'Andrew Carnegie', known: 'Started as a bobbin boy, and gave away almost his entire fortune to build free public libraries.', domains: ['wealth', 'generosity', 'career'], born: '1835-11-25', region: 'Scotland/United States', discipline: 'enterprise', chronotype: 'any', milestoneAge: 13, milestone: 'began factory work at thirteen and read borrowed books every evening' },
  { slug: 'sam-walton', name: 'Sam Walton', known: 'Visited competitors\' stores personally for decades and wrote down what they did better.', domains: ['learning', 'habits', 'strategy'], born: '1918-03-29', region: 'United States', discipline: 'enterprise', chronotype: 'early', milestoneAge: 44, milestone: 'opened his first discount store at forty-four after losing an earlier lease' },
  { slug: 'estee-lauder', name: 'Estée Lauder', known: 'Built a cosmetics house by demonstrating products on customers by hand, one face at a time.', domains: ['career', 'communication', 'patience'], born: '1908-07-01', region: 'United States', discipline: 'enterprise', chronotype: 'any', milestoneAge: 38, milestone: 'founded her company selling four products she mixed herself' },
  { slug: 'coco-chanel', name: 'Coco Chanel', known: 'Designed from what she herself wanted to wear when the industry insisted women wanted otherwise.', domains: ['creativity', 'career', 'resilience'], born: '1883-08-19', region: 'France', discipline: 'enterprise', chronotype: 'any', milestoneAge: 27, milestone: 'opened her first shop with borrowed money and one product line' },
  { slug: 'steve-jobs', name: 'Steve Jobs', known: 'Product designer who treated deciding what NOT to build as the core of strategy.', domains: ['strategy', 'creativity', 'career'], born: '1955-02-24', region: 'United States', discipline: 'enterprise', chronotype: 'early', milestoneAge: 42, milestone: 'returned to a failing company and cut the product line from dozens to four' },
  { slug: 'thomas-edison', name: 'Thomas Edison', known: 'Ran a laboratory as a systematic search process and kept over three thousand notebooks.', domains: ['habits', 'problem-solving', 'career'], born: '1847-02-11', region: 'United States', discipline: 'engineering', chronotype: 'late', milestoneAge: 32, milestone: 'shipped a practical light bulb by testing materials in bulk rather than theorising' },
  { slug: 'muhammad-yunus', name: 'Muhammad Yunus', known: 'Economist who lent 27 dollars of his own money to 42 villagers and invented microcredit from the result.', domains: ['wealth', 'generosity', 'strategy'], born: '1940-06-28', region: 'Bangladesh', discipline: 'social', chronotype: 'any', milestoneAge: 36, milestone: 'tested a banking idea with a trivial sum of his own money first' },
  { slug: 'walt-disney', name: 'Walt Disney', known: 'Went bankrupt and lost his first successful character before rebuilding on one he owned outright.', domains: ['resilience', 'creativity', 'career'], born: '1901-12-05', region: 'United States', discipline: 'enterprise', chronotype: 'any', milestoneAge: 26, milestone: 'lost the rights to his hit character and created a replacement on the train home' },

  // ── Leadership & social change ───────────────────────────────────────────
  { slug: 'mahatma-gandhi', name: 'Mahatma Gandhi', known: 'Kept a rigidly simple daily routine of early rising, walking, spinning and silence one day a week.', domains: ['habits', 'discipline', 'resilience'], born: '1869-10-02', region: 'India', discipline: 'leadership', chronotype: 'early', milestoneAge: 61, milestone: 'walked 240 miles to the sea to break a salt law with a handful of mud' },
  { slug: 'nelson-mandela', name: 'Nelson Mandela', known: 'Kept an exercise and study routine through 27 years of imprisonment and learned his opponents\' language.', domains: ['resilience', 'habits', 'leadership'], born: '1918-07-18', region: 'South Africa', discipline: 'leadership', chronotype: 'early', milestoneAge: 71, milestone: 'walked out of prison at seventy-one and chose negotiation over revenge' },
  { slug: 'abraham-lincoln', name: 'Abraham Lincoln', known: 'Wrote furious letters he deliberately never sent, filing them instead until the anger passed.', domains: ['emotion', 'communication', 'leadership'], born: '1809-02-12', region: 'United States', discipline: 'leadership', chronotype: 'any', milestoneAge: 51, milestone: 'reached the presidency after a long series of electoral defeats' },
  { slug: 'winston-churchill', name: 'Winston Churchill', known: 'Worked late by strict routine with a protected afternoon nap, and dictated rather than wrote.', domains: ['time', 'communication', 'resilience'], born: '1874-11-30', region: 'United Kingdom', discipline: 'leadership', chronotype: 'late', milestoneAge: 65, milestone: 'became prime minister at sixty-five after a decade out of favour' },
  { slug: 'br-ambedkar', name: 'B. R. Ambedkar', known: 'Jurist who studied through severe exclusion, amassed a personal library of tens of thousands of books, and drafted a constitution.', domains: ['learning', 'resilience', 'career'], born: '1891-04-14', region: 'India', discipline: 'leadership', chronotype: 'late', milestoneAge: 56, milestone: 'chaired the drafting of India\'s constitution' },
  { slug: 'sardar-patel', name: 'Vallabhbhai Patel', known: 'Administrator who unified hundreds of separate princely states largely through patient negotiation.', domains: ['strategy', 'leadership', 'communication'], born: '1875-10-31', region: 'India', discipline: 'leadership', chronotype: 'any', milestoneAge: 72, milestone: 'integrated 500-plus states into one country in under two years' },
  { slug: 'martin-luther-king-jr', name: 'Martin Luther King Jr.', known: 'Rewrote and rehearsed speeches obsessively, and led a bus boycott that lasted 381 days.', domains: ['communication', 'resilience', 'leadership'], born: '1929-01-15', region: 'United States', discipline: 'leadership', chronotype: 'late', milestoneAge: 26, milestone: 'was asked to lead the Montgomery boycott at twenty-six, weeks into the job' },
  { slug: 'rosa-parks', name: 'Rosa Parks', known: 'A trained organiser, not an accidental passenger — she had prepared for the moment for years.', domains: ['resilience', 'strategy', 'habits'], born: '1913-02-04', region: 'United States', discipline: 'social', chronotype: 'any', milestoneAge: 42, milestone: 'refused to move seats after a decade of quiet civil-rights training' },
  { slug: 'eleanor-roosevelt', name: 'Eleanor Roosevelt', known: 'Wrote a newspaper column six days a week for 26 years without missing a deadline.', domains: ['habits', 'communication', 'career'], born: '1884-10-11', region: 'United States', discipline: 'leadership', chronotype: 'early', milestoneAge: 61, milestone: 'chaired the drafting of the Universal Declaration of Human Rights' },
  { slug: 'malala-yousafzai', name: 'Malala Yousafzai', known: 'Began writing an anonymous diary about girls\' education at eleven and kept going after being shot.', domains: ['resilience', 'communication', 'learning'], born: '1997-07-12', region: 'Pakistan', discipline: 'social', chronotype: 'any', milestoneAge: 17, milestone: 'became the youngest Nobel laureate at seventeen' },
  { slug: 'wangari-maathai', name: 'Wangari Maathai', known: 'Environmentalist who organised rural women to plant tens of millions of trees, seedling by seedling.', domains: ['patience', 'leadership', 'resilience'], born: '1940-04-01', region: 'Kenya', discipline: 'social', chronotype: 'any', milestoneAge: 37, milestone: 'started a movement with seven seedlings in her own backyard' },
  { slug: 'kailash-satyarthi', name: 'Kailash Satyarthi', known: 'Gave up an engineering career to conduct thousands of raids freeing children from bonded labour.', domains: ['career', 'resilience', 'generosity'], born: '1954-01-11', region: 'India', discipline: 'social', chronotype: 'any', milestoneAge: 26, milestone: 'left engineering at twenty-six for work with no salary and real danger' },
  { slug: 'maria-montessori', name: 'Maria Montessori', known: 'Physician who redesigned education by observing what children actually did when left to choose.', domains: ['learning', 'creativity', 'career'], born: '1870-08-31', region: 'Italy', discipline: 'social', chronotype: 'any', milestoneAge: 36, milestone: 'opened a school in a slum and let observation set the curriculum' },
  { slug: 'helen-keller', name: 'Helen Keller', known: 'Deaf and blind from infancy, she learned to read several languages and earned a degree with honours.', domains: ['learning', 'resilience', 'communication'], born: '1880-06-27', region: 'United States', discipline: 'social', chronotype: 'any', milestoneAge: 24, milestone: 'graduated cum laude, the first deafblind person to earn a degree' },
  { slug: 'napoleon-bonaparte', name: 'Napoleon Bonaparte', known: 'Delayed answering most correspondence deliberately, on the theory that many problems resolve themselves.', domains: ['strategy', 'time', 'leadership'], born: '1769-08-15', region: 'France', discipline: 'leadership', chronotype: 'late', milestoneAge: 26, milestone: 'was given command of an army at twenty-six and reorganised it in weeks' },

  // ── Letters & the arts ───────────────────────────────────────────────────
  { slug: 'haruki-murakami', name: 'Haruki Murakami', known: 'Rises around four, writes five or six hours, runs ten kilometres, and repeats it for months.', domains: ['habits', 'discipline', 'creativity'], born: '1949-01-12', region: 'Japan', discipline: 'letters', chronotype: 'early', milestoneAge: 29, milestone: 'decided to write his first novel at a baseball game, aged twenty-nine' },
  { slug: 'maya-angelou', name: 'Maya Angelou', known: 'Rented a bare hotel room by the month and wrote there from seven in the morning, away from home.', domains: ['habits', 'creativity', 'focus'], born: '1928-04-04', region: 'United States', discipline: 'letters', chronotype: 'early', milestoneAge: 41, milestone: 'published her first memoir at forty-one after many other careers' },
  { slug: 'toni-morrison', name: 'Toni Morrison', known: 'Wrote before dawn around a full-time editing job and two children, because that was the only hour available.', domains: ['time', 'habits', 'career'], born: '1931-02-18', region: 'United States', discipline: 'letters', chronotype: 'early', milestoneAge: 39, milestone: 'published her first novel at thirty-nine while working full time' },
  { slug: 'leo-tolstoy', name: 'Leo Tolstoy', known: 'Kept diaries for most of his life and rewrote War and Peace repeatedly by hand.', domains: ['reflection', 'patience', 'habits'], born: '1828-09-09', region: 'Russia', discipline: 'letters', chronotype: 'any', milestoneAge: 41, milestone: 'finished War and Peace after six years of drafts' },
  { slug: 'fyodor-dostoevsky', name: 'Fyodor Dostoevsky', known: 'Wrote a novel in 26 days under a ruinous contract deadline, dictating it to a stenographer.', domains: ['time', 'resilience', 'creativity'], born: '1821-11-11', region: 'Russia', discipline: 'letters', chronotype: 'late', milestoneAge: 45, milestone: 'beat an impossible deadline by changing his method, not his hours' },
  { slug: 'jane-austen', name: 'Jane Austen', known: 'Wrote in a shared family sitting room, hiding pages under blotting paper when visitors arrived.', domains: ['focus', 'habits', 'resilience'], born: '1775-12-16', region: 'United Kingdom', discipline: 'letters', chronotype: 'any', milestoneAge: 35, milestone: 'published her first novel anonymously at thirty-five' },
  { slug: 'virginia-woolf', name: 'Virginia Woolf', known: 'Wrote for two and a half concentrated hours each morning and argued for a room of one\'s own.', domains: ['habits', 'focus', 'creativity'], born: '1882-01-25', region: 'United Kingdom', discipline: 'letters', chronotype: 'early', milestoneAge: 33, milestone: 'published her first novel after years of illness and revision' },
  { slug: 'agatha-christie', name: 'Agatha Christie', known: 'Plotted while washing dishes and in the bath, and wrote wherever a table happened to be free.', domains: ['creativity', 'habits', 'time'], born: '1890-09-15', region: 'United Kingdom', discipline: 'letters', chronotype: 'any', milestoneAge: 30, milestone: 'published her first detective novel after six rejections' },
  { slug: 'rabindranath-tagore', name: 'Rabindranath Tagore', known: 'Wrote at dawn throughout his life and founded a school where lessons were held under trees.', domains: ['habits', 'creativity', 'learning'], born: '1861-05-07', region: 'India', discipline: 'letters', chronotype: 'early', milestoneAge: 52, milestone: 'became the first non-European awarded the literature Nobel' },
  { slug: 'ernest-hemingway', name: 'Ernest Hemingway', known: 'Stopped writing each day while he still knew what came next, so restarting was never blank.', domains: ['habits', 'creativity', 'focus'], born: '1899-07-21', region: 'United States', discipline: 'letters', chronotype: 'early', milestoneAge: 26, milestone: 'published the novel that made his name at twenty-six' },
  { slug: 'omar-khayyam', name: 'Omar Khayyam', known: 'Astronomer, mathematician and poet who solved cubic equations geometrically and reformed the calendar.', domains: ['learning', 'creativity', 'precision'], born: '1048-05-18', region: 'Persia', discipline: 'letters', chronotype: 'any', milestoneAge: 26, milestone: 'wrote a treatise on algebra that stood for centuries' },
  { slug: 'rumi', name: 'Rumi', known: 'A conventional scholar until a chance friendship at thirty-seven turned him into a poet.', domains: ['reflection', 'creativity', 'relationships'], born: '1207-09-30', region: 'Persia/Anatolia', discipline: 'letters', chronotype: 'any', milestoneAge: 37, milestone: 'changed direction completely in mid-life after one meeting' },
  { slug: 'johann-sebastian-bach', name: 'Johann Sebastian Bach', known: 'Produced a new cantata most weeks for years while running a choir school and raising a large family.', domains: ['habits', 'discipline', 'creativity'], born: '1685-03-31', region: 'Germany', discipline: 'arts', chronotype: 'early', milestoneAge: 38, milestone: 'took a job requiring a new work every week and met it for years' },
  { slug: 'ludwig-van-beethoven', name: 'Ludwig van Beethoven', known: 'Counted exactly sixty coffee beans each morning and composed on long walks with a notebook.', domains: ['habits', 'resilience', 'creativity'], born: '1770-12-17', region: 'Germany', discipline: 'arts', chronotype: 'early', milestoneAge: 31, milestone: 'kept composing after realising his hearing was going for good' },
  { slug: 'wolfgang-amadeus-mozart', name: 'Wolfgang Amadeus Mozart', known: 'Composed in stolen hours around teaching and performing, often late at night before a deadline.', domains: ['time', 'creativity', 'career'], born: '1756-01-27', region: 'Austria', discipline: 'arts', chronotype: 'late', milestoneAge: 25, milestone: 'went freelance at twenty-five when no composer did' },
  { slug: 'hokusai', name: 'Katsushika Hokusai', known: 'Painter who said everything he did before seventy was not worth counting, and kept working past eighty.', domains: ['patience', 'learning', 'creativity'], born: '1760-10-31', region: 'Japan', discipline: 'arts', chronotype: 'any', milestoneAge: 70, milestone: 'made his most famous prints in his seventies' },
  { slug: 'vincent-van-gogh', name: 'Vincent van Gogh', known: 'Began painting seriously at twenty-seven and produced most of his work in the final two years.', domains: ['career', 'resilience', 'creativity'], born: '1853-03-30', region: 'Netherlands', discipline: 'arts', chronotype: 'any', milestoneAge: 27, milestone: 'started painting at twenty-seven after failing at several other careers' },
  { slug: 'michelangelo', name: 'Michelangelo', known: 'Worked on scaffolding for four years on a ceiling he never wanted to paint, and kept sculpting into his eighties.', domains: ['patience', 'resilience', 'creativity'], born: '1475-03-06', region: 'Italy', discipline: 'arts', chronotype: 'any', milestoneAge: 33, milestone: 'began the Sistine ceiling insisting he was a sculptor, not a painter' },
  { slug: 'leonardo-da-vinci', name: 'Leonardo da Vinci', known: 'Filled 7,000-plus notebook pages with questions and observations, most of which he never published.', domains: ['learning', 'creativity', 'habits'], born: '1452-04-15', region: 'Italy', discipline: 'arts', chronotype: 'any', milestoneAge: null, milestone: null },
  { slug: 'frida-kahlo', name: 'Frida Kahlo', known: 'Began painting while immobilised in a body cast, using a mirror above her bed as the only available subject.', domains: ['resilience', 'creativity', 'emotion'], born: '1907-07-06', region: 'Mexico', discipline: 'arts', chronotype: 'any', milestoneAge: 18, milestone: 'started painting during a year-long recovery from a bus crash' },
  { slug: 'akira-kurosawa', name: 'Akira Kurosawa', known: 'Wrote screenplays longhand every morning and storyboarded his films as paintings.', domains: ['habits', 'creativity', 'precision'], born: '1910-03-23', region: 'Japan', discipline: 'arts', chronotype: 'early', milestoneAge: 40, milestone: 'made Rashomon, which opened Japanese cinema to the world' },
  { slug: 'charlie-chaplin', name: 'Charlie Chaplin', known: 'Shot hundreds of takes of a single scene, treating the cutting room as where the film was written.', domains: ['precision', 'creativity', 'patience'], born: '1889-04-16', region: 'United Kingdom', discipline: 'arts', chronotype: 'any', milestoneAge: 25, milestone: 'created his signature character out of borrowed costume pieces in an afternoon' },
  { slug: 'ravi-shankar', name: 'Ravi Shankar', known: 'Gave up a comfortable performing career at eighteen to spend seven austere years as a student.', domains: ['learning', 'discipline', 'patience'], born: '1920-04-07', region: 'India', discipline: 'arts', chronotype: 'any', milestoneAge: 18, milestone: 'abandoned early fame to restart as a beginner under a strict teacher' },
  { slug: 'ms-subbulakshmi', name: 'M. S. Subbulakshmi', known: 'Practised at dawn throughout a sixty-year career and gave many concerts entirely for charity.', domains: ['habits', 'discipline', 'generosity'], born: '1916-09-16', region: 'India', discipline: 'arts', chronotype: 'early', milestoneAge: 10, milestone: 'made her first recording at ten years old' },

  // ── Exploration, medicine & sport ────────────────────────────────────────
  { slug: 'ernest-shackleton', name: 'Ernest Shackleton', known: 'Abandoned his own expedition goal to bring every one of his 27 men home alive.', domains: ['leadership', 'resilience', 'strategy'], born: '1874-02-15', region: 'United Kingdom', discipline: 'exploration', chronotype: 'any', milestoneAge: 41, milestone: 'turned a total failure into a rescue in which nobody died' },
  { slug: 'roald-amundsen', name: 'Roald Amundsen', known: 'Prepared for polar travel by living with Inuit communities and copying methods that already worked.', domains: ['strategy', 'learning', 'precision'], born: '1872-07-16', region: 'Norway', discipline: 'exploration', chronotype: 'any', milestoneAge: 39, milestone: 'reached the South Pole first by preparing rather than improvising' },
  { slug: 'tenzing-norgay', name: 'Tenzing Norgay', known: 'Was rejected from expeditions repeatedly and had failed on Everest six times before succeeding.', domains: ['resilience', 'patience', 'career'], born: '1914-05-29', region: 'Nepal/India', discipline: 'exploration', chronotype: 'early', milestoneAge: 38, milestone: 'summited Everest on his seventh attempt' },
  { slug: 'amelia-earhart', name: 'Amelia Earhart', known: 'Worked several jobs to pay for flying lessons and bought her first aircraft within a year.', domains: ['career', 'resilience', 'wealth'], born: '1897-07-24', region: 'United States', discipline: 'exploration', chronotype: 'any', milestoneAge: 34, milestone: 'flew the Atlantic solo, the first woman to do it' },
  { slug: 'yuri-gagarin', name: 'Yuri Gagarin', known: 'A foundry worker\'s son selected from thousands partly for his calm under physiological stress tests.', domains: ['emotion', 'career', 'resilience'], born: '1934-03-09', region: 'Soviet Union', discipline: 'exploration', chronotype: 'any', milestoneAge: 27, milestone: 'became the first human in space at twenty-seven' },
  { slug: 'neil-armstrong', name: 'Neil Armstrong', known: 'Ejected from a crashing training vehicle and was back at his desk analysing the failure the same day.', domains: ['emotion', 'precision', 'resilience'], born: '1930-08-05', region: 'United States', discipline: 'exploration', chronotype: 'any', milestoneAge: 38, milestone: 'landed with seconds of fuel left after taking manual control' },
  { slug: 'kalpana-chawla', name: 'Kalpana Chawla', known: 'Moved from a small Indian town to aerospace engineering and flew two shuttle missions.', domains: ['career', 'learning', 'resilience'], born: '1962-03-17', region: 'India/United States', discipline: 'exploration', chronotype: 'any', milestoneAge: 35, milestone: 'flew her first shuttle mission at thirty-five' },
  { slug: 'mae-jemison', name: 'Mae Jemison', known: 'Physician, engineer and dancer who applied to the astronaut corps after being rejected once.', domains: ['career', 'learning', 'resilience'], born: '1956-10-17', region: 'United States', discipline: 'exploration', chronotype: 'any', milestoneAge: 35, milestone: 'became the first Black woman in space after reapplying' },
  { slug: 'jane-goodall', name: 'Jane Goodall', known: 'Began primate fieldwork with no degree, and was told naming her subjects was unscientific.', domains: ['patience', 'learning', 'resilience'], born: '1934-04-03', region: 'United Kingdom', discipline: 'science', chronotype: 'early', milestoneAge: 26, milestone: 'went to Gombe at twenty-six with a notebook and no formal training' },
  { slug: 'roger-bannister', name: 'Roger Bannister', known: 'Trained in his lunch hours as a full-time medical student and broke the four-minute mile.', domains: ['time', 'discipline', 'habits'], born: '1929-03-23', region: 'United Kingdom', discipline: 'sport', chronotype: 'any', milestoneAge: 25, milestone: 'broke a barrier thought physiological, training 45 minutes a day' },
  { slug: 'muhammad-ali', name: 'Muhammad Ali', known: 'Counted sit-ups only once they started hurting, on the grounds that the rest did not count.', domains: ['discipline', 'resilience', 'communication'], born: '1942-01-17', region: 'United States', discipline: 'sport', chronotype: 'early', milestoneAge: 22, milestone: 'won the heavyweight title at twenty-two as a heavy underdog' },
  { slug: 'serena-williams', name: 'Serena Williams', known: 'Returned to the top of the game after a pulmonary embolism and a year away from competition.', domains: ['resilience', 'discipline', 'career'], born: '1981-09-26', region: 'United States', discipline: 'sport', chronotype: 'any', milestoneAge: 35, milestone: 'won a grand slam while pregnant' },
  { slug: 'kobe-bryant', name: 'Kobe Bryant', known: 'Trained at four in the morning on the logic that starting earlier compounds over a career.', domains: ['discipline', 'habits', 'focus'], born: '1978-08-23', region: 'United States', discipline: 'sport', chronotype: 'early', milestoneAge: 17, milestone: 'entered the professional league straight from school at seventeen' },
  { slug: 'sachin-tendulkar', name: 'Sachin Tendulkar', known: 'Practised through the night as a schoolboy with a coach who put a coin on the stumps as a prize.', domains: ['discipline', 'habits', 'patience'], born: '1973-04-24', region: 'India', discipline: 'sport', chronotype: 'early', milestoneAge: 16, milestone: 'played international cricket at sixteen against the fastest bowlers alive' },
  { slug: 'milkha-singh', name: 'Milkha Singh', known: 'Trained until he collapsed, having taken up running to earn an extra glass of milk in the army.', domains: ['discipline', 'resilience', 'habits'], born: '1929-11-20', region: 'India', discipline: 'sport', chronotype: 'early', milestoneAge: 29, milestone: 'won gold at the Commonwealth Games after starting to run for extra rations' },
  { slug: 'pt-usha', name: 'P. T. Usha', known: 'Trained on a beach with no facilities and missed an Olympic medal by one hundredth of a second.', domains: ['resilience', 'discipline', 'patience'], born: '1964-06-27', region: 'India', discipline: 'sport', chronotype: 'early', milestoneAge: 20, milestone: 'finished fourth at the Olympics by 1/100th of a second and kept competing' },

  // ── Expanded roster: further thinkers, scientists and philosophers ───────
  // Added so a daily reader meets a genuinely new figure for well over a year
  // even after the 45-slug exclusion window. Every "known" line states an
  // attested fact; where a birth date or chronotype is disputed it is null.
  { slug: 'aristotle', name: 'Aristotle', known: 'Catalogued logic, biology, ethics and rhetoric, insisting that excellence is a habit rather than an act.', domains: ['habits', 'learning', 'reflection'], born: null, region: 'Greece', discipline: 'philosophy', chronotype: 'any', milestoneAge: null, milestone: null },
  { slug: 'plato', name: 'Plato', known: 'Founded the Academy and wrote philosophy as dialogue so readers had to argue rather than absorb.', domains: ['learning', 'communication', 'reflection'], born: null, region: 'Greece', discipline: 'philosophy', chronotype: 'any', milestoneAge: null, milestone: null },
  { slug: 'socrates', name: 'Socrates', known: 'Wrote nothing and taught by question, holding that an unexamined life is not worth living.', domains: ['reflection', 'learning', 'communication'], born: null, region: 'Greece', discipline: 'philosophy', chronotype: 'any', milestoneAge: null, milestone: null },
  { slug: 'hypatia', name: 'Hypatia of Alexandria', known: 'Mathematician and astronomer who taught publicly in Alexandria and edited commentaries on Ptolemy.', domains: ['learning', 'career', 'resilience'], born: null, region: 'Egypt', discipline: 'mathematics', chronotype: 'any', milestoneAge: null, milestone: null },
  { slug: 'ibn-sina', name: 'Ibn Sina (Avicenna)', known: 'Physician-philosopher whose Canon of Medicine remained a teaching text for six centuries.', domains: ['learning', 'career', 'problem-solving'], born: null, region: 'Persia', discipline: 'medicine', chronotype: 'late', milestoneAge: 18, milestone: 'was treating patients and reading the whole medical corpus by eighteen' },
  { slug: 'al-khwarizmi', name: 'Al-Khwarizmi', known: 'Systematised algebra as a method of balancing equations; the word algorithm derives from his name.', domains: ['problem-solving', 'learning', 'precision'], born: null, region: 'Persia', discipline: 'mathematics', chronotype: 'any', milestoneAge: null, milestone: null },
  { slug: 'ibn-khaldun', name: 'Ibn Khaldun', known: 'Wrote the Muqaddimah, treating the rise and decay of societies as something to study, not moralise about.', domains: ['strategy', 'reflection', 'leadership'], born: '1332-05-27', region: 'Tunisia', discipline: 'philosophy', chronotype: 'any', milestoneAge: 45, milestone: 'wrote the Muqaddimah in roughly five months of seclusion' },
  { slug: 'nagarjuna', name: 'Nagarjuna', known: 'Buddhist philosopher who built a logic of dependent origination that still anchors Madhyamaka thought.', domains: ['reflection', 'problem-solving', 'emotion'], born: null, region: 'India', discipline: 'philosophy', chronotype: 'any', milestoneAge: null, milestone: null },
  { slug: 'adi-shankara', name: 'Adi Shankara', known: 'Travelled India debating rival schools and organised Advaita Vedanta before dying young.', domains: ['communication', 'learning', 'discipline'], born: null, region: 'India', discipline: 'philosophy', chronotype: 'early', milestoneAge: null, milestone: null },
  { slug: 'zhuangzi', name: 'Zhuangzi', known: 'Taoist writer who used absurd stories to show how fixed categories mislead.', domains: ['creativity', 'reflection', 'emotion'], born: null, region: 'China', discipline: 'philosophy', chronotype: 'any', milestoneAge: null, milestone: null },
  { slug: 'thomas-aquinas', name: 'Thomas Aquinas', known: 'Dictated to several secretaries at once and reconciled Aristotelian reason with theology.', domains: ['focus', 'learning', 'reflection'], born: null, region: 'Italy', discipline: 'philosophy', chronotype: 'early', milestoneAge: null, milestone: null },
  { slug: 'nicolaus-copernicus', name: 'Nicolaus Copernicus', known: 'Held the heliocentric manuscript back for decades, publishing only in the year he died.', domains: ['patience', 'resilience', 'problem-solving'], born: '1473-02-19', region: 'Poland', discipline: 'science', chronotype: 'any', milestoneAge: 70, milestone: 'published the heliocentric model at seventy, after thirty years of delay' },
  { slug: 'galileo-galilei', name: 'Galileo Galilei', known: 'Built his own telescopes and recorded Jupiter\'s moons nightly, changing an argument into an observation.', domains: ['precision', 'resilience', 'learning'], born: '1564-02-15', region: 'Italy', discipline: 'science', chronotype: 'late', milestoneAge: 45, milestone: 'turned a homemade telescope on Jupiter and found four moons' },
  { slug: 'blaise-pascal', name: 'Blaise Pascal', known: 'Built a mechanical calculator as a teenager and co-founded probability through a gambling problem.', domains: ['problem-solving', 'creativity', 'reflection'], born: '1623-06-19', region: 'France', discipline: 'mathematics', chronotype: 'any', milestoneAge: 19, milestone: 'built a working calculating machine at nineteen to help his father' },
  { slug: 'gottfried-leibniz', name: 'Gottfried Wilhelm Leibniz', known: 'Invented calculus independently of Newton and designed the binary notation computers still use.', domains: ['creativity', 'problem-solving', 'learning'], born: '1646-07-01', region: 'Germany', discipline: 'mathematics', chronotype: 'late', milestoneAge: 29, milestone: 'worked out the calculus notation still taught today' },
  { slug: 'leonhard-euler', name: 'Leonhard Euler', known: 'Kept publishing at full rate after going blind, dictating results from memory.', domains: ['resilience', 'focus', 'habits'], born: '1707-04-15', region: 'Switzerland', discipline: 'mathematics', chronotype: 'any', milestoneAge: 59, milestone: 'lost his sight and produced roughly half his work afterwards' },
  { slug: 'carl-friedrich-gauss', name: 'Carl Friedrich Gauss', known: 'Published only finished work under the motto "few, but ripe", holding back results for years.', domains: ['precision', 'patience', 'focus'], born: '1777-04-30', region: 'Germany', discipline: 'mathematics', chronotype: 'any', milestoneAge: 24, milestone: 'published the Disquisitiones Arithmeticae at twenty-four' },
  { slug: 'sophie-germain', name: 'Sophie Germain', known: 'Taught herself mathematics at night against her family\'s wishes and corresponded under a male pen name.', domains: ['resilience', 'learning', 'discipline'], born: '1776-04-01', region: 'France', discipline: 'mathematics', chronotype: 'late', milestoneAge: 40, milestone: 'won the Academy prize for elasticity theory as a self-taught outsider' },
  { slug: 'henri-poincare', name: 'Henri Poincaré', known: 'Worked in two focused four-hour blocks a day and described insight as arriving after deliberate rest.', domains: ['time', 'focus', 'creativity'], born: '1854-04-29', region: 'France', discipline: 'mathematics', chronotype: 'any', milestoneAge: null, milestone: null },
  { slug: 'kurt-godel', name: 'Kurt Gödel', known: 'Showed that any sufficiently rich formal system contains true statements it cannot prove.', domains: ['problem-solving', 'precision', 'reflection'], born: '1906-04-28', region: 'Austria', discipline: 'mathematics', chronotype: 'late', milestoneAge: 25, milestone: 'published the incompleteness theorems at twenty-five' },
  { slug: 'claude-shannon', name: 'Claude Shannon', known: 'Founded information theory in a single 1948 paper and rode a unicycle down Bell Labs corridors while thinking.', domains: ['creativity', 'problem-solving', 'focus'], born: '1916-04-30', region: 'United States', discipline: 'engineering', chronotype: 'late', milestoneAge: 32, milestone: 'published the paper that created information theory' },
  { slug: 'ignaz-semmelweis', name: 'Ignaz Semmelweis', known: 'Showed handwashing collapsed maternal mortality and was rejected by his profession for saying so.', domains: ['resilience', 'precision', 'problem-solving'], born: '1818-07-01', region: 'Hungary', discipline: 'medicine', chronotype: 'any', milestoneAge: 29, milestone: 'cut ward deaths dramatically with a rule nobody would adopt' },
  { slug: 'rachel-carson', name: 'Rachel Carson', known: 'Wrote Silent Spring while terminally ill and faced down a chemical industry campaign against her.', domains: ['resilience', 'communication', 'career'], born: '1907-05-27', region: 'United States', discipline: 'science', chronotype: 'any', milestoneAge: 55, milestone: 'published Silent Spring while gravely ill and testified before the Senate' },
  { slug: 'james-watt', name: 'James Watt', known: 'Spent years on the separate condenser and only made money once he paired with a partner who could sell it.', domains: ['patience', 'enterprise', 'problem-solving'], born: '1736-01-19', region: 'Scotland', discipline: 'engineering', chronotype: 'any', milestoneAge: 29, milestone: 'saw the separate-condenser fix on a Sunday walk and spent a decade building it' },
  { slug: 'isambard-brunel', name: 'Isambard Kingdom Brunel', known: 'Slept a few hours a night through bridge, tunnel and ship projects executed at once.', domains: ['time', 'career', 'leadership'], born: '1806-04-09', region: 'United Kingdom', discipline: 'engineering', chronotype: 'late', milestoneAge: 24, milestone: 'won the Clifton bridge commission at twenty-four' },
  { slug: 'katherine-graham', name: 'Katherine Graham', known: 'Took over a newspaper with no executive experience and published against direct government pressure.', domains: ['leadership', 'resilience', 'career'], born: '1917-06-16', region: 'United States', discipline: 'leadership', chronotype: 'any', milestoneAge: 54, milestone: 'authorised publication of the Pentagon Papers under threat of prosecution' },
  { slug: 'ida-b-wells', name: 'Ida B. Wells', known: 'Documented lynchings with her own statistics after her press was destroyed, and kept publishing.', domains: ['resilience', 'precision', 'communication'], born: '1862-07-16', region: 'United States', discipline: 'social', chronotype: 'any', milestoneAge: 30, milestone: 'kept investigating after a mob burned her newspaper office' },
  { slug: 'frederick-douglass', name: 'Frederick Douglass', known: 'Taught himself to read while enslaved, trading bread for lessons, and became the era\'s foremost orator.', domains: ['learning', 'resilience', 'communication'], born: null, region: 'United States', discipline: 'social', chronotype: 'early', milestoneAge: null, milestone: null },
  { slug: 'harriet-tubman', name: 'Harriet Tubman', known: 'Made about thirteen return journeys to lead people out of slavery, never losing a passenger.', domains: ['courage', 'strategy', 'resilience'], born: null, region: 'United States', discipline: 'social', chronotype: 'late', milestoneAge: null, milestone: null },
  { slug: 'octavia-butler', name: 'Octavia E. Butler', known: 'Wrote at two in the morning before factory shifts and left herself written notes of intent.', domains: ['discipline', 'time', 'resilience'], born: '1947-06-22', region: 'United States', discipline: 'letters', chronotype: 'early', milestoneAge: 29, milestone: 'sold her first novel after years of pre-dawn writing around manual jobs' },
];


/** Which disciplines and rhythms suit each delivery window. */
const SLOT_AFFINITY: Record<FigureSlot, { chronotype: Chronotype; disciplines: Discipline[] }> = {
  // The wake-up card: documented early risers and their routines.
  morning: { chronotype: 'early', disciplines: ['enterprise', 'sport', 'leadership', 'letters'] },
  // Midday is a course-correction: strategists and system builders.
  midday: { chronotype: 'any', disciplines: ['enterprise', 'leadership', 'social', 'mathematics'] },
  // The afternoon dip is a problem-solving and craft window.
  afternoon: { chronotype: 'any', disciplines: ['science', 'engineering', 'exploration', 'medicine'] },
  // Evening reflection belongs to the philosophers and writers.
  evening: { chronotype: 'any', disciplines: ['philosophy', 'letters', 'arts'] },
  // The night card closes the day: reflective traditions and night workers.
  night: { chronotype: 'late', disciplines: ['philosophy', 'arts', 'letters'] },
};

function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export interface PickFigureOptions {
  /** Delivery window, used to prefer a matching rhythm and discipline. */
  slot?: FigureSlot;
  /** Member's birth month (1-12) — figures born the same month score higher. */
  birthMonth?: number | null;
  /** Member's current age — figures whose milestone age matches score higher. */
  age?: number | null;
}

/**
 * Resonance score for one figure. Higher wins; the seeded hash breaks ties, so
 * two members born in the same month on the same day still diverge.
 */
function score(figure: GrowthFigure, opts: PickFigureOptions): number {
  let s = 0;

  if (opts.slot) {
    const affinity = SLOT_AFFINITY[opts.slot];
    if (affinity) {
      if (affinity.chronotype !== 'any' && figure.chronotype === affinity.chronotype) s += 3;
      if (affinity.disciplines.includes(figure.discipline)) s += 2;
    }
  }

  if (opts.birthMonth && figure.born) {
    const month = Number(figure.born.split('-')[1]);
    if (month === opts.birthMonth) s += 4;
  }

  if (typeof opts.age === 'number' && figure.milestoneAge != null) {
    const gap = Math.abs(figure.milestoneAge - opts.age);
    if (gap === 0) s += 5;
    else if (gap <= 2) s += 3;
    else if (gap <= 5) s += 1;
  }

  return s;
}

/**
 * Deterministically assign a figure. Same seed + same exclusions + same
 * options always resolves to the same person, so a dispatch retry cannot
 * produce a second, different card for one slot.
 */
export function pickFigure(
  seed: string,
  exclude: Iterable<string> = [],
  opts: PickFigureOptions = {},
): GrowthFigure {
  const used = new Set(exclude);
  const pool = GROWTH_FIGURES.filter((f) => !used.has(f.slug));
  // Everyone has been seen recently (very long-running account) — fall back to
  // the full roster rather than returning nothing.
  const roster = pool.length ? pool : GROWTH_FIGURES;

  let best = roster[0];
  let bestRank = -1;
  for (const figure of roster) {
    // Resonance dominates, the seeded hash decides within a resonance band.
    const rank = score(figure, opts) * 100_000 + (hash(seed + figure.slug) % 100_000);
    if (rank > bestRank) {
      bestRank = rank;
      best = figure;
    }
  }
  return best;
}

/**
 * A concrete "at your age" / "born in your month" hook the prompt can use, or
 * null when the assigned figure has no genuine link to this member. Never
 * invents a connection — a weak card is better than a false one.
 */
export function birthResonance(
  figure: GrowthFigure,
  birthDate: string | null | undefined,
  today: Date = new Date(),
): string | null {
  if (!figure.born || !birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return null;

  const [uy, um, ud] = birthDate.split('-').map(Number);
  const [fy, fm, fd] = figure.born.split('-').map(Number);

  let age = today.getUTCFullYear() - uy;
  const monthNow = today.getUTCMonth() + 1;
  if (monthNow < um || (monthNow === um && today.getUTCDate() < ud)) age -= 1;

  if (fm === um && fd === ud) {
    return `${figure.name} shares the member's exact birthday (${um}/${ud}).`;
  }
  if (figure.milestoneAge != null && figure.milestoneAge === age) {
    return `At exactly ${age}, the member's current age, ${figure.name} ${figure.milestone}.`;
  }
  if (fm === um) {
    return `${figure.name} was born in the same month as the member.`;
  }
  if (figure.milestoneAge != null && Math.abs(figure.milestoneAge - age) <= 2) {
    return `Around age ${figure.milestoneAge}, close to the member's ${age}, ${figure.name} ${figure.milestone}.`;
  }
  // Deliberately null: no honest connection exists. Do not fabricate one.
  void fy;
  return null;
}

/**
 * How many recent figures to exclude. Kept well below the roster size so the
 * pool can never empty out.
 */
export const FIGURE_HISTORY_WINDOW = 45;

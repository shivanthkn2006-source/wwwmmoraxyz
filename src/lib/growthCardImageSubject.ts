/**
 * Content-to-image subject resolution for Growth cards.
 *
 * Standalone, pure helpers: they decide WHAT the card's illustration is
 * allowed to depict, straight from the card data. If the card names a real
 * person, that person must be depicted. If it names nobody, the image is
 * forbidden from showing an identifiable face at all — this is what stops
 * random stock-looking strangers appearing next to unrelated advice.
 */

const STOPWORDS = new Set([
  'The', 'This', 'That', 'These', 'Those', 'Your', 'You', 'Their', 'His', 'Her',
  'A', 'An', 'And', 'But', 'For', 'With', 'From', 'Into', 'Then', 'When', 'While',
  'Today', 'Tonight', 'Tomorrow', 'Morning', 'Midday', 'Afternoon', 'Evening', 'Night',
  'Daily', 'Weekly', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday',
  'Saturday', 'Sunday', 'Growth', 'Insight', 'Focus', 'Review', 'Strategic',
  'Minute', 'Minutes', 'Hour', 'Rule', 'Method', 'Habit', 'Practice', 'Step',
  'Zoe', 'Mmora', "M'Mora",
]);

const NAME_TOKEN = "[A-Z][a-z]+(?:'[A-Za-z]+)?";

export interface GrowthImageSubject {
  /** Real person named by the card, when one is confidently detected. */
  person: string | null;
  /** Short literal description of the card for the image model. */
  subject: string;
}

/**
 * Extracts a named real person from the card. Requires at least two adjacent
 * capitalised tokens (e.g. "Benjamin Franklin") that are not common words, and
 * requires the name to appear in the body text too when it came from the title
 * — a title-only capitalised phrase is usually a label, not a person.
 */
export const extractNamedPerson = (title: string, content: string): string | null => {
  const re = new RegExp(`${NAME_TOKEN}(?:\\s+${NAME_TOKEN}){1,2}`, 'g');
  const candidates: string[] = [];

  const collect = (text: string) => {
    for (const match of text.match(re) ?? []) {
      const parts = match.split(/\s+/);
      if (parts.some((p) => STOPWORDS.has(p))) continue;
      candidates.push(match);
    }
  };

  collect(content);
  if (candidates.length > 0) return candidates[0];

  // Titles often carry possessives: "Franklin's 15-Minute Focus".
  const possessive = title.match(new RegExp(`(${NAME_TOKEN})'s`));
  if (possessive && !STOPWORDS.has(possessive[1])) {
    const name = possessive[1];
    if (new RegExp(`\\b${name}\\b`).test(content)) return name;
  }

  collect(title);
  return candidates[0] ?? null;
};

export const resolveGrowthImageSubject = (
  title: string,
  content: string,
): GrowthImageSubject => ({
  person: extractNamedPerson(title, content),
  subject: `${title}. ${content}`.replace(/\s+/g, ' ').trim().slice(0, 420),
});

/**
 * Builds the image prompt. `attempt` lets the caller re-roll after a failed
 * validation; the final attempt drops people entirely so the card can never
 * keep showing a mismatched face.
 */
export const buildGrowthImagePrompt = (
  { person, subject }: GrowthImageSubject,
  category: string,
  { facelessFallback = false }: { facelessFallback?: boolean } = {},
): string => {
  const base = [
    `Editorial illustration that literally depicts this personal growth card: ${subject}`,
    `Theme: ${category}`,
    'The image must match the card title and lesson exactly',
  ];

  if (person && !facelessFallback) {
    base.push(
      `Depict ${person}, the real historical person, with historically accurate face, age, clothing and era`,
      `Never substitute a generic or modern model for ${person}`,
    );
  } else {
    base.push(
      'Show no human faces and no identifiable people',
      'Use objects, environment, hands or symbolic composition instead',
    );
  }

  base.push('cinematic documentary photography, natural light, no text, no words, no letters, no logo');
  return base.join(', ');
};

/** Stable numeric seed so a given insight always renders the same picture. */
export const growthImageSeed = (value: string, attempt = 0): number => {
  let hash = attempt * 7919;
  for (let i = 0; i < value.length; i += 1) hash = (hash * 31 + value.charCodeAt(i)) % 1000000;
  return hash;
};

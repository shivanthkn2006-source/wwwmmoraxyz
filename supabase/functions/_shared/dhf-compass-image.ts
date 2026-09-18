/** Pure, deterministic image contract for Zoe's DHF cards. */

export const DHF_IMAGE_PROMPT_VERSION = 'dhf-oil-v2';

export interface DhfImageBriefInput {
  category: string;
  headline: string;
  shortSummary: string;
  fullStory: string;
  astrologicalContext: string;
  seed: number;
}

export interface DhfImageBrief {
  prompt: string;
  promptVersion: string;
  promptHash: string;
  url: string;
}

const clean = (value: string, limit: number) =>
  value.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').replace(/[<>]/g, '').trim().slice(0, limit);

/** First meaningful sentence of the story: the concrete action the art must show. */
const leadAction = (story: string, limit: number) => {
  const sentences = clean(story, 900).split(/(?<=[.!?])\s+/).filter((s) => s.length > 24);
  return clean(sentences.slice(0, 2).join(' '), limit);
};

/** One mood word from the transit line, never the raw chart data. */
const mood = (astrology: string) => {
  const text = astrology.toLowerCase();
  if (/saturn|pluto/.test(text)) return 'steady, grounded evening light';
  if (/jupiter|venus/.test(text)) return 'warm, generous golden light';
  if (/mars/.test(text)) return 'bright, decisive light';
  if (/mercury/.test(text)) return 'clear, alert daylight';
  if (/moon/.test(text)) return 'soft, reflective light';
  return 'natural, balanced daylight';
};

const fingerprint = (value: string): string => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
};

/**
 * Builds one short, auditable visual brief from the exact copy shown on the card.
 * Short and concrete beats long and diluted: image models lose the subject when
 * the whole essay is pasted in, which is what caused generic mismatched art.
 * The image stays artwork-only; M'Mora / Zoe is drawn by the trusted UI overlay
 * so a provider can never misspell the brand or leave its own mark visible.
 */
export function buildDhfImageBrief(input: DhfImageBriefInput): DhfImageBrief {
  const category = clean(input.category, 60);
  const headline = clean(input.headline, 120);
  const summary = clean(input.shortSummary, 220);
  const action = leadAction(input.fullStory, 240);
  // Positive-only wording: diffusion models render whatever a negative clause
  // names, so "no frame" produced framed canvases and "no text" invited text.
  const prompt = [
    'Fine-art oil painting in rich natural colour, luminous layered brushwork, dimensional light, human warmth.',
    `Depict this exact moment: ${headline}.`,
    `Meaning to show: ${summary}`,
    action ? `Concrete scene: ${action}` : '',
    `Theme: ${category}. Lighting mood: ${mood(input.astrologicalContext)}.`,
    'One single coherent real-world scene, full-bleed wide cinematic composition filling the whole picture, subject complete and centred, clean untouched painted surface.',
  ].filter(Boolean).join(' ');
  const promptHash = fingerprint(`${DHF_IMAGE_PROMPT_VERSION}:${prompt}`);
  const params = new URLSearchParams({
    width: '1200',
    height: '800',
    nologo: 'true',
    private: 'true',
    safe: 'true',
    referrer: 'https://mmora.xyz',
    seed: String(Math.abs(input.seed) % 1_000_000),
    model: 'flux',
  });
  return {
    prompt,
    promptVersion: DHF_IMAGE_PROMPT_VERSION,
    promptHash,
    url: `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?${params.toString()}`,
  };
}

/** Pure, deterministic image contract for Zoe's DHF cards. */

export const DHF_IMAGE_PROMPT_VERSION = 'dhf-oil-v1';

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

const fingerprint = (value: string): string => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
};

/**
 * Builds one auditable visual brief from the exact copy shown on the card.
 * The image remains artwork-only; M'Mora / Zoe is rendered by the trusted UI
 * overlay so a provider can never misspell the brand or substitute its mark.
 */
export function buildDhfImageBrief(input: DhfImageBriefInput): DhfImageBrief {
  const category = clean(input.category, 80);
  const headline = clean(input.headline, 160);
  const summary = clean(input.shortSummary, 320);
  const story = clean(input.fullStory, 700);
  const astrology = clean(input.astrologicalContext, 320);
  const prompt = [
    'Create one precise, full-colour fine-art oil painting for a personal daily guidance card.',
    `Card category: ${category}.`,
    `Exact headline meaning to depict: ${headline}.`,
    `Exact card message: ${summary}.`,
    `Practical action and situation from the story: ${story}.`,
    `Subtle celestial atmosphere only where relevant: ${astrology}.`,
    'Show a single coherent real-world scene whose subject, objects, action, setting and emotion directly express that exact message.',
    'Use rich natural colour, luminous layered oil paint, visible brushwork, dimensional light, human warmth and editorial clarity.',
    'Landscape composition with the focal subject safely inside the central eighty percent; no cropped face, no floating head, no surreal body distortion.',
    'Do not default to a generic portrait. Include the concrete activity, decision, relationship, place or object described by the card.',
    'Artwork only: no words, letters, captions, signatures, logos, watermarks, monochrome treatment, grayscale, provider marks or Pollinations branding.',
  ].join(' ');
  const promptHash = fingerprint(`${DHF_IMAGE_PROMPT_VERSION}:${prompt}`);
  const params = new URLSearchParams({
    width: '1200',
    height: '800',
    nologo: 'true',
    enhance: 'true',
    safe: 'true',
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
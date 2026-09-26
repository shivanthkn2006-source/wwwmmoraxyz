export const HUMOR_CATEGORIES = ['relatable', 'wordplay', 'workplace', 'absurd', 'family', 'observational'] as const;

export type HumorCategory = typeof HUMOR_CATEGORIES[number];

export const HUMOR_CATEGORY_LABELS: Record<HumorCategory, string> = {
  relatable: 'Relatable',
  wordplay: 'Wordplay',
  workplace: 'Workplace',
  absurd: 'Absurd',
  family: 'Family',
  observational: 'Observational',
};

export function isHumorCategory(value: unknown): value is HumorCategory {
  return typeof value === 'string' && HUMOR_CATEGORIES.includes(value as HumorCategory);
}

export function humorText(lines: { text: string }[]): string {
  return lines.map((line) => line.text.trim()).filter(Boolean).join(' ');
}

export function humorTrendingScore(likes: number, dislikes: number, comments: number, scheduledFor: string): number {
  const ageHours = Math.max(0, (Date.now() - new Date(scheduledFor).getTime()) / 3_600_000);
  return (likes * 2 + comments * 3 - dislikes) / Math.pow(ageHours + 2, 0.8);
}
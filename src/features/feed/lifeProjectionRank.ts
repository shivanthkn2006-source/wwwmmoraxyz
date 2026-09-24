export interface LifeRankablePost {
  id: string;
  user_id: string;
  content?: string | null;
  created_at: string;
  likes_count?: number | null;
  comments_count?: number | null;
  profile?: { hobbies?: string[] | string | null } | Record<string, unknown> | null;
}

export interface LifeRankingSignals {
  interests: string[];
  closeFriends: Map<string, number>;
  upcomingBirthdayIds: Set<string>;
  planetaryKeywords: string[];
  now?: number;
}

const words = (values: Array<string | null | undefined>) =>
  values.join(' ').toLowerCase().match(/[a-z0-9]{3,}/g) ?? [];

export function lifeProjectionScore(post: LifeRankablePost, signals: LifeRankingSignals): number {
  const now = signals.now ?? Date.now();
  const ageHours = Math.max(0, now - new Date(post.created_at).getTime()) / 3_600_000;
  const recency = Math.pow(0.5, ageHours / 72) * 4;
  const closeness = Math.min(4, Math.log2(1 + Math.max(0, signals.closeFriends.get(post.user_id) ?? 0)) * 1.5);
  const birthday = signals.upcomingBirthdayIds.has(post.user_id) ? 1.5 : 0;
  const postWords = new Set(words([post.content, Array.isArray(post.profile?.hobbies) ? post.profile?.hobbies.join(' ') : post.profile?.hobbies]));
  const interestHits = words(signals.interests).filter((word) => postWords.has(word)).length;
  const planetHits = words(signals.planetaryKeywords).filter((word) => postWords.has(word)).length;
  const explicitInterest = Math.min(3, interestHits * 0.75);
  const planetary = Math.min(0.75, planetHits * 0.25);
  const engagement = Math.min(1, Math.log2(1 + Math.max(0, (post.likes_count ?? 0) + (post.comments_count ?? 0))) / 4);
  return recency + closeness + birthday + explicitInterest + planetary + engagement;
}

export function rankLifeProjectionFeed<T extends LifeRankablePost>(posts: T[], signals: LifeRankingSignals): T[] {
  return posts
    .map((post, index) => ({ post, index, score: lifeProjectionScore(post, signals) }))
    .sort((a, b) => (b.score - a.score) || (a.index - b.index))
    .map(({ post }) => post);
}
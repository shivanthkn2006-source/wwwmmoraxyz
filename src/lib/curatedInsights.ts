/** Curated, attributed daily insights — the fallback so motivation never blanks. */
export interface CuratedInsight { quote: string; author: string }

export const CURATED_INSIGHTS: CuratedInsight[] = [
  { quote: 'We are what we repeatedly do. Excellence, then, is not an act, but a habit.', author: 'Will Durant' },
  { quote: 'The best time to plant a tree was 20 years ago. The second best time is now.', author: 'Chinese proverb' },
  { quote: 'You have power over your mind — not outside events. Realize this, and you will find strength.', author: 'Marcus Aurelius' },
  { quote: 'It does not matter how slowly you go as long as you do not stop.', author: 'Confucius' },
  { quote: 'Arise, awake, and stop not till the goal is reached.', author: 'Swami Vivekananda' },
  { quote: 'Knowing is not enough; we must apply. Willing is not enough; we must do.', author: 'Johann Wolfgang von Goethe' },
  { quote: 'Be the change that you wish to see in the world.', author: 'Mahatma Gandhi' },
  { quote: 'The mind is everything. What you think you become.', author: 'Buddha' },
  { quote: 'Action is the foundational key to all success.', author: 'Pablo Picasso' },
  { quote: 'You have a right to your actions, but never to the fruits of your actions.', author: 'Bhagavad Gita 2.47' },
  { quote: 'Small deeds done are better than great deeds planned.', author: 'Peter Marshall' },
  { quote: 'Discipline is choosing between what you want now and what you want most.', author: 'Abraham Lincoln (attributed)' },
  { quote: 'The journey of a thousand miles begins with one step.', author: 'Lao Tzu' },
  { quote: 'What we fear doing most is usually what we most need to do.', author: 'Tim Ferriss' },
];

/** Same insight all day, changes every day. */
export function insightForDate(d = new Date()): CuratedInsight {
  const day = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000);
  return CURATED_INSIGHTS[day % CURATED_INSIGHTS.length];
}

/**
 * Inserts Growth cards throughout a feed instead of appending them after every
 * post/video. Order is stable, every Growth card is included exactly once, and
 * sparse feeds surface the first card immediately.
 */
export function interleaveGrowthCards<T>(
  content: readonly T[],
  growth: readonly T[],
  interval = 3,
): T[] {
  if (growth.length === 0) return [...content];
  if (content.length === 0) return [...growth];

  const step = Math.max(1, Math.floor(interval));
  const result: T[] = [];
  let growthIndex = 0;

  for (let index = 0; index < content.length; index += 1) {
    result.push(content[index]);
    if ((index + 1) % step === 0 && growthIndex < growth.length) {
      result.push(growth[growthIndex]);
      growthIndex += 1;
    }
  }

  while (growthIndex < growth.length) {
    result.push(growth[growthIndex]);
    growthIndex += 1;
  }

  return result;
}
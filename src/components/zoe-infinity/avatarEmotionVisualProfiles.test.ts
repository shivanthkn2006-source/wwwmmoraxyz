import { describe, expect, it } from 'vitest';
import { ALL_AVATAR_EMOTIONS, getCoreEmotion } from '@/utils/avatarEmotionClassifier';
import { getEmotionVisualFingerprint } from '@/components/zoe-infinity/avatarEmotionVisualProfiles';

describe('avatar emotion visual profiles', () => {
  it('covers all 50 emotions', () => {
    expect(ALL_AVATAR_EMOTIONS.length).toBe(50);
  });

  it('produces a unique visual fingerprint for each emotion', () => {
    const fingerprints = ALL_AVATAR_EMOTIONS.map((emotion) =>
      getEmotionVisualFingerprint(emotion, getCoreEmotion(emotion))
    );

    const unique = new Set(fingerprints);
    expect(unique.size).toBe(ALL_AVATAR_EMOTIONS.length);
  });
});

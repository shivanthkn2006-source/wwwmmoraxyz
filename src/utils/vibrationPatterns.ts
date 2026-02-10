// Vibration patterns for different notification types
// Each pattern is an array of [vibrate_ms, pause_ms, vibrate_ms, ...]

export const VibrationPatterns = {
  post_like: [100, 50, 100],
  post_comment: [100, 50, 100, 50, 100],
  comment_like: [80, 40, 80],
  comment_reply: [100, 50, 100, 50, 100],
  friend_request: [200, 100, 200],
  friend_request_accepted: [100, 50, 100, 50, 100, 50, 200],
  user_online: [150, 100, 150],
  tier_upgrade: [100, 50, 100, 50, 100, 50, 200, 100, 300],
  urgent: [200, 100, 200, 100, 200],
  default: [100, 50, 100],
};

export const triggerVibration = (
  pattern: number[] | keyof typeof VibrationPatterns,
  enabled: boolean = true
) => {
  if (!enabled || !('vibrate' in navigator)) {
    return;
  }

  const vibrationPattern = typeof pattern === 'string' 
    ? VibrationPatterns[pattern] || VibrationPatterns.default
    : pattern;

  try {
    navigator.vibrate(vibrationPattern);
  } catch (error) {
    console.warn('Vibration not supported or failed:', error);
  }
};

export const stopVibration = () => {
  if ('vibrate' in navigator) {
    navigator.vibrate(0);
  }
};
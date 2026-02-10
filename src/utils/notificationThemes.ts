// Notification sound themes with coordinated sound packs

export const NotificationThemes = {
  classic: {
    name: 'Classic',
    description: 'Traditional notification sounds',
    sounds: {
      post_like: { frequencies: [800, 1000], durations: [0.1, 0.15], type: 'sine' as OscillatorType },
      post_comment: { frequencies: [600, 800, 1000], durations: [0.1, 0.1, 0.15], type: 'sine' as OscillatorType },
      comment_like: { frequencies: [900, 1100], durations: [0.08, 0.12], type: 'sine' as OscillatorType },
      comment_reply: { frequencies: [700, 900, 1100], durations: [0.09, 0.09, 0.14], type: 'sine' as OscillatorType },
      friend_request: { frequencies: [523, 659, 784], durations: [0.15, 0.15, 0.2], type: 'sine' as OscillatorType },
      friend_request_accepted: { frequencies: [523, 659, 784, 1047], durations: [0.12, 0.12, 0.12, 0.25], type: 'sine' as OscillatorType },
      user_online: { frequencies: [440, 554], durations: [0.1, 0.15], type: 'triangle' as OscillatorType },
      tier_upgrade: { frequencies: [523, 659, 784, 1047, 1319], durations: [0.1, 0.1, 0.1, 0.1, 0.3], type: 'sine' as OscillatorType },
    }
  },
  modern: {
    name: 'Modern',
    description: 'Sleek contemporary sounds',
    sounds: {
      post_like: { frequencies: [1200, 1400], durations: [0.08, 0.12], type: 'square' as OscillatorType },
      post_comment: { frequencies: [900, 1200, 1500], durations: [0.08, 0.08, 0.12], type: 'square' as OscillatorType },
      comment_like: { frequencies: [1100, 1300], durations: [0.06, 0.1], type: 'square' as OscillatorType },
      comment_reply: { frequencies: [850, 1100, 1350], durations: [0.07, 0.07, 0.12], type: 'square' as OscillatorType },
      friend_request: { frequencies: [600, 800, 1000], durations: [0.12, 0.12, 0.18], type: 'square' as OscillatorType },
      friend_request_accepted: { frequencies: [600, 800, 1000, 1200], durations: [0.1, 0.1, 0.1, 0.22], type: 'square' as OscillatorType },
      user_online: { frequencies: [500, 650], durations: [0.08, 0.13], type: 'square' as OscillatorType },
      tier_upgrade: { frequencies: [700, 900, 1100, 1300, 1500], durations: [0.08, 0.08, 0.08, 0.08, 0.25], type: 'square' as OscillatorType },
    }
  },
  nature: {
    name: 'Nature',
    description: 'Organic and soothing tones',
    sounds: {
      post_like: { frequencies: [440, 523], durations: [0.15, 0.2], type: 'triangle' as OscillatorType },
      post_comment: { frequencies: [392, 440, 523], durations: [0.13, 0.13, 0.18], type: 'triangle' as OscillatorType },
      comment_like: { frequencies: [466, 554], durations: [0.12, 0.17], type: 'triangle' as OscillatorType },
      comment_reply: { frequencies: [370, 440, 523], durations: [0.12, 0.12, 0.17], type: 'triangle' as OscillatorType },
      friend_request: { frequencies: [349, 415, 494], durations: [0.18, 0.18, 0.23], type: 'triangle' as OscillatorType },
      friend_request_accepted: { frequencies: [349, 415, 494, 587], durations: [0.15, 0.15, 0.15, 0.28], type: 'triangle' as OscillatorType },
      user_online: { frequencies: [330, 392], durations: [0.13, 0.18], type: 'triangle' as OscillatorType },
      tier_upgrade: { frequencies: [392, 440, 494, 523, 587], durations: [0.12, 0.12, 0.12, 0.12, 0.32], type: 'triangle' as OscillatorType },
    }
  },
  retro: {
    name: 'Retro',
    description: '8-bit style notification sounds',
    sounds: {
      post_like: { frequencies: [1046, 1318], durations: [0.06, 0.1], type: 'sawtooth' as OscillatorType },
      post_comment: { frequencies: [880, 1046, 1318], durations: [0.06, 0.06, 0.1], type: 'sawtooth' as OscillatorType },
      comment_like: { frequencies: [988, 1174], durations: [0.05, 0.09], type: 'sawtooth' as OscillatorType },
      comment_reply: { frequencies: [830, 988, 1174], durations: [0.055, 0.055, 0.095], type: 'sawtooth' as OscillatorType },
      friend_request: { frequencies: [698, 880, 1046], durations: [0.1, 0.1, 0.15], type: 'sawtooth' as OscillatorType },
      friend_request_accepted: { frequencies: [698, 880, 1046, 1318], durations: [0.08, 0.08, 0.08, 0.2], type: 'sawtooth' as OscillatorType },
      user_online: { frequencies: [587, 740], durations: [0.07, 0.12], type: 'sawtooth' as OscillatorType },
      tier_upgrade: { frequencies: [880, 1046, 1318, 1568, 1976], durations: [0.06, 0.06, 0.06, 0.06, 0.25], type: 'sawtooth' as OscillatorType },
    }
  }
};

export type ThemeName = keyof typeof NotificationThemes;
export type NotificationType = keyof typeof NotificationThemes.classic.sounds;
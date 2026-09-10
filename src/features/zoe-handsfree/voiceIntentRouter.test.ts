import { describe, it, expect } from 'vitest';
import { resolveVoiceIntent } from './voiceIntentRouter';

describe('resolveVoiceIntent', () => {
  it('navigates on a bare page name after the wake word', () => {
    expect(resolveVoiceIntent('Zoe home')).toMatchObject({ kind: 'navigate', path: '/home' });
  });

  it('navigates with a verb', () => {
    expect(resolveVoiceIntent('Zoe, open chat')).toMatchObject({ kind: 'orb-chat' });
    expect(resolveVoiceIntent('take me to the astrology page')).toMatchObject({
      kind: 'navigate',
      path: '/astrology',
    });
  });

  it('opens the orb chat only on an explicit request', () => {
    expect(resolveVoiceIntent('Zoe, open orb')).toMatchObject({ kind: 'orb-chat' });
    expect(resolveVoiceIntent('Zoe, open orb chat')).toMatchObject({ kind: 'orb-chat' });
    expect(resolveVoiceIntent('open chat')).toMatchObject({ kind: 'orb-chat' });
    // A bare "hey Zoe" produces no command at all, so no panel opens.
    expect(resolveVoiceIntent('hey zoe')).toBeNull();
    // "messages" still navigates to the Messages page.
    expect(resolveVoiceIntent('Zoe, open messages')).toMatchObject({ kind: 'navigate', path: '/chat' });
  });

  it('opens notifications', () => {
    expect(resolveVoiceIntent('Zoe show my notifications')).toMatchObject({ kind: 'notifications' });
  });

  it('starts a message without sending it', () => {
    const intent = resolveVoiceIntent('Zoe send a message to asha soosan');
    expect(intent).toMatchObject({ kind: 'message', recipient: 'asha soosan' });
    expect((intent as any).speak).toMatch(/confirm/i);
  });

  it('leaves real questions to Zoe’s brain', () => {
    expect(resolveVoiceIntent('Zoe tell me my astrology for the week')).toBeNull();
    expect(resolveVoiceIntent('what is Kronos and Anima')).toBeNull();
    expect(resolveVoiceIntent('tell me about the new iPhone')).toBeNull();
  });
});

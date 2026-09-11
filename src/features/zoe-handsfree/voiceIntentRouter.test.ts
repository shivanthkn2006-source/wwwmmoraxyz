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

  it('asks for the wording when only a recipient is named', () => {
    const intent = resolveVoiceIntent('Zoe send a message to asha soosan');
    expect(intent).toMatchObject({ kind: 'message', recipient: 'asha soosan', body: undefined });
    expect((intent as any).speak).toMatch(/what should i say/i);
  });

  it('captures the wording so the message can actually be delivered', () => {
    const intent = resolveVoiceIntent('Zoe send a message to asha soosan saying I am on my way');
    expect(intent).toMatchObject({
      kind: 'message',
      recipient: 'asha soosan',
      body: 'i am on my way',
    });
  });

  it('leaves real questions to Zoe’s brain', () => {
    expect(resolveVoiceIntent('Zoe tell me my astrology for the week')).toBeNull();
    expect(resolveVoiceIntent('what is Kronos and Anima')).toBeNull();
    expect(resolveVoiceIntent('tell me about the new iPhone')).toBeNull();
  });
});

describe('god mode scan', () => {
  it('routes "Zoe run god mode scan" to the staff dashboard', () => {
    const intent = resolveVoiceIntent('Zoe run god mode scan');
    expect(intent?.kind).toBe('god-scan');
  });

  it('does not trigger on an ordinary scan question', () => {
    expect(resolveVoiceIntent('what is god mode')?.kind).not.toBe('god-scan');
  });
});


describe('assistant actions', () => {
  it('routes a spoken search to the visible Home search', () => {
    const intent = resolveVoiceIntent('Zoe search for the weather in Kochi');
    expect(intent).toMatchObject({ kind: 'search' });
    expect((intent as { query: string }).query).toContain('weather in kochi');
  });

  it('routes ordinary weather and news questions to visible live results', () => {
    expect(resolveVoiceIntent('Zoe what is the weather today')).toMatchObject({ kind: 'search' });
    expect(resolveVoiceIntent('Zoe give me the latest news')).toMatchObject({ kind: 'search' });
  });

  it('routes a resume request', () => {
    expect(resolveVoiceIntent('Zoe, generate my resume')).toMatchObject({ kind: 'resume' });
  });

  it('routes a 3D asset request with its description', () => {
    const intent = resolveVoiceIntent('Zoe make a 3D model of a red bicycle');
    expect(intent).toMatchObject({ kind: 'asset-3d' });
    expect((intent as { prompt: string }).prompt).toBe('a red bicycle');
  });

  it('leaves a normal question to Zoe\u2019s brain', () => {
    expect(resolveVoiceIntent('Zoe how is my week looking')).toBeNull();
  });
});

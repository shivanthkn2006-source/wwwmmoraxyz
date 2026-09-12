import { describe, it, expect, beforeEach } from 'vitest';
import { gateTranscript, isZoeMuted, resetMuteGate, setZoeMuted } from './muteGate';

describe('mute gate', () => {
  beforeEach(() => resetMuteGate());

  it('passes ordinary speech while unmuted', () => {
    expect(gateTranscript('what is the weather today')).toBe('pass');
  });

  it('mutes on "mute"', () => {
    expect(gateTranscript('Zoe, mute')).toBe('mute');
  });

  it('drops ordinary speech while muted, including "hey Zoe"', () => {
    setZoeMuted(true);
    expect(gateTranscript('hey Zoe')).toBe('muted-drop');
    expect(gateTranscript('open my messages')).toBe('muted-drop');
    expect(gateTranscript('what is the news')).toBe('muted-drop');
  });

  it('answers a muted check-in locally and unmutes only after confirmation', () => {
    setZoeMuted(true);
    expect(gateTranscript('Zoe, you there?')).toBe('ask-unmute');
    expect(isZoeMuted()).toBe(true);
    expect(gateTranscript('yes')).toBe('unmute');
  });

  it('stays muted when the user declines the confirmation', () => {
    setZoeMuted(true);
    expect(gateTranscript('Zoe are you there')).toBe('ask-unmute');
    expect(gateTranscript('no, stay muted')).toBe('keep-muted');
    expect(isZoeMuted()).toBe(true);
  });

  it('only "Zoe wake" lifts the mute', () => {
    setZoeMuted(true);
    expect(gateTranscript('Zoe wake')).toBe('unmute');
    resetMuteGate();
    setZoeMuted(true);
    expect(gateTranscript('wake up Zoe')).toBe('unmute');
  });

  it('tracks its own state', () => {
    expect(isZoeMuted()).toBe(false);
    setZoeMuted(true);
    expect(isZoeMuted()).toBe(true);
  });
});

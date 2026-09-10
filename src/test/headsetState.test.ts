import { describe, it, expect } from 'vitest';
import { resolveHeadsetState, type AudioDeviceOption } from '@/services/AudioRouterService';

const out = (deviceId: string, label: string): AudioDeviceOption => ({
  deviceId,
  label,
  groupId: 'g',
  kind: 'audiooutput',
  isDefault: deviceId === 'default',
});

describe('resolveHeadsetState', () => {
  it('reports nothing when labels are unavailable (no mic permission)', () => {
    expect(resolveHeadsetState([out('default', 'Speaker (abcde...)')], 'default').connected).toBe(false);
    expect(resolveHeadsetState([], 'default').connected).toBe(false);
  });

  it('stays unlit on built-in speakers', () => {
    expect(resolveHeadsetState([out('default', 'MacBook Pro Speakers (Built-in)')], 'default').connected).toBe(false);
  });

  it('lights up for an Indian brand Bluetooth headset', () => {
    const state = resolveHeadsetState([out('bt1', 'boAt Rockerz 510 (Bluetooth)')], 'bt1');
    expect(state).toMatchObject({ connected: true, wireless: true });
    expect(state.label).toContain('boAt');
  });

  it('follows the selected device, not the first one', () => {
    const devices = [out('default', 'Default - Internal Speakers'), out('bt2', 'AirPods Pro')];
    expect(resolveHeadsetState(devices, 'bt2').connected).toBe(true);
    expect(resolveHeadsetState(devices, 'default').connected).toBe(false);
  });

  it('strips the Default prefix from the reported name', () => {
    expect(resolveHeadsetState([out('default', 'Default - WH-1000XM5 (Bluetooth)')], 'default').label).toBe(
      'WH-1000XM5 (Bluetooth)',
    );
  });
});

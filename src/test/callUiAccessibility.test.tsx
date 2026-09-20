// @vitest-environment jsdom

import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { QuantumVideoUI } from '@/components/quantum/QuantumVideoUI';
import { DEFAULT_CALL_NETWORK_DIAGNOSTICS } from '@/features/calls/callTransport';

const renderCall = (overrides: Partial<React.ComponentProps<typeof QuantumVideoUI>> = {}) => render(
  <QuantumVideoUI
    callState="connected"
    connectionQuality="good"
    callDuration={0}
    participantName="Test caller"
    currentUserId="current-user"
    participantId="other-user"
    isMuted={false}
    isSpeaking={false}
    remoteIsSpeaking={false}
    onToggleMute={vi.fn()}
    videoEnabled
    videoQuality="720p"
    isLowDataMode={false}
    currentBitrate={800_000}
    codec="VP9"
    networkDiagnostics={{ ...DEFAULT_CALL_NETWORK_DIAGNOSTICS, route: 'relay', roundTripTimeMs: 82 }}
    dataChannelState="open"
    wordsOnlyMode={false}
    wordsTranscript={[]}
    zoeWhisper={null}
    onToggleVideo={vi.fn(async () => undefined)}
    onSetLowDataMode={vi.fn()}
    onSetWordsOnlyMode={vi.fn()}
    onSendCallWords={vi.fn(() => true)}
    onSetLocalVideoRef={vi.fn()}
    onSetRemoteVideoRef={vi.fn()}
    godEyeEnabled={false}
    lastGodEyeAnalysis={null}
    onStartGodEye={vi.fn()}
    onStopGodEye={vi.fn()}
    onEndCall={vi.fn(async () => undefined)}
    {...overrides}
  />,
);

afterEach(cleanup);

describe('call controls accessibility', () => {
  it('exposes the compact control tray and essential controls by name', () => {
    renderCall();
    fireEvent.click(screen.getByRole('button', { name: 'Open call controls' }));
    expect(screen.getByRole('button', { name: 'Mute' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Turn off camera' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Use low data mode' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Use words only mode' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'End call' })).toBeTruthy();
  });

  it('shows the bounded words-only composer when media is suspended', () => {
    renderCall({ wordsOnlyMode: true });
    expect(screen.getByRole('region', { name: 'Words only conversation' })).toBeTruthy();
    expect(screen.getByRole('textbox', { name: 'Message' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Send message' })).toBeTruthy();
  });

  it('announces relay diagnostics and the Zoe channel state', () => {
    renderCall();
    const status = screen.getByRole('status');
    expect(status.textContent).toContain('Network relay');
    expect(status.textContent).toContain('Zoe channel open');
  });
});
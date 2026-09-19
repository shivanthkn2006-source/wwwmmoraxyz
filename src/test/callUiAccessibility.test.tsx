import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { QuantumVideoUI } from '@/components/quantum/QuantumVideoUI';
import { DEFAULT_CALL_NETWORK_DIAGNOSTICS } from '@/features/calls/callTransport';

const renderCall = (overrides: Partial<React.ComponentProps<typeof QuantumVideoUI>> = {}) => render(
  <QuantumVideoUI
    callState="connected"
    connectionQuality="good"
    callDuration={0}
    participantName="Test caller"
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
    onToggleVideo={vi.fn(async () => undefined)}
    onSetLowDataMode={vi.fn()}
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

describe('call controls accessibility', () => {
  it('exposes the compact control tray and essential controls by name', () => {
    renderCall();
    fireEvent.click(screen.getByRole('button', { name: 'Open call controls' }));
    expect(screen.getByRole('button', { name: 'Mute' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Turn off camera' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Use low data mode' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'End call' })).toBeInTheDocument();
  });

  it('announces relay diagnostics and the Zoe channel state', () => {
    renderCall();
    expect(screen.getByRole('status')).toHaveTextContent('Network relay');
    expect(screen.getByRole('status')).toHaveTextContent('Zoe channel open');
  });
});
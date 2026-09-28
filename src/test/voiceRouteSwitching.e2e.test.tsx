// @vitest-environment jsdom
// ═══════════════════════════════════════════════════════════════════════════════
// VOICE + AGENT ROUTE SWITCHING — END-TO-END
// Mounts the real PlatformLayout shell with a router and a fake SpeechRecognition
// engine, then drives a full session: activate voice → speak a command → switch
// agent routes → speak again → deactivate. Asserts that the recognizer survives
// route changes, Zustand state (active agent, history, last command) persists
// across unmount/remount, and that no route or command ever crashes the shell.
// ═══════════════════════════════════════════════════════════════════════════════

import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';

// Keep the shell's optional side-panels inert: this test is about the voice
// layer and routing, not the growth/dock UI.
vi.mock('@/components/growth/GrowthCardAlertHost', () => ({ default: () => null }));
vi.mock('@/components/home/GlobalHomeDock', () => ({ default: () => null }));
// The shell now starts background services lazily (after first paint). Under
// fake timers that heavy lazy chunk never settles, so the voice engine never
// mounted in this test. Pass children straight through: this suite only tests
// the voice engine, not the other hosts.
vi.mock('@/components/platform/DeferredPlatformServices', () => ({
  default: ({ children }: { children: React.ReactNode }) => children,
}));

// ── Fake SpeechRecognition ───────────────────────────────────────────────────
class FakeRecognition {
  static instances: FakeRecognition[] = [];
  static startCount = 0;
  continuous = false;
  interimResults = false;
  lang = '';
  aborted = false;
  running = false;
  onresult: ((event: unknown) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  onend: (() => void) | null = null;

  constructor() {
    FakeRecognition.instances.push(this);
  }
  start() {
    this.running = true;
    FakeRecognition.startCount += 1;
  }
  stop() {
    this.running = false;
  }
  abort() {
    this.aborted = true;
    this.running = false;
  }
  /** Simulate a final transcript coming back from the browser engine. */
  speak(transcript: string) {
    this.onresult?.({ results: [[{ transcript }]] });
  }
}

const { PlatformLayout } = await import('@/layouts/PlatformLayout');
const { usePlatformStore } = await import('@/store/usePlatformStore');
const { voiceCommandService } = await import('@/services/voiceCommandService');
const { setVoiceEngineOptIn } = await import('@/hooks/useVoiceEngine');

// ── Minimal agent routes ─────────────────────────────────────────────────────
const AgentScreen = ({ id }: { id: string }) => {
  const setActiveAgent = usePlatformStore((s) => s.setActiveAgent);
  const activeAgent = usePlatformStore((s) => s.activeAgent);
  const lastCommand = usePlatformStore((s) => s.lastCommand);
  const location = useLocation();
  React.useEffect(() => setActiveAgent(id), [id, setActiveAgent]);
  return (
    <div>
      <span data-testid="route">{location.pathname}</span>
      <span data-testid="active-agent">{activeAgent ?? 'none'}</span>
      <span data-testid="last-command">{lastCommand ?? 'none'}</span>
    </div>
  );
};

let navigateRef: ((to: string) => void) | null = null;
const NavigationBridge = () => {
  const navigate = useNavigate();
  navigateRef = (to: string) => navigate(to);
  return null;
};

const Shell = () => (
  <MemoryRouter initialEntries={['/agent/moksh']}>
    <PlatformLayout>
      <NavigationBridge />
      <Routes>
        <Route path="/agent/moksh" element={<AgentScreen id="agent_moksh" />} />
        <Route path="/agent/career" element={<AgentScreen id="agent_career" />} />
        <Route path="/agent/vr" element={<AgentScreen id="agent_vr" />} />
      </Routes>
    </PlatformLayout>
  </MemoryRouter>
);

const flush = async (ms = 500) => {
  await act(async () => {
    vi.advanceTimersByTime(ms);
    await Promise.resolve();
  });
};

describe('voice activation + agent route switching (e2e)', () => {
  const errors: unknown[] = [];
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers();
    FakeRecognition.instances = [];
    FakeRecognition.startCount = 0;
    (window as unknown as Record<string, unknown>).SpeechRecognition = FakeRecognition;
    localStorage.clear();
    errors.length = 0;
    errorSpy = vi.spyOn(console, 'error').mockImplementation((...args) => {
      // React Router prints its v7 future-flag notices through console.error the
      // first time a router mounts in the process. They are library advisories,
      // not app failures, so they must not fail the shell-stability assertions.
      const first = typeof args[0] === 'string' ? args[0] : '';
      if (first.includes('React Router Future Flag Warning')) return;
      errors.push(args[0]);
    });
    usePlatformStore.setState({
      activeAgent: null,
      agentHistory: [],
      voiceCommandActive: false,
      voiceStatus: 'idle',
      lastCommand: null,
      thermalSafeMode: false,
    });
  });

  afterEach(() => {
    voiceCommandService.stop();
    cleanup();
    errorSpy.mockRestore();
    vi.useRealTimers();
  });

  it('keeps one recognizer alive across agent routes and never crashes the shell', async () => {
    render(<Shell />);
    expect(screen.getByTestId('route').textContent).toBe('/agent/moksh');
    expect(screen.getByTestId('active-agent').textContent).toBe('agent_moksh');

    // Voice is opt-in: nothing is started before the user activates it.
    expect(FakeRecognition.instances).toHaveLength(0);

    // A command that navigates between agent sections.
    const ran: string[] = [];
    voiceCommandService.register({
      id: 'open-career',
      match: /open career/,
      run: ({ transcript }) => {
        ran.push(transcript);
        navigateRef?.('/agent/career');
      },
    });

    await act(async () => setVoiceEngineOptIn(true));
    await flush();

    expect(usePlatformStore.getState().voiceCommandActive).toBe(true);
    expect(FakeRecognition.instances).toHaveLength(1);
    const recognizer = FakeRecognition.instances[0];
    expect(recognizer.running).toBe(true);

    // Speak → debounce → dispatch → route switch.
    await act(async () => recognizer.speak('open career'));
    await flush();

    expect(ran).toEqual(['open career']);
    expect(screen.getByTestId('route').textContent).toBe('/agent/career');
    expect(screen.getByTestId('active-agent').textContent).toBe('agent_career');
    expect(screen.getByTestId('last-command').textContent).toBe('open career');

    // The recognizer is a singleton: routing must not recreate or stop it.
    expect(FakeRecognition.instances).toHaveLength(1);
    expect(recognizer.running).toBe(true);
    expect(usePlatformStore.getState().voiceStatus).toBe('listening');

    // A second command on the new route, after the throttle window.
    voiceCommandService.register({
      id: 'open-vr',
      match: /enter vr/,
      run: () => navigateRef?.('/agent/vr'),
    });
    await flush(2000);
    await act(async () => recognizer.speak('enter vr'));
    await flush();

    expect(screen.getByTestId('route').textContent).toBe('/agent/vr');
    expect(FakeRecognition.instances).toHaveLength(1);

    // Store history recorded every agent switch in order, newest first.
    expect(usePlatformStore.getState().agentHistory.slice(0, 3)).toEqual([
      'agent_vr',
      'agent_career',
      'agent_moksh',
    ]);
    expect(errors).toHaveLength(0);
  });

  it('persists Zustand platform state across a full shell unmount and remount', async () => {
    render(<Shell />);
    await act(async () => setVoiceEngineOptIn(true));
    await flush();
    act(() => {
      usePlatformStore.getState().setActiveAgent('agent_career');
      usePlatformStore.getState().setLastCommand('open career');
      usePlatformStore.getState().setIntimacyLevel(3);
    });

    cleanup();
    voiceCommandService.stop();

    // Remount the whole shell — persisted slices survive.
    render(<Shell />);
    await flush();

    const state = usePlatformStore.getState();
    expect(state.agentHistory).toContain('agent_career');
    expect(state.intimacyLevel).toBe(3);
    expect(state.lastCommand).toBe('open career');
    // Opt-in is remembered, so the engine restarts itself on the new mount.
    expect(state.voiceCommandActive).toBe(true);
    expect(FakeRecognition.instances.at(-1)?.running).toBe(true);
    expect(errors).toHaveLength(0);
  });

  it('a throwing voice command degrades to an error status without unmounting the app', async () => {
    render(<Shell />);
    voiceCommandService.register({
      id: 'boom',
      match: /crash now/,
      run: () => {
        throw new Error('agent module exploded');
      },
    });
    await act(async () => setVoiceEngineOptIn(true));
    await flush();

    const recognizer = FakeRecognition.instances[0];
    await act(async () => recognizer.speak('crash now'));
    await flush();

    // Shell is still mounted and interactive.
    expect(screen.getByTestId('route').textContent).toBe('/agent/moksh');
    expect(usePlatformStore.getState().voiceCommandActive).toBe(true);
    expect(recognizer.running).toBe(true);
  });

  it('thermal safe mode suspends the recognizer without losing agent state', async () => {
    render(<Shell />);
    await act(async () => setVoiceEngineOptIn(true));
    await flush();
    const recognizer = FakeRecognition.instances[0];
    expect(recognizer.running).toBe(true);

    act(() => usePlatformStore.getState().setThermalSafeMode(true));
    await flush();
    expect(voiceCommandService.isRunning).toBe(false);
    expect(usePlatformStore.getState().activeAgent).toBe('agent_moksh');

    act(() => usePlatformStore.getState().setThermalSafeMode(false));
    await flush();
    expect(voiceCommandService.isRunning).toBe(true);
    expect(screen.getByTestId('route').textContent).toBe('/agent/moksh');
  });
});

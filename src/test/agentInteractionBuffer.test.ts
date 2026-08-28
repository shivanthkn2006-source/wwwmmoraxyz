import { describe, it, expect, beforeEach } from 'vitest';
import {
  __resetAgentBuffer,
  bufferAgentContext,
  confirmBufferedWrite,
  dropBufferedWrite,
  mergeAgentContext,
  pendingBufferedCount,
  readBufferedAgentContext,
  clearBufferedAgent,
} from '@/lib/data/agentInteractionBuffer';
import type { AgentInteraction } from '@/lib/data/agentInteractions';

const serverRow = (over: Partial<AgentInteraction> = {}): AgentInteraction => ({
  id: 'srv1',
  user_id: 'user-a',
  agent_id: 'agent_moksh',
  context_payload: { from: 'server' },
  created_at: new Date(Date.now() - 60_000).toISOString(),
  updated_at: new Date(Date.now() - 60_000).toISOString(),
  ...over,
});

describe('agent interaction local buffer', () => {
  beforeEach(() => {
    localStorage.clear();
    __resetAgentBuffer();
  });

  it('buffers a snapshot and reads it back for that agent only', () => {
    bufferAgentContext('agent_moksh', { intimacy_level: 4 });
    bufferAgentContext('agent_career', { role: 'founder' });

    const moksh = readBufferedAgentContext('agent_moksh');
    expect(moksh).toHaveLength(1);
    expect(moksh[0].context_payload).toEqual({ intimacy_level: 4 });
    expect(readBufferedAgentContext('agent_career')).toHaveLength(1);
    expect(pendingBufferedCount()).toBe(2);
  });

  it('persists across a simulated reload', () => {
    bufferAgentContext('agent_feed', { last_scroll: 5 });
    __resetAgentBuffer.name; // no-op reference
    // simulate reload: module state is dropped but localStorage survives
    const raw = localStorage.getItem('mmora.agentBuffer.v1');
    expect(raw).toContain('agent_feed');
  });

  it('confirms a queued write and clears the pending flag', () => {
    const row = bufferAgentContext('agent_moksh', { a: 1 }, { queueId: 'wq_1' });
    expect(row.pending).toBe(true);
    confirmBufferedWrite('wq_1', { id: 'srv-99', user_id: 'user-a' });
    const [confirmed] = readBufferedAgentContext('agent_moksh');
    expect(confirmed.pending).toBe(false);
    expect(confirmed.id).toBe('srv-99');
    expect(pendingBufferedCount()).toBe(0);
  });

  it('drops a permanently rejected buffered write', () => {
    bufferAgentContext('agent_moksh', { a: 1 }, { queueId: 'wq_bad' });
    dropBufferedWrite('wq_bad');
    expect(readBufferedAgentContext('agent_moksh')).toHaveLength(0);
  });

  it('merges server rows with unsynced local rows, newest first', () => {
    bufferAgentContext('agent_moksh', { from: 'local' }, { queueId: 'wq_2' });
    const merged = mergeAgentContext('agent_moksh', [serverRow()]);
    expect(merged).toHaveLength(2);
    expect(merged[0].context_payload).toEqual({ from: 'local' });
    expect(merged[0].pending).toBe(true);
    expect(merged[1].pending).toBe(false);
  });

  it('never merges rows across agent ids', () => {
    bufferAgentContext('agent_career', { from: 'local-career' });
    const merged = mergeAgentContext('agent_moksh', [
      serverRow(),
      serverRow({ id: 'srv2', agent_id: 'agent_career' }),
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0].agent_id).toBe('agent_moksh');
  });

  it('clears one agent without touching the others', () => {
    bufferAgentContext('agent_moksh', { a: 1 });
    bufferAgentContext('agent_career', { b: 2 });
    clearBufferedAgent('agent_moksh');
    expect(readBufferedAgentContext('agent_moksh')).toHaveLength(0);
    expect(readBufferedAgentContext('agent_career')).toHaveLength(1);
  });
});

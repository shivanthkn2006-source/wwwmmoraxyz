/* @vitest-environment jsdom */
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import PrivacyDataPage from '@/pages/PrivacyDataPage';
const mocks = vi.hoisted(() => ({ invoke: vi.fn(), signOut: vi.fn(), success: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { functions: { invoke: mocks.invoke }, auth: { signOut: mocks.signOut } } }));
vi.mock('sonner', () => ({ toast: { success: mocks.success, error: vi.fn() } }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
describe('privacy page refuses incomplete outcomes', () => {
 it('does not download a failed export', async () => {
  const create = vi.fn(); vi.stubGlobal('URL', { createObjectURL: create });
  mocks.invoke.mockResolvedValue({ data: null, error: { message: 'non-2xx' } });
  render(<PrivacyDataPage />); fireEvent.click(screen.getByRole('button', { name: 'Download' }));
  await screen.findByRole('alert'); expect(create).not.toHaveBeenCalled(); expect(mocks.success).not.toHaveBeenCalled(); vi.unstubAllGlobals();
 });
 it.each([
  { data: { ok: true, failed_tables: ['fixture'], login_removed: true }, error: null },
  { data: { ok: true, login_removed: false }, error: null },
  { data: { ok: false, partial: true, login_removed: false }, error: null },
  { data: null, error: { message: '503' } },
 ])('never signs out after unconfirmed deletion %#', async result => {
  mocks.invoke.mockResolvedValue(result); render(<PrivacyDataPage />);
  fireEvent.change(screen.getByLabelText('Type DELETE to confirm'), { target: { value: 'DELETE' } });
  fireEvent.click(screen.getByRole('button', { name: 'Delete everything' }));
  await screen.findByRole('alert'); expect(mocks.signOut).not.toHaveBeenCalled(); expect(mocks.success).not.toHaveBeenCalled();
  await waitFor(() => expect(screen.getByRole('button', { name: 'Delete everything' }).hasAttribute('disabled')).toBe(false));
 });
});

import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next-themes', () => ({ useTheme: () => ({ theme: 'dark' }) }));
vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
  Toaster: (props: Record<string, unknown>) => <div data-testid="sonner" data-position={String(props.position)} />,
}));

import { Toaster, toast } from '@/components/ui/sonner';

describe('global notification surface', () => {
  it('renders a visible top-center notification host', () => {
    render(<Toaster />);
    expect(screen.getByTestId('sonner')).toHaveAttribute('data-position', 'top-center');
  });

  it('exports the real toast dispatcher', () => {
    toast('Visible alert');
    expect(toast).toHaveBeenCalledWith('Visible alert');
  });
});
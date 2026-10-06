// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import VRGamepadHUD from '@/components/vr/VRGamepadHUD';
import { stickToKeys, fireAction, loadLayout } from '@/lib/vrInput';

afterEach(() => { cleanup(); localStorage.clear(); });

const keyLog = () => {
  const log: string[] = [];
  const on = (e: KeyboardEvent) => log.push(`${e.type}:${e.code}`);
  window.addEventListener('keydown', on); window.addEventListener('keyup', on);
  return { log, off: () => { window.removeEventListener('keydown', on); window.removeEventListener('keyup', on); } };
};

describe('VR controller layer', () => {
  it('maps sticks to WASD with a dead zone', () => {
    expect(stickToKeys(0.1, -0.1)).toEqual({ KeyW: false, KeyS: false, KeyA: false, KeyD: false });
    expect(stickToKeys(0.9, -0.9)).toMatchObject({ KeyW: true, KeyD: true });
  });

  it('every button reaches its existing wiring', () => {
    const k = keyLog();
    const events: string[] = [];
    for (const n of ['vr-interact', 'vr-open-menu', 'vr-show-feature']) window.addEventListener(n, () => events.push(n));
    render(<VRGamepadHUD />);
    const tap = (name: RegExp) => { const b = screen.getByRole('button', { name }); fireEvent.pointerDown(b); fireEvent.pointerUp(b); };
    tap(/^jump$/i); tap(/run/i); tap(/run/i); tap(/zoom lens/i); tap(/switch camera/i); tap(/pick up/i); tap(/ask zoe/i);
    fireAction('menu', true);
    expect(k.log).toEqual(expect.arrayContaining(['keydown:Space', 'keyup:Space', 'keydown:ShiftLeft', 'keyup:ShiftLeft', 'keydown:KeyZ', 'keydown:KeyV']));
    expect(events).toEqual(expect.arrayContaining(['vr-interact', 'vr-open-menu', 'vr-show-feature']));
    k.off();
  });

  it('layout editor saves opacity and size on the device', () => {
    render(<VRGamepadHUD />);
    act(() => { window.dispatchEvent(new Event('vr-edit-layout')); });
    fireEvent.click(screen.getByRole('button', { name: /more size/i }));
    fireEvent.click(screen.getByRole('button', { name: /less opacity/i }));
    expect(loadLayout()).toEqual({ opacity: 0.6, scale: 1.1 });
  });

  it('interact result shows feedback', async () => {
    render(<VRGamepadHUD />);
    window.dispatchEvent(new CustomEvent('vr-use-result', { detail: { ok: false, text: 'Nothing to use here' } }));
    expect(await screen.findByText(/nothing to use here/i)).toBeInTheDocument();
  });

  it('zoom fires once per tap, not on release', () => {
    const k = keyLog(); fireAction('zoom', true); fireAction('zoom', false);
    expect(k.log.filter(x => x === 'keydown:KeyZ')).toHaveLength(1); k.off();
  });
});

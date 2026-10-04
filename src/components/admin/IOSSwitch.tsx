/**
 * iOS switch measured from the reference: 54×24 pill track, 32×20 pill knob, 2px inset.
 * On (default) = Apple systemBlue, off = Apple switch grey. Sizes/colours live in index.css (.ios26-switch).
 * A <span role="switch"> (not <button>) so global button styles can never resize or recolour it.
 */
import type { KeyboardEvent } from 'react';

export default function IOSSwitch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  const toggle = () => { if (!disabled) onChange(!checked); };
  const onKey = (e: KeyboardEvent<HTMLSpanElement>) => {
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(); }
  };
  return (
    <span
      role="switch"
      tabIndex={disabled ? -1 : 0}
      aria-checked={checked}
      aria-label={label}
      aria-disabled={disabled ? 'true' : 'false'}
      onClick={toggle}
      onKeyDown={onKey}
      className="ios26-switch"
      data-on={checked ? 'true' : 'false'}
    >
      <span className="ios26-switch-knob" />
    </span>
  );
}

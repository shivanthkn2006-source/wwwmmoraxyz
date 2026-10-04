/**
 * iOS 26-style switch measured from the reference: 54×24 pill track, 32×20 pill knob, 2px inset. On = solid white track (default),
 * off = solid platform warm tan. Colours live in index.css (.ios26-switch) with !important so admin liquid button resets can't override.
 */
export default function IOSSwitch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="ios26-switch"
      data-on={checked ? 'true' : 'false'}
      style={{
        position: 'relative', display: 'inline-flex', alignItems: 'center', flexShrink: 0,
        width: 54, height: 24, padding: 0, borderRadius: 9999, border: 'none', outline: 'none',
        transition: 'background 200ms ease', opacity: disabled ? 0.5 : 1, cursor: disabled ? 'default' : 'pointer',
      }}
    >
      <span
        className="ios26-switch-knob"
        style={{
          position: 'absolute', top: 2, left: 2, width: 32, height: 20, borderRadius: 9999,
          background: checked ? 'hsl(36 30% 92%)' : 'hsl(0 0% 100%)',
          boxShadow: '0 2px 5px hsl(30 30% 12% / 0.35), 0 0 0 0.5px hsl(30 20% 40% / 0.2)',
          transform: checked ? 'translateX(18px)' : 'translateX(0)',
          transition: 'transform 200ms cubic-bezier(.3,.7,.4,1)',
        }}
      />
    </button>
  );
}

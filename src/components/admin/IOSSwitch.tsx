/**
 * iOS-style switch (51×31 pill, 27px knob). On = solid white track (default),
 * off = solid platform warm tan. Inline styles so global button resets can't override.
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
      style={{
        position: 'relative', display: 'inline-flex', alignItems: 'center', flexShrink: 0,
        width: 51, height: 31, padding: 0, borderRadius: 9999, border: 'none', outline: 'none',
        background: checked ? 'hsl(0 0% 100%)' : 'hsl(33 32% 56%)',
        boxShadow: checked ? 'inset 0 0 0 1px hsl(30 20% 70% / 0.6)' : 'none',
        transition: 'background 200ms ease', opacity: disabled ? 0.5 : 1, cursor: disabled ? 'default' : 'pointer',
      }}
    >
      <span
        style={{
          position: 'absolute', top: 2, left: 2, width: 27, height: 27, borderRadius: 9999,
          background: checked ? 'hsl(36 30% 92%)' : 'hsl(0 0% 100%)',
          boxShadow: '0 2px 5px hsl(30 30% 12% / 0.35), 0 0 0 0.5px hsl(30 20% 40% / 0.2)',
          transform: checked ? 'translateX(20px)' : 'translateX(0)',
          transition: 'transform 200ms cubic-bezier(.3,.7,.4,1)',
        }}
      />
    </button>
  );
}

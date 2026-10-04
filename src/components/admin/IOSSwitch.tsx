/** iOS-style rounded switch: on = white track, off = platform warm tan. */
export default function IOSSwitch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-[31px] w-[51px] shrink-0 items-center rounded-full transition-colors duration-200 disabled:opacity-50 ${checked ? 'ios-switch-on' : 'ios-switch-off'}`}
    >
      <span className={`ios-switch-knob absolute h-[27px] w-[27px] rounded-full transition-transform duration-200 ${checked ? 'translate-x-[22px]' : 'translate-x-[2px]'}`} />
    </button>
  );
}

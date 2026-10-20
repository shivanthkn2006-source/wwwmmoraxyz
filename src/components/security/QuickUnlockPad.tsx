import { useEffect, useRef, useState } from 'react';

interface Props {
  title: string;
  hint?: string;
  error?: string | null;
  busy?: boolean;
  onComplete: (code: string) => void;
}

/** Five masked digit boxes; typing, deleting and pasting all work on phones. */
export default function QuickUnlockPad({ title, hint, error, busy, onComplete }: Props) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => { if (error) setValue(''); }, [error]);

  const update = (raw: string) => {
    const next = raw.replace(/\D/g, '').slice(0, 5);
    setValue(next);
    if (next.length === 5) onComplete(next);
  };

  return (
    <div className="flex flex-col items-center gap-4 text-center" onClick={() => inputRef.current?.focus()}>
      <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
      <div className="relative flex gap-3" aria-hidden>
        {Array.from({ length: 5 }).map((_, i) => (
          <span
            key={i}
            className={`flex h-14 w-11 items-center justify-center rounded-xl text-2xl font-bold tan-circle tan-circle-icon ${i === value.length ? 'ring-2 ring-foreground/60' : ''}`}
          >
            {value[i] ? '•' : ''}
          </span>
        ))}
      </div>
      <input
        ref={inputRef}
        aria-label={title}
        type="password"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        maxLength={5}
        value={value}
        disabled={busy}
        onChange={(e) => update(e.target.value)}
        className="absolute h-px w-px opacity-0"
      />
      <p className="min-h-5 text-sm font-medium text-foreground" role="alert">
        {busy ? 'Checking…' : error ?? ''}
      </p>
    </div>
  );
}

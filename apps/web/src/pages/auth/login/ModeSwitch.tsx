import { KeyboardEvent, useRef } from 'react';
import clsx from 'clsx';

export type LoginMode = 'guest' | 'staff';

const MODES: { value: LoginMode; label: string }[] = [
  { value: 'guest', label: 'Guest' },
  { value: 'staff', label: 'Staff' },
];

interface Props {
  mode: LoginMode;
  onChange: (mode: LoginMode) => void;
  disabled?: boolean;
}

/** Segmented Guest | Staff switch (ARIA tabs; arrow keys, Home and End move between them). */
export function ModeSwitch({ mode, onChange, disabled }: Props) {
  const tabs = useRef<Partial<Record<LoginMode, HTMLButtonElement | null>>>({});

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = MODES.findIndex((m) => m.value === mode);
    const last = MODES.length - 1;
    const next =
      e.key === 'ArrowRight' || e.key === 'ArrowDown' ? (i === last ? 0 : i + 1)
      : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? (i === 0 ? last : i - 1)
      : e.key === 'Home' ? 0
      : e.key === 'End' ? last
      : null;
    if (next === null || disabled) return;
    e.preventDefault();
    const { value } = MODES[next];
    onChange(value);
    tabs.current[value]?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label="Sign in as"
      onKeyDown={onKeyDown}
      className="relative inline-grid grid-cols-2 rounded-full bg-ink/[0.06] p-1 shadow-[inset_0_1px_2px_rgb(58_42_31/0.1)]"
    >
      {/* Sliding thumb */}
      <span
        aria-hidden="true"
        className={clsx(
          'absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full bg-white',
          'shadow-[0_2px_6px_rgb(58_42_31/0.18),0_1px_1px_rgb(58_42_31/0.1)]',
          'transition-transform duration-300 ease-[cubic-bezier(0.65,0,0.35,1)] motion-reduce:transition-none',
          mode === 'staff' && 'translate-x-full',
        )}
      />
      {MODES.map((m) => {
        const selected = m.value === mode;
        return (
          <button
            key={m.value}
            ref={(el) => { tabs.current[m.value] = el; }}
            type="button"
            role="tab"
            id={`login-tab-${m.value}`}
            aria-selected={selected}
            aria-controls={`login-panel-${m.value}`}
            tabIndex={selected ? 0 : -1}
            disabled={disabled && !selected}
            onClick={() => onChange(m.value)}
            className={clsx(
              'relative min-w-[104px] rounded-full px-5 py-2 text-sm font-medium tracking-wide transition-colors',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-clay focus-visible:ring-offset-2 focus-visible:ring-offset-sand-50',
              selected ? 'text-ink' : 'text-ink/55 hover:text-ink/80',
              'disabled:cursor-not-allowed',
            )}
          >
            {m.label}
          </button>
        );
      })}
    </div>
  );
}

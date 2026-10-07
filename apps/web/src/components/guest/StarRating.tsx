import { useId, useState } from 'react';
import { StarIcon } from '@phosphor-icons/react';
import clsx from 'clsx';
import { FieldError } from './ui';

const WORDS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];

interface StarPickerProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  /** Shown below the stars */
  error?: string;
}

/**
 * Five-star input built on native radios: arrow keys move between stars and
 * screen readers announce "4 stars, Very good". Hover previews the choice.
 */
export function StarPicker({ label, value, onChange, error }: StarPickerProps) {
  const name = useId();
  const errorId = useId();
  const [hover, setHover] = useState(0);
  const shown = hover || value;

  return (
    <fieldset className="min-w-0" aria-describedby={error ? errorId : undefined}>
      <legend className="text-sm font-medium">{label}</legend>
      <div className="mt-2 flex items-center gap-3">
        <div className="-ml-1 flex" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="cursor-pointer p-1" onMouseEnter={() => setHover(n)}>
              <input
                type="radio"
                name={name}
                value={n}
                checked={value === n}
                onChange={() => onChange(n)}
                className="peer sr-only"
              />
              <span
                className="flex rounded-lg transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-90
                           peer-focus-visible:ring-2 peer-focus-visible:ring-guest-clay/50"
              >
                <StarIcon
                  size={30}
                  weight={shown >= n ? 'fill' : 'regular'}
                  aria-hidden
                  className={clsx('transition-colors', shown >= n ? 'text-guest-clay' : 'text-guest-muted')}
                />
              </span>
              <span className="sr-only">
                {n} star{n !== 1 ? 's' : ''}, {WORDS[n]}
              </span>
            </label>
          ))}
        </div>
        <span aria-hidden className="text-sm text-guest-muted">
          {WORDS[shown]}
        </span>
      </div>
      {error && (
        <div className="mt-1.5">
          <FieldError id={errorId}>{error}</FieldError>
        </div>
      )}
    </fieldset>
  );
}

/** Read-only stars, e.g. a rating already given. */
export function StarDisplay({ value }: { value: number }) {
  return (
    <span role="img" aria-label={`${value} out of 5 stars`} className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <StarIcon
          key={n}
          size={14}
          weight={n <= value ? 'fill' : 'regular'}
          aria-hidden
          className={n <= value ? 'text-guest-clay' : 'text-guest-muted'}
        />
      ))}
    </span>
  );
}

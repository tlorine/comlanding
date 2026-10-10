import { useId } from 'react';
import type { ChangeEvent } from 'react';

type Props = {
  as?: 'input' | 'textarea';
  name: string;
  label: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onBlur?: () => void;
  error?: string;
  hint?: string;
  optionalLabel?: string;
  placeholder?: string;
  maxLength?: number;
  rows?: number;
  autoComplete?: string;
  /** Поле, на которое встаёт фокус при открытии модалки (на десктопе) */
  initialFocus?: boolean;
};

export function Field({
  as = 'input',
  label,
  error,
  hint,
  optionalLabel,
  rows = 4,
  initialFocus,
  ...rest
}: Props) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  const describedBy =
    [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') ||
    undefined;

  // text-base на мобильных: iOS не зумит страницу при фокусе на полях ≥16px
  const control = [
    'w-full rounded-xl border bg-white/5 px-4 py-3 text-base text-white outline-none transition-colors sm:text-sm',
    'placeholder:text-white/25 focus:bg-white/[0.07] disabled:opacity-50',
    error
      ? 'border-red-400/60 focus:border-red-400'
      : 'border-white/10 focus:border-white/40',
  ].join(' ');

  const common = {
    ...rest,
    id,
    className: control,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy,
    'data-autofocus': initialFocus ? '' : undefined,
  };

  return (
    <div>
      <label htmlFor={id} className="mb-2 flex items-baseline justify-between gap-3 text-sm font-medium text-white/80">
        <span>{label}</span>
        {optionalLabel && (
          <span className="text-xs font-normal text-white/30">{optionalLabel}</span>
        )}
      </label>

      {as === 'textarea' ? (
        <textarea {...common} rows={rows} className={`${control} resize-none`} />
      ) : (
        <input {...common} type="text" />
      )}

      {error && (
        <p id={errorId} className="mt-2 text-xs text-red-300">
          {error}
        </p>
      )}
      {hint && !error && (
        <p id={hintId} className="mt-2 text-xs text-white/30">
          {hint}
        </p>
      )}
    </div>
  );
}
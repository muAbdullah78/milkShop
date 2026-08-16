import type { ReactNode } from 'react';

const TONES = {
  primary: { bg: '#E7EDFF', fg: '#1B3FCB' },
  success: { bg: '#E1F6EA', fg: '#0E8F47' },
  danger: { bg: '#FDE7E8', fg: '#CC2E33' },
  warning: { bg: '#FDF1D9', fg: '#B45309' },
  accent: { bg: '#DEF7F4', fg: '#0FB5A5' },
  muted: { bg: '#F2F6FC', fg: '#5A6B8C' },
} as const;

export type Tone = keyof typeof TONES;

export function Stat({
  label,
  value,
  sub,
  tone = 'muted',
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: Tone;
}) {
  const t = TONES[tone];
  return (
    <div className="rounded-2xl border border-line bg-white p-5">
      <p className="text-xs font-bold uppercase tracking-wider text-ink-faint">{label}</p>
      <p className="mt-2 text-2xl font-extrabold num" style={{ color: t.fg }}>
        {value}
      </p>
      {sub ? <p className="mt-0.5 text-xs text-ink-faint">{sub}</p> : null}
    </div>
  );
}

export function Card({
  title,
  sub,
  action,
  children,
  className = '',
}: {
  title?: string;
  sub?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-line bg-white p-5 ${className}`}>
      {title ? (
        <header className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-bold text-ink">{title}</h2>
            {sub ? <p className="text-xs text-ink-faint">{sub}</p> : null}
          </div>
          {action}
        </header>
      ) : null}
      {children}
    </section>
  );
}

export function Badge({ tone = 'muted', children }: { tone?: Tone; children: ReactNode }) {
  const t = TONES[tone];
  return (
    <span
      className="rounded-full px-2.5 py-0.5 text-[11px] font-bold"
      style={{ background: t.bg, color: t.fg }}
    >
      {children}
    </span>
  );
}

export function Button({
  children,
  onClick,
  type = 'button',
  tone = 'primary',
  disabled,
  full,
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  tone?: 'primary' | 'danger' | 'ghost' | 'success';
  disabled?: boolean;
  full?: boolean;
}) {
  const styles: Record<string, string> = {
    primary: 'bg-primary text-white hover:bg-brand',
    danger: 'bg-danger text-white hover:opacity-90',
    success: 'bg-money-in text-white hover:opacity-90',
    ghost: 'border border-line text-ink hover:bg-page',
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl px-4 py-2.5 text-sm font-bold transition disabled:opacity-50 ${styles[tone]} ${
        full ? 'w-full' : ''
      }`}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold text-ink">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-ink-faint">{hint}</span> : null}
    </label>
  );
}

export const inputClass =
  'mt-1.5 w-full rounded-xl border border-line bg-page px-3.5 py-2.5 text-sm outline-none focus:border-primary';

export function Empty({ text }: { text: string }) {
  return <p className="py-8 text-center text-sm text-ink-muted">{text}</p>;
}

import { PageHead } from '../components/Layout';
import { useI18n, type StringKey } from '../i18n';

const STEPS: { t: StringKey; d: StringKey }[] = [
  { t: 'how.1.t', d: 'how.1.d' },
  { t: 'how.2.t', d: 'how.2.d' },
  { t: 'how.3.t', d: 'how.3.d' },
  { t: 'how.4.t', d: 'how.4.d' },
];

export default function HowItWorks() {
  const { t } = useI18n();
  return (
    <>
      <PageHead title={t('how.title')} />
      <div className="mx-auto max-w-3xl px-5 py-16">
        <ol className="relative space-y-10 border-s-2 border-line ps-8">
          {STEPS.map((s, i) => (
            <li key={s.t} className="relative">
              <span className="absolute -start-[41px] grid h-9 w-9 place-items-center rounded-full bg-primary text-sm font-extrabold text-white num">
                {i + 1}
              </span>
              <h2 className="text-xl font-bold text-ink">{t(s.t)}</h2>
              <p className="mt-1.5 leading-relaxed text-ink-muted">{t(s.d)}</p>
            </li>
          ))}
        </ol>
      </div>
    </>
  );
}

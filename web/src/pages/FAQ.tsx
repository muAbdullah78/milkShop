import { PageHead } from '../components/Layout';
import { useI18n, type StringKey } from '../i18n';

const QA: [StringKey, StringKey][] = [
  ['faq.q1', 'faq.a1'],
  ['faq.q2', 'faq.a2'],
  ['faq.q3', 'faq.a3'],
  ['faq.q4', 'faq.a4'],
  ['faq.q5', 'faq.a5'],
  ['faq.q6', 'faq.a6'],
];

export default function FAQ() {
  const { t } = useI18n();
  return (
    <>
      <PageHead title={t('faq.title')} />
      <div className="mx-auto max-w-3xl px-5 py-16">
        <div className="space-y-3">
          {QA.map(([q, a]) => (
            <details key={q} className="group rounded-2xl border border-line bg-white p-5 open:shadow-sm">
              <summary className="cursor-pointer list-none text-base font-bold text-ink marker:hidden">
                <span className="flex items-start justify-between gap-4">
                  {t(q)}
                  <svg className="mt-1 shrink-0 text-ink-faint transition group-open:rotate-180"
                    width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </span>
              </summary>
              <p className="mt-3 leading-relaxed text-ink-muted">{t(a)}</p>
            </details>
          ))}
        </div>
      </div>
    </>
  );
}

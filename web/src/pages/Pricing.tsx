import { PageHead } from '../components/Layout';
import { useI18n } from '../i18n';
import { playUrl } from '../site.config';

export default function Pricing() {
  const { t, lang } = useI18n();
  const included =
    lang === 'ur'
      ? ['لامحدود گاہک', 'لامحدود کھاتے', 'واٹس ایپ بل', 'رپورٹس اور منافع', 'کلاؤڈ بیک اپ', 'انگریزی اور اردو']
      : ['Unlimited customers', 'Unlimited khaatas', 'WhatsApp bills', 'Reports and profit', 'Cloud backup', 'English and Urdu'];

  return (
    <>
      <PageHead title={t('price.title')} sub={t('price.sub')} />
      <div className="mx-auto max-w-3xl px-5 py-16">
        <div className="rounded-3xl border-2 border-primary bg-white p-8 text-center">
          <p className="text-6xl font-extrabold tracking-tight text-primary num">Rs 0</p>
          <p className="mt-2 text-ink-muted">{t('price.sub')}</p>

          <ul className="mx-auto mt-8 grid max-w-md gap-2.5 text-start sm:grid-cols-2">
            {included.map((f) => (
              <li key={f} className="flex gap-2.5">
                <svg className="mt-1 shrink-0 text-money-in" width="17" height="17" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
                  <path d="m5 13 4 4L19 7" />
                </svg>
                <span className="text-sm text-ink-muted">{f}</span>
              </li>
            ))}
          </ul>

          <a href={playUrl} target="_blank" rel="noreferrer"
            className="mt-9 inline-block rounded-2xl bg-primary px-7 py-4 text-base font-bold text-white transition hover:bg-brand">
            {t('hero.cta')}
          </a>
        </div>

        <div className="mt-10 rounded-2xl border border-line bg-white p-6">
          <h2 className="text-lg font-bold text-ink">{t('price.why')}</h2>
          <p className="mt-2 leading-relaxed text-ink-muted">{t('price.whyD')}</p>
        </div>
      </div>
    </>
  );
}

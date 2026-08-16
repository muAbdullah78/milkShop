import { PageHead } from '../components/Layout';
import { useI18n } from '../i18n';
import { playUrl, site } from '../site.config';

export default function Download() {
  const { t, lang } = useI18n();
  const reqs =
    lang === 'ur'
      ? ['اینڈرائیڈ 7.0 یا اس سے نیا', 'تقریباً 40 ایم بی جگہ', 'پہلی بار سیٹ اپ کے لیے انٹرنیٹ', 'بل بھیجنے کے لیے واٹس ایپ']
      : ['Android 7.0 or newer', 'About 40 MB of space', 'Internet for first-time setup', 'WhatsApp to send bills'];

  return (
    <>
      <PageHead title={t('nav.download')} sub={t('hero.note')} />
      <div className="mx-auto max-w-3xl px-5 py-16">
        <div className="rounded-3xl border border-line bg-white p-8 text-center">
          <h2 className="text-2xl font-extrabold text-ink">{site.appName}</h2>
          <p className="mt-1 text-sm text-ink-faint num">{site.androidPackage}</p>
          <a href={playUrl} target="_blank" rel="noreferrer"
            className="mt-7 inline-flex items-center gap-3 rounded-2xl bg-ink px-7 py-4 text-white transition hover:opacity-90">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M3.6 1.8a1.4 1.4 0 0 0-.5 1.1v18.2c0 .45.2.85.5 1.1l10-10.2zM17.1 8.6 5.3 1.9l9.3 9.5zM20.6 11l-2.6-1.5-2.7 2.7 2.7 2.7 2.6-1.5c.9-.5.9-1.9 0-2.4zM5.3 22.1l11.8-6.7-2.5-2.5z" />
            </svg>
            <span className="text-start">
              <span className="block text-[10px] uppercase tracking-wider opacity-70">
                {lang === 'ur' ? 'حاصل کریں' : 'Get it on'}
              </span>
              <span className="block text-base font-bold">Google Play</span>
            </span>
          </a>
        </div>

        <div className="mt-8 rounded-2xl border border-line bg-white p-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-ink-faint">
            {lang === 'ur' ? 'کیا درکار ہے' : 'What you need'}
          </h3>
          <ul className="mt-3 space-y-2">
            {reqs.map((r) => (
              <li key={r} className="text-ink-muted">• {r}</li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}

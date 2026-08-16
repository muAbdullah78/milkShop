import { Link } from 'react-router-dom';

import { useI18n, type StringKey } from '../i18n';
import { playUrl, site } from '../site.config';

const FEATURES: { icon: string; t: StringKey; d: StringKey; tint: string }[] = [
  { icon: 'M4 7h16M4 12h16M4 17h10', t: 'feat.khaata.t', d: 'feat.khaata.d', tint: '#B45309' },
  { icon: 'm5 13 4 4L19 7', t: 'feat.round.t', d: 'feat.round.d', tint: '#0E8F47' },
  { icon: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z', t: 'feat.bills.t', d: 'feat.bills.d', tint: '#1B3FCB' },
  { icon: 'M20 7 12 3 4 7v10l8 4 8-4z M4 7l8 4 8-4 M12 11v10', t: 'feat.items.t', d: 'feat.items.d', tint: '#0FB5A5' },
  { icon: 'm3 17 6-6 4 4 8-8 M21 7v6h-6', t: 'feat.money.t', d: 'feat.money.d', tint: '#7C3AED' },
  { icon: 'M2 12h4l3 8 4-16 3 8h6', t: 'feat.offline.t', d: 'feat.offline.d', tint: '#0E9BEF' },
  { icon: 'M5 8h14M7 12h10M9 16h6', t: 'feat.urdu.t', d: 'feat.urdu.d', tint: '#DB2777' },
  { icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', t: 'feat.safe.t', d: 'feat.safe.d', tint: '#64748B' },
];

const STEPS: { t: StringKey; d: StringKey }[] = [
  { t: 'how.1.t', d: 'how.1.d' },
  { t: 'how.2.t', d: 'how.2.d' },
  { t: 'how.3.t', d: 'how.3.d' },
  { t: 'how.4.t', d: 'how.4.d' },
];

export default function Home() {
  const { t, lang } = useI18n();

  return (
    <>
      {/* Hero */}
      <section
        className="relative overflow-hidden text-white"
        style={{ background: 'linear-gradient(135deg,#0E1B52 0%,#1B3FCB 62%,#2F72E8 100%)' }}
      >
        <div className="mx-auto max-w-6xl px-5 py-20 sm:py-28">
          <span className="inline-block rounded-full bg-white/18 px-3.5 py-1.5 text-xs font-bold tracking-wide">
            {t('hero.badge')}
          </span>

          <h1 className="mt-6 max-w-3xl text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-6xl">
            {t('hero.title')}
          </h1>

          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/85 sm:text-xl">
            {t('hero.sub')}
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <a
              href={playUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-2xl bg-white px-6 py-4 text-base font-bold text-brand shadow-lg transition hover:bg-white/90"
            >
              {t('hero.cta')}
            </a>
            <Link
              to="/features"
              className="rounded-2xl border-2 border-white/35 px-6 py-4 text-base font-bold text-white transition hover:bg-white/10"
            >
              {t('hero.cta2')}
            </Link>
          </div>

          <p className="mt-5 text-sm text-white/70">{t('hero.note')}</p>
        </div>

        <div
          className="pointer-events-none absolute -end-24 -top-24 h-96 w-96 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle,#fff,transparent 70%)' }}
          aria-hidden
        />
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-5 py-20 sm:py-24">
        <h2 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          {t('feat.title')}
        </h2>
        <p className="mt-3 max-w-2xl text-lg text-ink-muted">{t('feat.sub')}</p>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <article
              key={f.t}
              className="rounded-2xl border border-line bg-white p-6 transition hover:shadow-md"
            >
              <span
                className="grid h-11 w-11 place-items-center rounded-xl"
                style={{ background: `${f.tint}1f`, color: f.tint }}
                aria-hidden
              >
                <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={f.icon} />
                </svg>
              </span>
              <h3 className="mt-4 text-base font-bold text-ink">{t(f.t)}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{t(f.d)}</p>
            </article>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-line bg-white">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:py-24">
          <h2 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            {t('how.title')}
          </h2>

          <ol className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.t}>
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-base font-extrabold text-primary num">
                  {i + 1}
                </span>
                <h3 className="mt-4 text-base font-bold text-ink">{t(s.t)}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{t(s.d)}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Sample khaata — shows the product rather than describing it */}
      <section className="mx-auto max-w-6xl px-5 py-20 sm:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
              {t('feat.khaata.t')}
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-ink-muted">{t('feat.khaata.d')}</p>
            <Link
              to="/features"
              className="mt-6 inline-block rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white transition hover:bg-brand"
            >
              {t('hero.cta2')}
            </Link>
          </div>

          <div className="rounded-3xl border border-line bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div>
                <p className="text-sm font-bold text-ink">{lang === 'ur' ? 'احمد علی' : 'Ahmad Ali'}</p>
                <p className="text-xs text-ink-faint">{lang === 'ur' ? 'گلی نمبر ۴' : 'Gali No. 4'}</p>
              </div>
              <div className="text-end">
                <p className="text-xs text-ink-faint">{lang === 'ur' ? 'بقایا' : 'Owes'}</p>
                <p className="text-xl font-extrabold text-due num">Rs 4,860</p>
              </div>
            </div>

            <ul className="divide-y divide-line">
              {[
                { l: lang === 'ur' ? 'دودھ' : 'Milk', s: '2 L × Rs 220', a: '+440', b: '4,860', up: true },
                { l: lang === 'ur' ? 'انڈے' : 'Eggs', s: '1 dozen', a: '+350', b: '4,420', up: true },
                { l: lang === 'ur' ? 'ادائیگی' : 'Payment', s: lang === 'ur' ? 'نقد' : 'Cash', a: '−3,000', b: '4,070', up: false },
                { l: lang === 'ur' ? 'دودھ' : 'Milk', s: '2 L × Rs 220', a: '+440', b: '7,070', up: true },
              ].map((r, i) => (
                <li key={i} className="flex items-center gap-3 py-3">
                  <span
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-xs font-bold"
                    style={{
                      background: r.up ? '#B4530918' : '#0E8F4718',
                      color: r.up ? '#B45309' : '#0E8F47',
                    }}
                    aria-hidden
                  >
                    {r.up ? '+' : '−'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{r.l}</p>
                    <p className="truncate text-xs text-ink-faint">{r.s}</p>
                  </div>
                  <div className="text-end">
                    <p
                      className="text-sm font-bold num"
                      style={{ color: r.up ? '#B45309' : '#0E8F47' }}
                    >
                      {r.a}
                    </p>
                    <p className="text-xs text-ink-faint num">{r.b}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="mx-auto max-w-6xl px-5 pb-8">
        <div
          className="rounded-3xl px-8 py-14 text-center text-white"
          style={{ background: 'linear-gradient(135deg,#0E1B52,#1B3FCB 70%,#2F72E8)' }}
        >
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{t('cta.title')}</h2>
          <p className="mx-auto mt-3 max-w-xl text-lg text-white/85">{t('cta.sub')}</p>
          <a
            href={playUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-8 inline-block rounded-2xl bg-white px-7 py-4 text-base font-bold text-brand shadow-lg transition hover:bg-white/90"
          >
            {t('hero.cta')}
          </a>
          <p className="mt-4 text-sm text-white/70">
            {site.appName} · {site.androidPackage}
          </p>
        </div>
      </section>
    </>
  );
}

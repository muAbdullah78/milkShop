import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';

import { useI18n, type Lang } from '../i18n';
import { playUrl, site } from '../site.config';

function Logo({ light }: { light?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5 shrink-0">
      <span
        className="grid h-9 w-9 place-items-center rounded-xl text-white"
        style={{ background: 'linear-gradient(135deg,#0E1B52,#1B3FCB 62%,#2F72E8)' }}
        aria-hidden
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M8 2h8M9 2l-.5 4.2a3 3 0 0 1-.4 1.2L6.6 9.8A4 4 0 0 0 6 11.9V19a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3v-7.1a4 4 0 0 0-.6-2.1l-1.5-2.4a3 3 0 0 1-.4-1.2L15 2" />
        </svg>
      </span>
      <span className={`text-lg font-bold tracking-tight ${light ? 'text-white' : 'text-ink'}`}>
        {site.appName}
      </span>
    </Link>
  );
}

function LangToggle() {
  const { lang, setLang } = useI18n();
  const options: { value: Lang; label: string }[] = [
    { value: 'en', label: 'EN' },
    { value: 'ur', label: 'اردو' },
  ];
  return (
    <div className="flex rounded-full bg-page p-0.5" role="group" aria-label="Language">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => setLang(o.value)}
          aria-pressed={lang === o.value}
          className={`rounded-full px-3 py-1 text-xs font-bold transition ${
            lang === o.value ? 'bg-white text-primary shadow-sm' : 'text-ink-muted hover:text-ink'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Header() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => setOpen(false), [location.pathname]);

  const links: { to: string; label: string }[] = [
    { to: '/features', label: t('nav.features') },
    { to: '/how-it-works', label: t('nav.how') },
    { to: '/pricing', label: t('nav.pricing') },
    { to: '/faq', label: t('nav.faq') },
    { to: '/support', label: t('nav.support') },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-5">
        <Logo />

        <nav className="ms-auto hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive ? 'text-primary' : 'text-ink-muted hover:text-ink'
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="ms-auto flex items-center gap-3 md:ms-0">
          <LangToggle />
          <a
            href={playUrl}
            target="_blank"
            rel="noreferrer"
            className="hidden rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white transition hover:bg-brand sm:block"
          >
            {t('nav.download')}
          </a>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="grid h-10 w-10 place-items-center rounded-lg text-ink md:hidden"
            aria-label="Menu"
            aria-expanded={open}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {open ? <path d="M18 6 6 18M6 6l12 12" /> : <path d="M3 6h18M3 12h18M3 18h18" />}
            </svg>
          </button>
        </div>
      </div>

      {open ? (
        <nav className="border-t border-line bg-white px-5 py-3 md:hidden">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className="block rounded-lg px-2 py-3 text-base font-medium text-ink-muted"
            >
              {l.label}
            </NavLink>
          ))}
          <a
            href={playUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 block rounded-xl bg-primary px-4 py-3 text-center text-base font-bold text-white"
          >
            {t('nav.download')}
          </a>
        </nav>
      ) : null}
    </header>
  );
}

export function Footer() {
  const { t } = useI18n();
  return (
    <footer className="mt-24 border-t border-line bg-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-ink-muted">{t('foot.built')}</p>
        </div>

        <FooterCol
          title={t('foot.product')}
          links={[
            { to: '/features', label: t('nav.features') },
            { to: '/how-it-works', label: t('nav.how') },
            { to: '/pricing', label: t('nav.pricing') },
            { to: '/download', label: t('nav.download') },
          ]}
        />
        <FooterCol
          title={t('foot.company')}
          links={[
            { to: '/about', label: t('foot.about') },
            { to: '/faq', label: t('nav.faq') },
            { to: '/support', label: t('nav.support') },
          ]}
        />
        <FooterCol
          title={t('foot.legal')}
          links={[
            { to: '/privacy', label: t('foot.privacy') },
            { to: '/terms', label: t('foot.terms') },
            { to: '/delete-account', label: t('foot.delete') },
          ]}
        />
      </div>

      <div className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-6 text-xs text-ink-faint sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {site.publisher}. {t('foot.rights')}
          </p>
          <a href={`mailto:${site.supportEmail}`} className="hover:text-ink">
            {site.supportEmail}
          </a>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: { to: string; label: string }[] }) {
  return (
    <div>
      <h3 className="text-xs font-bold uppercase tracking-wider text-ink-faint">{title}</h3>
      <ul className="mt-3 space-y-2">
        {links.map((l) => (
          <li key={l.to}>
            <Link to={l.to} className="text-sm text-ink-muted transition hover:text-primary">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Scrolls to the top whenever the route changes. */
export function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => window.scrollTo(0, 0), [pathname]);
  return null;
}

export function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

/** Standard page header for inner pages. */
export function PageHead({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="border-b border-line bg-white">
      <div className="mx-auto max-w-4xl px-5 py-14 sm:py-20">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">{title}</h1>
        {sub ? <p className="mt-3 max-w-2xl text-lg leading-relaxed text-ink-muted">{sub}</p> : null}
      </div>
    </div>
  );
}

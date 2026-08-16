import { Link } from 'react-router-dom';

import { useI18n } from '../i18n';

export default function NotFound() {
  const { lang } = useI18n();
  const ur = lang === 'ur';
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-5 py-28 text-center">
      <p className="text-6xl font-extrabold text-primary num">404</p>
      <h1 className="mt-4 text-2xl font-extrabold text-ink">
        {ur ? 'یہ صفحہ نہیں ملا' : 'This page does not exist'}
      </h1>
      <p className="mt-2 text-ink-muted">
        {ur ? 'شاید لنک پرانا ہے۔' : 'The link may be out of date.'}
      </p>
      <Link
        to="/"
        className="mt-8 rounded-xl bg-primary px-6 py-3.5 font-bold text-white transition hover:bg-brand"
      >
        {ur ? 'گھر واپس' : 'Back home'}
      </Link>
    </div>
  );
}

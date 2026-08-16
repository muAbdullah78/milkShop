import { lazy, Suspense } from 'react';
import { BrowserRouter, Outlet, Route, Routes } from 'react-router-dom';

import { ScrollToTop, SiteLayout } from './components/Layout';
import { I18nProvider } from './i18n';
import About from './pages/About';
import Download from './pages/Download';
import FAQ from './pages/FAQ';
import Features from './pages/Features';
import Home from './pages/Home';
import HowItWorks from './pages/HowItWorks';
import NotFound from './pages/NotFound';
import Pricing from './pages/Pricing';
import Privacy from './pages/Privacy';
import Support from './pages/Support';
import Terms from './pages/Terms';

/** Loaded only when someone actually opens /admin. */
const AdminArea = lazy(() => import('./admin/AdminArea'));

/**
 * The deletion-request form talks to Firestore, so it is split out too. Both
 * lazy routes share one Firebase chunk, and the marketing pages download none
 * of it.
 */
const DeleteAccount = lazy(() => import('./pages/DeleteAccount'));

/**
 * Public site chrome. A layout route, so the header, footer and the language
 * provider stay mounted while the page underneath changes.
 */
function SiteChrome() {
  return (
    <I18nProvider>
      <SiteLayout>
        <Outlet />
      </SiteLayout>
    </I18nProvider>
  );
}

function Loading() {
  return (
    <div className="grid min-h-screen place-items-center bg-page">
      <p className="text-sm text-ink-muted">Loading…</p>
    </div>
  );
}

/** Fallback for a lazy page that already sits inside the site header/footer. */
function PageLoading() {
  return <p className="py-32 text-center text-sm text-ink-muted">Loading…</p>;
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        {/* ── Admin console ───────────────────────────────────────────────── */}
        <Route
          path="/admin/*"
          element={
            <Suspense fallback={<Loading />}>
              <AdminArea />
            </Suspense>
          }
        />

        {/* ── Public website ──────────────────────────────────────────────── */}
        <Route element={<SiteChrome />}>
          <Route index element={<Home />} />
          <Route path="features" element={<Features />} />
          <Route path="how-it-works" element={<HowItWorks />} />
          <Route path="pricing" element={<Pricing />} />
          <Route path="download" element={<Download />} />
          <Route path="faq" element={<FAQ />} />
          <Route path="support" element={<Support />} />
          <Route path="about" element={<About />} />
          <Route path="privacy" element={<Privacy />} />
          <Route path="terms" element={<Terms />} />
          <Route
            path="delete-account"
            element={
              <Suspense fallback={<PageLoading />}>
                <DeleteAccount />
              </Suspense>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

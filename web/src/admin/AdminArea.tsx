import { Route, Routes } from 'react-router-dom';

import AdminShell from './AdminShell';
import Audit from './Audit';
import Dashboard from './Dashboard';
import Discounts from './Discounts';
import People from './People';
import Platform from './Platform';
import Requests from './Requests';
import Subscriptions from './Subscriptions';
import { ShopDetail, ShopsList } from './Shops';
import { AdminProvider } from './useAdmin';

/**
 * Everything behind /admin, in one lazily-loaded chunk.
 *
 * Keeping it out of the main bundle matters: this pulls in Firebase Auth,
 * Firestore and the chart library, and the people the marketing site is for
 * are on cheap phones and slow connections.
 *
 * Paths here are relative to /admin because the parent route is a splat.
 */
export default function AdminArea() {
  return (
    <AdminProvider>
      <Routes>
        <Route element={<AdminShell />}>
          <Route index element={<Dashboard />} />
          <Route path="shops" element={<ShopsList />} />
          <Route path="shops/:shopId" element={<ShopDetail />} />
          <Route path="subscriptions" element={<Subscriptions />} />
          <Route path="discounts" element={<Discounts />} />
          <Route path="platform" element={<Platform />} />
          <Route path="requests" element={<Requests />} />
          <Route path="people" element={<People />} />
          <Route path="audit" element={<Audit />} />
          <Route path="*" element={<Dashboard />} />
        </Route>
      </Routes>
    </AdminProvider>
  );
}

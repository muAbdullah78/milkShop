import { useEffect, useRef } from 'react';

import { useShopId } from '@/data/ShopProvider';
import type { Customer } from '@/types/models';
import { postDueMonthlyCharges } from './monthlyCharges';

/**
 * Posts any overdue fixed-monthly charges once per app run.
 *
 * Mounted on the dashboard and the khaata screen so it fires whichever the
 * shopkeeper opens first. `postDueMonthlyCharges` is idempotent, so running it
 * twice costs a couple of cached reads and changes nothing.
 */
export function useMonthlyCatchUp(customers: Customer[], onPosted?: (count: number) => void) {
  const shopId = useShopId();
  const done = useRef(false);

  useEffect(() => {
    if (done.current || !shopId || customers.length === 0) return;
    done.current = true;
    postDueMonthlyCharges(shopId, customers)
      .then((count) => {
        if (count > 0) onPosted?.(count);
      })
      .catch(() => {
        // Offline or a transient failure — it will run again next launch.
        done.current = false;
      });
  }, [shopId, customers, onPosted]);
}

import { useAuth } from '@clerk/expo';
import { api } from '@bankstats/convex/convex/_generated/api';
import { useAction, useConvexAuth } from 'convex/react';
import { useEffect } from 'react';

import { identifyStoreCustomer, sellsInApp } from './store-purchases';

export function StoreCustomerSync() {
  const { userId } = useAuth();
  const { isAuthenticated } = useConvexAuth();
  const refresh = useAction(api.storeSubscriptions.refresh);

  useEffect(() => {
    if (!sellsInApp() || !isAuthenticated || userId === null || userId === undefined) {
      return;
    }

    void identifyStoreCustomer(userId)
      .then(() => refresh({}))
      .catch(() => undefined);
  }, [isAuthenticated, refresh, userId]);

  return null;
}

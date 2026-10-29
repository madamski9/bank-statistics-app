import { useAuth } from '@clerk/expo';
import { api } from '@bankstats/convex/convex/_generated/api';
import { useAction } from 'convex/react';
import { useCallback, useEffect, useState } from 'react';

import {
  hasPremiumEntitlement,
  identifyStoreCustomer,
  isPurchaseCancelled,
  loadPremiumPlans,
  purchasePremiumPlan,
  restoreStorePurchases,
  sellsInApp,
  type PremiumPlan,
} from './store-purchases';
import type { StoreOfferingId } from './trial-offer';

export type PremiumOfferState =
  | { kind: 'unavailable' }
  | { kind: 'loading' }
  | { kind: 'failed' }
  | { kind: 'ready'; plans: PremiumPlan[] };

export type PurchaseOutcome = 'purchased' | 'cancelled' | 'failed';

export type RestoreOutcome = 'restored' | 'nothingToRestore' | 'failed';

export interface PremiumOffer {
  state: PremiumOfferState;
  reload: () => void;
  purchase: (plan: PremiumPlan) => Promise<PurchaseOutcome>;
  restore: () => Promise<RestoreOutcome>;
}

export function usePremiumOffer(offeringId: StoreOfferingId): PremiumOffer {
  const { userId } = useAuth();
  const refresh = useAction(api.storeSubscriptions.refresh);
  const [state, setState] = useState<PremiumOfferState>(sellsInApp() ? { kind: 'loading' } : { kind: 'unavailable' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!sellsInApp() || userId === null || userId === undefined) {
      return;
    }

    let isCurrent = true;

    void identifyStoreCustomer(userId)
      .then(() => loadPremiumPlans(offeringId))
      .then((plans) => {
        if (isCurrent) {
          setState(plans.length === 0 ? { kind: 'failed' } : { kind: 'ready', plans });
        }
      })
      .catch(() => {
        if (isCurrent) {
          setState({ kind: 'failed' });
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [attempt, offeringId, userId]);

  const reload = useCallback(() => {
    setState({ kind: 'loading' });
    setAttempt((current) => current + 1);
  }, []);

  const syncEntitlement = useCallback(() => refresh({}).catch(() => undefined), [refresh]);

  const purchase = useCallback(
    async (plan: PremiumPlan): Promise<PurchaseOutcome> => {
      try {
        const customerInfo = await purchasePremiumPlan(plan);
        await syncEntitlement();

        return hasPremiumEntitlement(customerInfo) ? 'purchased' : 'failed';
      } catch (error) {
        return isPurchaseCancelled(error) ? 'cancelled' : 'failed';
      }
    },
    [syncEntitlement],
  );

  const restore = useCallback(async (): Promise<RestoreOutcome> => {
    try {
      const customerInfo = await restoreStorePurchases();
      await syncEntitlement();

      return hasPremiumEntitlement(customerInfo) ? 'restored' : 'nothingToRestore';
    } catch {
      return 'failed';
    }
  }, [syncEntitlement]);

  return { state, reload, purchase, restore };
}

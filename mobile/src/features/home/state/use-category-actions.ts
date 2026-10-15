import { useCallback } from 'react';

import type { AssignedMerchant, CategorizationRules } from '@/features/data/classification/rules/use-categorization-rules';
import type { PremiumReason } from '@/features/settings/premium/premium-access';

export function useCategoryActions(
  categorization: CategorizationRules,
  isPremium: boolean,
  openPremium: (reason: PremiumReason) => void,
) {
  const { assignMerchants, remember } = categorization;
  const requireCategoryPremium = useCallback(() => openPremium('category'), [openPremium]);

  const assignCategoryMerchants = useCallback(
    async (merchants: AssignedMerchant[], category: string) => {
      if (!isPremium) {
        requireCategoryPremium();
        return false;
      }

      await assignMerchants(merchants, category);
      return true;
    },
    [assignMerchants, isPremium, requireCategoryPremium],
  );

  const rememberCategoryRule = useCallback(
    async (merchantLabel: string, category: string) => {
      if (!isPremium) {
        requireCategoryPremium();
        return;
      }

      await remember(merchantLabel, category);
    },
    [isPremium, remember, requireCategoryPremium],
  );

  return { requireCategoryPremium, assignCategoryMerchants, rememberCategoryRule };
}

export type CategoryActions = ReturnType<typeof useCategoryActions>;

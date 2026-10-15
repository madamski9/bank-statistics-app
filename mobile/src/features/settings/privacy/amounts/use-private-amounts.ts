import { useMemo } from 'react';

import {
  formatAmount,
  formatCompactAmount,
  formatSignedAmount,
  formatSignedCompactAmount,
} from '@/features/app-shell/formatting/formatting';

import { maskAmountLabel } from './amount-masking';
import { usePrivacy } from '../privacy-provider';

export interface AmountFormatting {
  isHidden: boolean;
  formatAmount: typeof formatAmount;
  formatSignedAmount: typeof formatSignedAmount;
  formatCompactAmount: typeof formatCompactAmount;
  formatSignedCompactAmount: typeof formatSignedCompactAmount;
}

function hidden<Format extends (minor: number, currency: string) => string>(format: Format) {
  return (minor: number, currency: string) => maskAmountLabel(format(minor, currency));
}

const visibleFormatting: AmountFormatting = {
  isHidden: false,
  formatAmount,
  formatSignedAmount,
  formatCompactAmount,
  formatSignedCompactAmount,
};

const hiddenFormatting: AmountFormatting = {
  isHidden: true,
  formatAmount: hidden(formatAmount),
  formatSignedAmount: hidden(formatSignedAmount),
  formatCompactAmount: hidden(formatCompactAmount),
  formatSignedCompactAmount: hidden(formatSignedCompactAmount),
};

export function useAmountFormatting(): AmountFormatting {
  const { settings } = usePrivacy();
  const isHidden = settings.isPrivacyModeEnabled;

  return useMemo(() => (isHidden ? hiddenFormatting : visibleFormatting), [isHidden]);
}

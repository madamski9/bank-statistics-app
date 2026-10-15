import { currentCopy, defineCopy, getCurrentLanguage, type Language } from '@/features/app-shell/localization/language';
import { englishPlural, polishPlural } from '@/features/app-shell/localization/plural';

const nonBreakingSpace = ' ';
const minusSign = '−';

const numberStyles: Record<Language, { decimal: string; group: string; millions: string }> = {
  pl: { decimal: ',', group: nonBreakingSpace, millions: 'mln' },
  en: { decimal: '.', group: ',', millions: 'M' },
};

const countCopy = defineCopy({
  pl: {
    transactions: (count: number) =>
      `${count} ${polishPlural(count, 'transakcja', 'transakcje', 'transakcji')}`,
  },
  en: {
    transactions: (count: number) => `${count} ${englishPlural(count, 'transaction', 'transactions')}`,
  },
});

function currencySuffix(currency: string): string {
  return currency === 'PLN' ? 'zł' : currency;
}

function groupDigits(units: number): string {
  return String(units).replace(/\B(?=(\d{3})+(?!\d))/g, numberStyles[getCurrentLanguage()].group);
}

export function formatAmount(minor: number, currency: string): string {
  const units = Math.trunc(Math.abs(minor) / 100);
  const fraction = Math.abs(minor % 100);
  const { decimal } = numberStyles[getCurrentLanguage()];

  return `${groupDigits(units)}${decimal}${String(fraction).padStart(2, '0')}${nonBreakingSpace}${currencySuffix(currency)}`;
}

export function formatSignedAmount(minor: number, currency: string): string {
  return `${minor < 0 ? minusSign : '+'}${formatAmount(minor, currency)}`;
}

export function formatCompactAmount(minor: number, currency: string): string {
  const units = Math.round(Math.abs(minor) / 100);
  const { decimal, millions } = numberStyles[getCurrentLanguage()];

  if (units >= 1_000_000) {
    const scaled = (units / 1_000_000).toFixed(1).replace('.', decimal);

    return `${scaled}${nonBreakingSpace}${millions}${nonBreakingSpace}${currencySuffix(currency)}`;
  }

  return `${groupDigits(units)}${nonBreakingSpace}${currencySuffix(currency)}`;
}

export function formatSignedCompactAmount(minor: number, currency: string): string {
  return `${minor < 0 ? minusSign : '+'}${formatCompactAmount(minor, currency)}`;
}

export function formatChange(change: number): string {
  const { decimal } = numberStyles[getCurrentLanguage()];

  return `${Math.abs(change * 100).toFixed(1).replace('.', decimal)}${nonBreakingSpace}%`;
}

export function formatShare(share: number): string {
  return `${Math.round(share * 100)}%`;
}

export function formatTransactionCount(count: number): string {
  return currentCopy(countCopy).transactions(count);
}

const nonBreakingSpace = ' ';
const minusSign = '−';

export function formatAmount(minor: number, currency: string): string {
  const units = Math.trunc(Math.abs(minor) / 100);
  const fraction = Math.abs(minor % 100);
  const groupedUnits = String(units).replace(/\B(?=(\d{3})+(?!\d))/g, nonBreakingSpace);
  const suffix = currency === 'PLN' ? 'zł' : currency;

  return `${groupedUnits},${String(fraction).padStart(2, '0')}${nonBreakingSpace}${suffix}`;
}

export function formatSignedAmount(minor: number, currency: string): string {
  return `${minor < 0 ? minusSign : '+'}${formatAmount(minor, currency)}`;
}

/** Whole units only, so the amount still fits inside the smaller bubbles. */
export function formatCompactAmount(minor: number, currency: string): string {
  const suffix = currency === 'PLN' ? 'zł' : currency;
  const units = Math.round(Math.abs(minor) / 100);

  if (units >= 1_000_000) {
    const millions = (units / 1_000_000).toFixed(1).replace('.', ',');

    return `${millions}${nonBreakingSpace}mln${nonBreakingSpace}${suffix}`;
  }

  const groupedUnits = String(units).replace(/\B(?=(\d{3})+(?!\d))/g, nonBreakingSpace);

  return `${groupedUnits}${nonBreakingSpace}${suffix}`;
}

export function formatSignedCompactAmount(minor: number, currency: string): string {
  return `${minor < 0 ? minusSign : '+'}${formatCompactAmount(minor, currency)}`;
}

/** Magnitude only - the direction is carried by the caret and its colour. */
export function formatChange(change: number): string {
  return `${Math.abs(change * 100).toFixed(1).replace('.', ',')}${nonBreakingSpace}%`;
}

export function formatShare(share: number): string {
  return `${Math.round(share * 100)}%`;
}

export function formatTransactionCount(count: number): string {
  if (count === 1) {
    return '1 transakcja';
  }

  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;
  const takesPluralNominative =
    lastDigit >= 2 && lastDigit <= 4 && (lastTwoDigits < 12 || lastTwoDigits > 14);

  return `${count} ${takesPluralNominative ? 'transakcje' : 'transakcji'}`;
}

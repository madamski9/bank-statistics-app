import * as SecureStore from 'expo-secure-store';

import type { Cadence, TrackedPayment } from './recurring-payments';

const storageKey = 'bankstats.subscriptions.tracked.v1';
const cadences: readonly Cadence[] = ['weekly', 'monthly', 'quarterly', 'yearly'];

function isTrackedPayment(value: unknown): value is TrackedPayment {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.key === 'string' &&
    typeof candidate.name === 'string' &&
    cadences.includes(candidate.cadence as Cadence) &&
    (candidate.partyKey === undefined || typeof candidate.partyKey === 'string') &&
    (candidate.amountMinor === undefined || typeof candidate.amountMinor === 'number')
  );
}

export function parseTrackedSubscriptions(stored: string | null): TrackedPayment[] {
  try {
    const parsed: unknown = stored === null ? [] : JSON.parse(stored);

    return Array.isArray(parsed) ? parsed.filter(isTrackedPayment) : [];
  } catch {
    return [];
  }
}

export async function readTrackedSubscriptions(): Promise<TrackedPayment[]> {
  try {
    return parseTrackedSubscriptions(await SecureStore.getItemAsync(storageKey));
  } catch {
    return [];
  }
}

export async function writeTrackedSubscriptions(payments: TrackedPayment[]): Promise<void> {
  await SecureStore.setItemAsync(storageKey, JSON.stringify(payments));
}

export function clearTrackedSubscriptions(): Promise<void> {
  return SecureStore.deleteItemAsync(storageKey);
}

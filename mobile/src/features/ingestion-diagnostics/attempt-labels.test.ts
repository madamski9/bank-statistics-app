import type { StorageDiagnostics } from '@bankstats/ingestion-native';
import { describe, expect, test } from 'bun:test';

import { failureLabel, lastAttemptLabel } from './attempt-labels';

function storage(overrides: Partial<StorageDiagnostics>): StorageDiagnostics {
  return { cipherVersion: '4.10.0', databasePath: '/outbox.sqlite', ...overrides };
}

describe('lastAttemptLabel', () => {
  test('tells a skipped advertisement apart from a card push waiting for Apple Pay', () => {
    expect(
      lastAttemptLabel(storage({ lastAttemptOutcome: 'ignored', lastAttemptFailureReason: 'notTransaction' })),
    ).toBe('pominięto, to nie była transakcja');
    expect(
      lastAttemptLabel(
        storage({ lastAttemptOutcome: 'ignored', lastAttemptFailureReason: 'cardPaymentAwaitingApplePay' }),
      ),
    ).toBe('pominięto, czeka na powiadomienie Apple Pay');
  });

  test('explains a failure in Polish and keeps an unknown code readable', () => {
    expect(
      lastAttemptLabel(storage({ lastAttemptOutcome: 'failure', lastAttemptFailureReason: 'database' })),
    ).toBe('błąd: błąd zapisu do bazy');
    expect(failureLabel('somethingNew')).toBe('błąd: somethingNew');
    expect(lastAttemptLabel(storage({ lastAttemptOutcome: 'success' }))).toBe('zapisano');
  });
});

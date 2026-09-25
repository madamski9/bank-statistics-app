import type { StorageDiagnostics } from '@bankstats/ingestion-native';

const ignoredLabels: Record<string, string> = {
  cardPaymentAwaitingApplePay: 'pominięto, czeka na powiadomienie Apple Pay',
  notTransaction: 'pominięto, to nie była transakcja',
};

const failureLabels: Record<string, string> = {
  unsupportedNotification: 'nieznany format powiadomienia',
  keychain: 'brak dostępu do klucza szyfrowania',
  database: 'błąd zapisu do bazy',
  missingAppGroupConfiguration: 'brak konfiguracji App Group',
  unavailableAppGroupContainer: 'App Group niedostępna',
};

export function lastAttemptLabel(storage: StorageDiagnostics | null | undefined): string {
  const reason = storage?.lastAttemptFailureReason;

  if (storage?.lastAttemptOutcome === 'success') {
    return 'zapisano';
  }

  if (storage?.lastAttemptOutcome === 'ignored') {
    return (reason === undefined ? undefined : ignoredLabels[reason]) ?? `pominięto (${reason ?? 'nieznany powód'})`;
  }

  return failureLabel(reason);
}

export function failureLabel(reason: string | undefined): string {
  return `błąd: ${(reason === undefined ? undefined : failureLabels[reason]) ?? reason ?? 'nieznany'}`;
}

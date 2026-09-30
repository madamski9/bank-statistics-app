import type { IngestionRecord, StorageDiagnostics } from '@bankstats/ingestion-native';

export const capturedBanks = ['millennium', 'pko'] as const;

export type CapturedBank = (typeof capturedBanks)[number];

export type CaptureState = 'working' | 'attention' | 'unconfigured';

export type AttentionReason = 'neverRan' | 'recentFailure' | 'quiet';

export interface BankCaptureHealth {
  bank: CapturedBank;
  isEnabled: boolean;
  state: CaptureState;
  reason: AttentionReason | null;
  lastCaptureAt: string | null;
}

export interface AutomationActivity {
  lastRunAt: string | null;
  lastOutcome: NonNullable<StorageDiagnostics['lastAttemptOutcome']> | null;
  lastReason: string | null;
  lastFailureAt: string | null;
  lastFailureReason: string | null;
}

export interface CaptureHealth {
  banks: BankCaptureHealth[];
  automation: AutomationActivity;
  needsAttention: boolean;
}

const dayMs = 86_400_000;
const syntheticMerchant = 'SKLEP TEST';
export const quietAfterDays = 30;
const failureMemoryDays = 7;

function timestamp(value: string | null | undefined): number | null {
  if (value === undefined || value === null) {
    return null;
  }

  const parsed = new Date(value).getTime();

  return Number.isNaN(parsed) ? null : parsed;
}

function latestCapture(records: IngestionRecord[], bank: CapturedBank): string | null {
  let latest: IngestionRecord | null = null;

  for (const record of records) {
    if (record.bank !== bank || record.origin === 'manual' || record.merchant === syntheticMerchant) {
      continue;
    }

    if (latest === null || record.capturedAt > latest.capturedAt) {
      latest = record;
    }
  }

  return latest?.capturedAt ?? null;
}

export function captureHealth({
  records,
  diagnostics,
  enabledBanks,
  now,
}: {
  records: IngestionRecord[];
  diagnostics: StorageDiagnostics | null;
  enabledBanks: readonly string[];
  now: Date;
}): CaptureHealth {
  const automation: AutomationActivity = {
    lastRunAt: diagnostics?.lastAttemptAt ?? null,
    lastOutcome: diagnostics?.lastAttemptOutcome ?? null,
    lastReason: diagnostics?.lastAttemptFailureReason ?? null,
    lastFailureAt: diagnostics?.lastFailureAt ?? null,
    lastFailureReason: diagnostics?.lastFailureReason ?? null,
  };
  const lastFailureMs = timestamp(automation.lastFailureAt);
  const hasEverRun = automation.lastRunAt !== null;

  const banks = capturedBanks.map((bank): BankCaptureHealth => {
    const lastCaptureAt = latestCapture(records, bank);
    const lastCaptureMs = timestamp(lastCaptureAt);
    const isEnabled = enabledBanks.includes(bank);
    const base = { bank, isEnabled, lastCaptureAt };

    if (!isEnabled && lastCaptureMs === null) {
      return { ...base, state: 'unconfigured', reason: null };
    }

    if (
      lastFailureMs !== null &&
      now.getTime() - lastFailureMs <= failureMemoryDays * dayMs &&
      (lastCaptureMs === null || lastFailureMs > lastCaptureMs)
    ) {
      return { ...base, state: 'attention', reason: 'recentFailure' };
    }

    if (lastCaptureMs === null) {
      return hasEverRun
        ? { ...base, state: 'working', reason: null }
        : { ...base, state: 'attention', reason: 'neverRan' };
    }

    if (now.getTime() - lastCaptureMs > quietAfterDays * dayMs) {
      return { ...base, state: 'attention', reason: 'quiet' };
    }

    return { ...base, state: 'working', reason: null };
  });

  return { banks, automation, needsAttention: banks.some((bank) => bank.state === 'attention') };
}

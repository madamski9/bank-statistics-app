import type { IngestionRecord, StorageDiagnostics } from '@bankstats/ingestion-native';

export const capturedBanks = ['millennium', 'pko'] as const;

export type CapturedBank = (typeof capturedBanks)[number];

export type CaptureState = 'working' | 'attention' | 'unverified' | 'unconfigured';

export type AttentionReason = 'neverRan' | 'recentFailure' | 'staleEvidence';

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
const evidenceFreshnessDays = 30;
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
  const lastAttemptMs = timestamp(automation.lastRunAt);
  const selectedBanks = capturedBanks.filter((bank) => enabledBanks.includes(bank));

  const banks = capturedBanks.map((bank): BankCaptureHealth => {
    const lastCaptureAt = latestCapture(records, bank);
    const lastCaptureMs = timestamp(lastCaptureAt);
    const isEnabled = enabledBanks.includes(bank);
    const base = { bank, isEnabled, lastCaptureAt };
    const canAttributeAttempt = selectedBanks.length === 1 && selectedBanks[0] === bank;
    const hasRecentAttempt =
      canAttributeAttempt &&
      lastAttemptMs !== null &&
      now.getTime() - lastAttemptMs <= evidenceFreshnessDays * dayMs;

    if (!isEnabled && lastCaptureMs === null) {
      return { ...base, state: 'unconfigured', reason: null };
    }

    if (
      hasRecentAttempt &&
      automation.lastOutcome === 'failure' &&
      lastAttemptMs !== null &&
      now.getTime() - lastAttemptMs <= failureMemoryDays * dayMs &&
      (lastCaptureMs === null || lastAttemptMs > lastCaptureMs)
    ) {
      return { ...base, state: 'attention', reason: 'recentFailure' };
    }

    if (
      (lastCaptureMs !== null && now.getTime() - lastCaptureMs <= evidenceFreshnessDays * dayMs) ||
      (hasRecentAttempt &&
        (automation.lastOutcome === 'success' || automation.lastOutcome === 'ignored'))
    ) {
      return { ...base, state: 'working', reason: null };
    }

    return {
      ...base,
      state: 'unverified',
      reason: lastCaptureMs === null ? 'neverRan' : 'staleEvidence',
    };
  });

  return { banks, automation, needsAttention: banks.some((bank) => bank.state === 'attention') };
}

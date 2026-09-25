export const pinLength = 4;

const pinPattern = /^[0-9]{4}$/;
const freeAttempts = 5;
const firstLockoutMs = 30_000;
const longestLockoutMs = 15 * 60_000;

export interface StoredPin {
  salt: string;
  digest: string;
}

export interface PinAttempts {
  failedCount: number;
  lockedUntilMs: number;
}

export const noPinAttempts: PinAttempts = { failedCount: 0, lockedUntilMs: 0 };

export type DigestFunction = (value: string) => Promise<string>;

export function isValidPin(pin: string): boolean {
  return pinPattern.test(pin);
}

export async function createStoredPin(
  pin: string,
  salt: string,
  digest: DigestFunction,
): Promise<StoredPin> {
  if (!isValidPin(pin)) {
    throw new Error('A PIN has exactly four digits.');
  }

  return { salt, digest: await digest(`${salt}:${pin}`) };
}

export async function matchesStoredPin(
  pin: string,
  stored: StoredPin,
  digest: DigestFunction,
): Promise<boolean> {
  if (!isValidPin(pin)) {
    return false;
  }

  const candidate = await digest(`${stored.salt}:${pin}`);

  return constantTimeEquals(candidate, stored.digest);
}

function constantTimeEquals(left: string, right: string): boolean {
  let difference = left.length ^ right.length;
  const length = Math.max(left.length, right.length);

  for (let index = 0; index < length; index += 1) {
    difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }

  return difference === 0;
}

export function lockoutDurationMs(failedCount: number): number {
  if (failedCount < freeAttempts) {
    return 0;
  }

  return Math.min(firstLockoutMs * 2 ** (failedCount - freeAttempts), longestLockoutMs);
}

export function afterFailedAttempt(attempts: PinAttempts, nowMs: number): PinAttempts {
  const failedCount = attempts.failedCount + 1;
  const lockout = lockoutDurationMs(failedCount);

  return { failedCount, lockedUntilMs: lockout > 0 ? nowMs + lockout : 0 };
}

export function remainingLockoutMs(attempts: PinAttempts, nowMs: number): number {
  return Math.max(attempts.lockedUntilMs - nowMs, 0);
}

export function parseStoredPin(stored: string | null): StoredPin | null {
  if (stored === null) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(stored);

    if (typeof parsed !== 'object' || parsed === null) {
      return null;
    }

    const candidate = parsed as Partial<Record<keyof StoredPin, unknown>>;

    return typeof candidate.salt === 'string' &&
      typeof candidate.digest === 'string' &&
      candidate.salt !== '' &&
      candidate.digest !== ''
      ? { salt: candidate.salt, digest: candidate.digest }
      : null;
  } catch {
    return null;
  }
}

export function parsePinAttempts(stored: string | null): PinAttempts {
  if (stored === null) {
    return noPinAttempts;
  }

  try {
    const parsed: unknown = JSON.parse(stored);

    if (typeof parsed !== 'object' || parsed === null) {
      return noPinAttempts;
    }

    const candidate = parsed as Partial<Record<keyof PinAttempts, unknown>>;

    return Number.isSafeInteger(candidate.failedCount) &&
      typeof candidate.lockedUntilMs === 'number' &&
      Number.isFinite(candidate.lockedUntilMs)
      ? { failedCount: candidate.failedCount as number, lockedUntilMs: candidate.lockedUntilMs }
      : noPinAttempts;
  } catch {
    return noPinAttempts;
  }
}

export function lockoutLabel(remainingMs: number): string {
  const seconds = Math.ceil(remainingMs / 1000);

  if (seconds < 60) {
    return `${seconds} s`;
  }

  return `${Math.ceil(seconds / 60)} min`;
}

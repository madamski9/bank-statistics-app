export const lockTimeouts = ['immediate', 'oneMinute', 'fiveMinutes'] as const;

export type LockTimeout = (typeof lockTimeouts)[number];

export interface PrivacySettings {
  isLockEnabled: boolean;
  lockTimeout: LockTimeout;
  isPrivacyModeEnabled: boolean;
  isWidgetBlurred: boolean;
}

export const defaultPrivacySettings: PrivacySettings = {
  isLockEnabled: false,
  lockTimeout: 'immediate',
  isPrivacyModeEnabled: false,
  isWidgetBlurred: false,
};

const lockTimeoutMs: Record<LockTimeout, number> = {
  immediate: 0,
  oneMinute: 60_000,
  fiveMinutes: 300_000,
};

export const lockTimeoutLabels: Record<LockTimeout, string> = {
  immediate: 'Od razu',
  oneMinute: 'Po 1 minucie',
  fiveMinutes: 'Po 5 minutach',
};

function isLockTimeout(value: unknown): value is LockTimeout {
  return lockTimeouts.some((timeout) => timeout === value);
}

export function parsePrivacySettings(stored: string | null): PrivacySettings {
  if (stored === null) {
    return defaultPrivacySettings;
  }

  try {
    const parsed: unknown = JSON.parse(stored);

    if (typeof parsed !== 'object' || parsed === null) {
      return defaultPrivacySettings;
    }

    const candidate = parsed as Partial<Record<keyof PrivacySettings, unknown>>;

    return {
      isLockEnabled:
        typeof candidate.isLockEnabled === 'boolean'
          ? candidate.isLockEnabled
          : defaultPrivacySettings.isLockEnabled,
      lockTimeout: isLockTimeout(candidate.lockTimeout)
        ? candidate.lockTimeout
        : defaultPrivacySettings.lockTimeout,
      isPrivacyModeEnabled:
        typeof candidate.isPrivacyModeEnabled === 'boolean'
          ? candidate.isPrivacyModeEnabled
          : defaultPrivacySettings.isPrivacyModeEnabled,
      isWidgetBlurred:
        typeof candidate.isWidgetBlurred === 'boolean'
          ? candidate.isWidgetBlurred
          : defaultPrivacySettings.isWidgetBlurred,
    };
  } catch {
    return defaultPrivacySettings;
  }
}

export function shouldLockOnReturn(
  settings: PrivacySettings,
  backgroundedAtMs: number | null,
  nowMs: number,
): boolean {
  if (!settings.isLockEnabled || backgroundedAtMs === null) {
    return false;
  }

  return nowMs - backgroundedAtMs >= lockTimeoutMs[settings.lockTimeout];
}

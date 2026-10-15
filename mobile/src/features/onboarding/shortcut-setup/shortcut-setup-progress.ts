import { shortcutUrlFor } from './shortcut-links';

export function shortcutSetupProgressKey(userId: string): string {
  return `bankstats.onboarding.shortcuts-return.v1.${userId}`;
}

export function pendingShortcutBanks(stored: string | null, savedBanks: string[]): string[] | null {
  if (stored === 'true') {
    return savedBanks.length > 0 ? savedBanks : ['millennium'];
  }

  if (stored === null) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(stored);

    if (
      Array.isArray(parsed)
      && parsed.every((bank): bank is string => typeof bank === 'string')
      && shortcutUrlFor(parsed) !== null
    ) {
      return parsed;
    }
  } catch {
    return null;
  }

  return null;
}

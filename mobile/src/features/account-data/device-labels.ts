import { currentCopy } from '@/features/localization/language';

import { accountDataCopy } from './account-data-copy';

export type DevicePlatform = 'ios' | 'android' | 'web';

export function devicePlatformName(platform: DevicePlatform): string {
  return currentCopy(accountDataCopy).platforms[platform];
}

export function lastSeenLabel(lastSeenAt: number, now: number): string {
  const copy = currentCopy(accountDataCopy);
  const minutes = Math.floor((now - lastSeenAt) / 60_000);

  if (minutes < 5) {
    return copy.activeNow;
  }

  if (minutes < 60) {
    return copy.activeMinutesAgo(minutes);
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return copy.activeHoursAgo(hours);
  }

  const days = Math.floor(hours / 24);

  return days === 1 ? copy.activeYesterday : copy.activeDaysAgo(days);
}

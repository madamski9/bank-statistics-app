import { monthKey, shiftMonth } from './monthly-summary';

export function monthForReminder(notificationTimestamp: number): string | null {
  if (!Number.isFinite(notificationTimestamp) || notificationTimestamp <= 0) {
    return null;
  }

  const deliveredMs = notificationTimestamp < 10_000_000_000
    ? notificationTimestamp * 1000
    : notificationTimestamp;
  const delivered = new Date(deliveredMs + 86_400_000);

  if (Number.isNaN(delivered.getTime())) {
    return null;
  }

  return monthKey(shiftMonth({ year: delivered.getUTCFullYear(), month: delivered.getUTCMonth() }, -1));
}

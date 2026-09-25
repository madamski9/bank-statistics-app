import { calendarCopy } from '@/features/localization/calendar-copy';
import { currentCopy } from '@/features/localization/language';

/** Stable per-day grouping key in local time. */
export function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function formatDayHeading(date: Date, reference: Date): string {
  const today = dayKey(reference);
  const yesterday = new Date(reference);

  yesterday.setDate(yesterday.getDate() - 1);

  if (dayKey(date) === today) {
    return currentCopy(calendarCopy).today;
  }

  if (dayKey(date) === dayKey(yesterday)) {
    return currentCopy(calendarCopy).yesterday;
  }

  const calendar = currentCopy(calendarCopy);
  const day = calendar.dayMonth(date.getDate(), calendar.monthsInGenitive[date.getMonth()]);

  return date.getFullYear() === reference.getFullYear()
    ? day
    : `${day} ${date.getFullYear()}`;
}

export function formatTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

const monthsInGenitive = [
  'stycznia',
  'lutego',
  'marca',
  'kwietnia',
  'maja',
  'czerwca',
  'lipca',
  'sierpnia',
  'września',
  'października',
  'listopada',
  'grudnia',
];

/** Stable per-day grouping key in local time. */
export function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function formatDayHeading(date: Date, reference: Date): string {
  const today = dayKey(reference);
  const yesterday = new Date(reference);

  yesterday.setDate(yesterday.getDate() - 1);

  if (dayKey(date) === today) {
    return 'Dziś';
  }

  if (dayKey(date) === dayKey(yesterday)) {
    return 'Wczoraj';
  }

  const day = `${date.getDate()} ${monthsInGenitive[date.getMonth()]}`;

  return date.getFullYear() === reference.getFullYear()
    ? day
    : `${day} ${date.getFullYear()}`;
}

export function formatTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

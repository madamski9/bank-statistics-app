import type { BubbleTint } from '@/features/spending-overview/overview-theme';

export const eventColorKeys = ['amber', 'coral', 'pink', 'violet', 'lemon', 'copper'] as const;

export type EventColorKey = (typeof eventColorKeys)[number];

export const defaultEventColor: EventColorKey = 'amber';

export const eventTints: Record<EventColorKey, BubbleTint> = {
  amber: { film: '#FFC46B', rgb: '255, 196, 107', rgbSecondary: '255, 122, 89' },
  coral: { film: '#FF7A59', rgb: '255, 122, 89', rgbSecondary: '255, 196, 107' },
  pink: { film: '#FF5CC8', rgb: '255, 92, 200', rgbSecondary: '143, 123, 255' },
  violet: { film: '#A78BFF', rgb: '167, 139, 255', rgbSecondary: '95, 200, 255' },
  lemon: { film: '#F2E35B', rgb: '242, 227, 91', rgbSecondary: '255, 160, 80' },
  copper: { film: '#D98C5F', rgb: '217, 140, 95', rgbSecondary: '255, 214, 160' },
};

export function isEventColorKey(value: string | undefined): value is EventColorKey {
  return eventColorKeys.some((key) => key === value);
}

export function eventColorKey(event: { color?: string }): EventColorKey {
  return isEventColorKey(event.color) ? event.color : defaultEventColor;
}

export function eventTint(event: { color?: string }): BubbleTint {
  return eventTints[eventColorKey(event)];
}

export function nextEventColor(previous: { color?: string; startedAt: string }[]): EventColorKey {
  const latest = [...previous].sort((left, right) => right.startedAt.localeCompare(left.startedAt))[0];

  if (latest === undefined || !isEventColorKey(latest.color)) {
    return defaultEventColor;
  }

  return eventColorKeys[(eventColorKeys.indexOf(latest.color) + 1) % eventColorKeys.length];
}

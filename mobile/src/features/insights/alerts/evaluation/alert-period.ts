export type AlertPeriod =
  | { kind: 'week' }
  | { kind: 'month' }
  | { kind: 'year' }
  | { kind: 'custom'; startMs: number; endMs: number };

export interface AlertWindow {
  key: string;
  startMs: number;
  endMs: number;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function startOfDay(reference: Date): Date {
  return new Date(reference.getFullYear(), reference.getMonth(), reference.getDate());
}

export function alertWindow(period: AlertPeriod, reference: Date): AlertWindow {
  if (period.kind === 'custom') {
    return {
      key: `custom:${period.startMs}-${period.endMs}`,
      startMs: period.startMs,
      endMs: period.endMs,
    };
  }

  if (period.kind === 'week') {
    const start = startOfDay(reference);

    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));

    const end = new Date(start);

    end.setDate(end.getDate() + 7);

    return {
      key: `week:${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`,
      startMs: start.getTime(),
      endMs: end.getTime(),
    };
  }

  if (period.kind === 'month') {
    const start = new Date(reference.getFullYear(), reference.getMonth(), 1);
    const end = new Date(reference.getFullYear(), reference.getMonth() + 1, 1);

    return {
      key: `month:${start.getFullYear()}-${pad(start.getMonth() + 1)}`,
      startMs: start.getTime(),
      endMs: end.getTime(),
    };
  }

  const start = new Date(reference.getFullYear(), 0, 1);
  const end = new Date(reference.getFullYear() + 1, 0, 1);

  return {
    key: `year:${start.getFullYear()}`,
    startMs: start.getTime(),
    endMs: end.getTime(),
  };
}

export function previousAlertWindow(period: AlertPeriod, reference: Date): AlertWindow {
  if (period.kind === 'custom') {
    return alertWindow(period, reference);
  }

  const current = alertWindow(period, reference);
  const start = new Date(current.startMs);

  if (period.kind === 'week') {
    start.setDate(start.getDate() - 7);
  } else if (period.kind === 'month') {
    start.setMonth(start.getMonth() - 1);
  } else {
    start.setFullYear(start.getFullYear() - 1);
  }

  return alertWindow(period, start);
}

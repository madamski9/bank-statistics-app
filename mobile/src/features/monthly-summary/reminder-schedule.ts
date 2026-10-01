const reminderHour = 9;

export function nextReminderDate(now: Date): Date {
  const today = new Date(now.getFullYear(), now.getMonth(), 1, reminderHour, 0, 0, 0);

  if (now.getDate() === 1 && now.getTime() < today.getTime()) {
    return today;
  }

  return new Date(now.getFullYear(), now.getMonth() + 1, 1, reminderHour, 0, 0, 0);
}

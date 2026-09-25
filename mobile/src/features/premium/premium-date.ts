import { formatDayMonth } from '@/features/merchants/merchant-summary';

export function formatPremiumSince(ms: number): string {
  return `${formatDayMonth(ms)} ${new Date(ms).getFullYear()}`;
}

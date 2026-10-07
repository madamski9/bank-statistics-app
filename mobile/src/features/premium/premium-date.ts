import { formatDayMonth } from '@/features/merchants/merchant-summary';

export function formatPremiumDate(ms: number): string {
  return `${formatDayMonth(ms)} ${new Date(ms).getFullYear()}`;
}

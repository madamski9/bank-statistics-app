import { formatDayMonth } from '@/features/home/merchants/merchant-detail/merchant-summary';

export function formatPremiumDate(ms: number): string {
  return `${formatDayMonth(ms)} ${new Date(ms).getFullYear()}`;
}

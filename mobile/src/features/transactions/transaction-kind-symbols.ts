import type { SpendingSourceKind } from '@/features/spending-overview/spending-summary';

export const transactionKindSymbols = {
  cardPayment: { ios: 'creditcard.fill', android: 'credit_card', web: 'credit_card' },
  blikPayment: { ios: 'iphone.gen3', android: 'smartphone', web: 'smartphone' },
  outgoingTransfer: { ios: 'arrow.up.forward', android: 'arrow_outward', web: 'arrow_outward' },
  incomingTransfer: {
    ios: 'arrow.down.backward',
    android: 'arrow_downward',
    web: 'arrow_downward',
  },
  atmWithdrawal: { ios: 'banknote.fill', android: 'payments', web: 'payments' },
  refund: { ios: 'arrow.uturn.backward', android: 'undo', web: 'undo' },
  fee: { ios: 'percent', android: 'percent', web: 'percent' },
  interest: { ios: 'chart.line.uptrend.xyaxis', android: 'trending_up', web: 'trending_up' },
  other: { ios: 'square.grid.2x2.fill', android: 'grid_view', web: 'grid_view' },
} as const satisfies Record<SpendingSourceKind, { ios: string; android: string; web: string }>;

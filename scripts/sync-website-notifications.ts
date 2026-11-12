import { budgetAlertCopy, foodBudgetAlertCopy } from '../mobile/src/features/insights/alerts/delivery/budget-alert-copy';
import { paymentAlertCopy } from '../mobile/src/features/insights/alerts/delivery/payment-alert-copy';

const tiers = ['half', 'most', 'last', 'over'] as const;
const facts = {
  shop: '{shop}',
  where: '{where}',
  period: '{period}',
  payment: '{payment}',
  spent: '{spent}',
  target: '{target}',
  remaining: '{remaining}',
  over: '{over}',
};

function snapshot(copy: typeof budgetAlertCopy.pl | typeof paymentAlertCopy.pl) {
  return Object.fromEntries(Object.entries(copy).map(([tone, messages]) => [
    tone,
    Object.fromEntries(tiers.map(tier => [tier, messages[tier].map(message => message(facts))])),
  ]));
}

const notificationCopy = {
  all: snapshot(budgetAlertCopy.pl),
  food: snapshot(foodBudgetAlertCopy.pl),
  shop: snapshot(paymentAlertCopy.pl),
};

await Bun.write(
  new URL('../website/landing/notification-copy.js', import.meta.url),
  `export const notificationCopy = ${JSON.stringify(notificationCopy, null, 2)};\n`,
);

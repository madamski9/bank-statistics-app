import { describe, expect, test } from 'bun:test';

import { budgetAlertCopy, foodBudgetAlertCopy } from './budget-alert-copy';
import { foodPaymentAlertCopy, paymentAlertCopy } from './payment-alert-copy';

const lockScreenTitleLimit = 30;
const amount = '1 234,56 zł';
const facts = {
  shop: 'Biedronka',
  where: 'na wszystkie wydatki',
  period: 'W tym miesiącu',
  payment: amount,
  spent: amount,
  target: amount,
  remaining: amount,
  over: amount,
};

type AlertText = (values: typeof facts) => { title: string };
type AlertCopy = Record<string, Record<string, Record<string, AlertText[]>>>;

function titlesOf(copy: AlertCopy): string[] {
  return Object.values(copy).flatMap((tones) =>
    Object.values(tones).flatMap((tiers) =>
      Object.values(tiers).flatMap((variants) => variants.map((text) => text(facts).title)),
    ),
  );
}

const titles = [paymentAlertCopy, foodPaymentAlertCopy, budgetAlertCopy, foodBudgetAlertCopy].flatMap(titlesOf);

describe('limit notification titles', () => {
  test('fit on one line of the lock screen', () => {
    const tooLong = titles.filter((title) => title.length > lockScreenTitleLimit);

    expect(tooLong).toEqual([]);
  });
});

import { expect, test } from 'bun:test';

import { formatPremiumDate } from './premium-date';

test('writes the premium start date out in Polish with the year', () => {
  expect(formatPremiumDate(new Date(2026, 8, 25, 22, 55).getTime())).toBe('25 września 2026');
});

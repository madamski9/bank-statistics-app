import { describe, expect, test } from 'bun:test';

import { pendingShortcutBanks } from './shortcut-setup-progress';

describe('pending shortcut setup', () => {
  test('restores the banks whose shortcut was opened before the app restarted', () => {
    const banks = ['ing', 'pko'];

    expect(pendingShortcutBanks(JSON.stringify(banks), ['millennium'])).toEqual(banks);
  });

  test('resumes an older pending launch with saved banks or the original default', () => {
    expect(pendingShortcutBanks('true', ['ing'])).toEqual(['ing']);
    expect(pendingShortcutBanks('true', [])).toEqual(['millennium']);
  });

  test('does not resume setup after progress has been cleared', () => {
    expect(pendingShortcutBanks(null, ['pko'])).toBeNull();
  });

  test('ignores malformed progress and bank selections without a published shortcut', () => {
    for (const stored of ['broken', 'false', '{}', '[]', '[42]', '["revolut"]']) {
      expect(pendingShortcutBanks(stored, ['pko'])).toBeNull();
    }
  });
});

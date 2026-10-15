import { describe, expect, test } from 'bun:test';

import { shortcutUrlFor } from './shortcut-links';

describe('shortcutUrlFor', () => {
  test('opens the combined shortcut whatever order the banks were selected in', () => {
    expect(shortcutUrlFor(['pko', 'millennium'])).toBe(shortcutUrlFor(['millennium', 'pko']));
    expect(shortcutUrlFor(['millennium', 'pko'])).not.toBe(shortcutUrlFor(['pko']));
    expect(shortcutUrlFor(['ing', 'pko'])).toBe(shortcutUrlFor(['pko', 'ing']));
    expect(shortcutUrlFor(['ing', 'millennium'])).toBe(shortcutUrlFor(['millennium', 'ing']));
  });

  test('opens a shortcut for ING alone and paired with another bank', () => {
    expect(shortcutUrlFor(['ing'])).not.toBeNull();
    expect(shortcutUrlFor(['pko', 'ing'])).not.toBeNull();
    expect(shortcutUrlFor(['millennium', 'ing'])).not.toBeNull();
    expect(shortcutUrlFor(['ing', 'pko', 'millennium'])).not.toBeNull();
  });

  test('has no shortcut for a selection that has not been published yet', () => {
    expect(shortcutUrlFor(['revolut'])).toBeNull();
    expect(shortcutUrlFor([])).toBeNull();
  });

  test.each([
    [['pko', 'mbank'], 'eb69dc71732444b39787c011afb6613c'],
    [['ing', 'mbank'], 'e6c859ae1ad948a7ac6d0bc59182d08e'],
    [['millennium', 'pko', 'mbank'], '0ce2aef5e1ef4129b70fd891c90cafee'],
    [['ing', 'pko', 'mbank'], '435b9d93616941f8bce2995bd1d69785'],
    [['ing', 'millennium', 'mbank'], '1733b1c9724c45898667e7d581f9f419'],
    [['ing', 'pko', 'mbank', 'millennium'], 'ac848cfcdff9495cacd509cc747954fe'],
    [['ing', 'pko', 'millennium'], '3a3ef3e991e2436fadc30adef065f75e'],
    [['mbank'], '71c04a24f39b49189a74c93afd7ef428'],
    [['millennium', 'mbank'], 'fc812d66fe134e94bf0024ffda882641'],
  ] satisfies [string[], string][])('opens the published shortcut for %j in any selection order', (banks, identifier) => {
    const expected = `https://www.icloud.com/shortcuts/${identifier}`;

    expect(shortcutUrlFor(banks)).toBe(expected);
    expect(shortcutUrlFor([...banks].reverse())).toBe(expected);
  });
});

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
    [['pko', 'mbank'], 'a1a0fbe99ccb4be2bd9a2260560f0a0f'],
    [['ing', 'mbank'], '1b207fe5db114930819eb25568de16ad'],
    [['millennium', 'pko', 'mbank'], '03df27ce98ca4bec91ff443a70c65a00'],
    [['ing', 'pko', 'mbank'], 'd91a07d24ac847918da222f10f0c87e3'],
    [['ing', 'millennium', 'mbank'], 'c5570d68a62e4e21b63bd5160a8551eb'],
    [['ing', 'pko', 'mbank', 'millennium'], '3630b8160ef5414ead8cd73409084683'],
    [['ing', 'pko', 'millennium'], '773e06a3ce0f4030ab224290847c435d'],
    [['mbank'], '989e494fd2ba4616bf0ec8882e4ae588'],
    [['millennium', 'mbank'], 'bdcb39305ccc42a1bd7a0c8ada00b692'],
  ] satisfies [string[], string][])('opens the published shortcut for %j in any selection order', (banks, identifier) => {
    const expected = `https://www.icloud.com/shortcuts/${identifier}`;

    expect(shortcutUrlFor(banks)).toBe(expected);
    expect(shortcutUrlFor([...banks].reverse())).toBe(expected);
  });
});

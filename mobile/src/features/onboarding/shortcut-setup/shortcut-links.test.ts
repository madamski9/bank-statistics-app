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

  test('does not silently omit mBank while its shortcuts are awaiting publication', () => {
    expect(shortcutUrlFor(['mbank'])).toBeNull();
    expect(shortcutUrlFor(['mbank', 'millennium'])).toBeNull();
    expect(shortcutUrlFor(['pko', 'ing', 'mbank'])).toBeNull();
    expect(shortcutUrlFor(['millennium', 'pko', 'ing', 'mbank'])).toBeNull();
  });
});

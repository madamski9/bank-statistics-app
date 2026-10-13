import { describe, expect, test } from 'bun:test';

import { shortcutUrlFor } from './shortcut-links';

describe('shortcutUrlFor', () => {
  test('opens the combined shortcut whatever order the banks were selected in', () => {
    expect(shortcutUrlFor(['pko', 'millennium'])).toBe(shortcutUrlFor(['millennium', 'pko']));
    expect(shortcutUrlFor(['millennium', 'pko'])).not.toBe(shortcutUrlFor(['pko']));
  });

  test('has no shortcut for a selection that has not been published yet', () => {
    expect(shortcutUrlFor(['revolut'])).toBeNull();
    expect(shortcutUrlFor([])).toBeNull();
  });
});

import { describe, expect, test } from 'bun:test';

import { isWidgetRevealUrl } from './widget-links';

describe('isWidgetRevealUrl', () => {
  test('recognises the link the blurred widget opens', () => {
    expect(isWidgetRevealUrl('bankstats://?widget=reveal')).toBe(true);
    expect(isWidgetRevealUrl('bankstats-dev:///?widget=reveal&x=1')).toBe(true);
    expect(isWidgetRevealUrl('exp+bankstats://expo-development-client/?a=b&widget=reveal')).toBe(true);
  });

  test('ignores every other link', () => {
    expect(isWidgetRevealUrl(null)).toBe(false);
    expect(isWidgetRevealUrl('bankstats://')).toBe(false);
    expect(isWidgetRevealUrl('bankstats://?widget=revealed')).toBe(false);
    expect(isWidgetRevealUrl('bankstats://?mywidget=reveal')).toBe(false);
  });
});

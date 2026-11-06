import { describe, expect, test } from 'bun:test';

import { signsInWithApple } from './apple-sign-in';

describe('signsInWithApple', () => {
  test('recognises an account linked to Sign in with Apple', () => {
    expect(signsInWithApple([{ provider: 'google' }, { provider: 'apple' }])).toBe(true);
    expect(signsInWithApple([{ provider: 'oauth_apple' }])).toBe(true);
  });

  test('ignores accounts without Apple', () => {
    expect(signsInWithApple([{ provider: 'google' }])).toBe(false);
    expect(signsInWithApple([])).toBe(false);
    expect(signsInWithApple(undefined)).toBe(false);
  });
});

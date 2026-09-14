import { describe, expect, it } from 'bun:test';

import { assertApplicationMatchesLane } from './application-identity';

describe('assertApplicationMatchesLane', () => {
  it('rejects a lane bundle running inside an application built for another lane', () => {
    expect(() =>
      assertApplicationMatchesLane('production', 'com.bankstats.app', 'com.bankstats.app.dev'),
    ).toThrow('production lane expects com.bankstats.app but is running in com.bankstats.app.dev');
  });

  it('accepts a lane bundle running inside its own application', () => {
    expect(() =>
      assertApplicationMatchesLane('development', 'com.bankstats.app.dev', 'com.bankstats.app.dev'),
    ).not.toThrow();
  });

  it('skips the check where no native application identifier exists', () => {
    expect(() =>
      assertApplicationMatchesLane('development', 'com.bankstats.app.dev', null),
    ).not.toThrow();
  });
});

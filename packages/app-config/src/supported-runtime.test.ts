import { describe, expect, it } from 'bun:test';

import { assertSupportedRuntime } from './supported-runtime';

describe('assertSupportedRuntime', () => {
  it('rejects Expo Go because ingestion needs native modules it cannot load', () => {
    expect(() => assertSupportedRuntime('storeClient')).toThrow('Expo Go is not a supported runtime');
  });

  it('accepts development and release builds of the application itself', () => {
    expect(() => assertSupportedRuntime('bare')).not.toThrow();
    expect(() => assertSupportedRuntime('standalone')).not.toThrow();
  });
});

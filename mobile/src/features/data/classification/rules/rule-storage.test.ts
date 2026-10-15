import { describe, expect, test } from 'bun:test';

import { privateRuleFor } from '../categorization-rule';
import { loadRules, saveRules, type RuleStorage } from './rule-storage';

function storage(initial: string | null = null): RuleStorage & { value: string | null } {
  return {
    value: initial,
    async read() {
      return this.value;
    },
    async write(next: string) {
      this.value = next;
    },
  };
}

describe('rule storage', () => {
  test('gives back the rules it was given', async () => {
    const store = storage();
    const rules = [privateRuleFor('Latto Gelato', 'eatingOut')];

    await saveRules(store, rules);

    expect(await loadRules(store)).toEqual(rules);
  });

  test('starts empty when nothing was ever saved', async () => {
    expect(await loadRules(storage())).toEqual([]);
  });

  test('survives a damaged or foreign payload instead of crashing the screen', async () => {
    expect(await loadRules(storage('not json'))).toEqual([]);
    expect(await loadRules(storage('{"rules":1}'))).toEqual([]);
    expect(await loadRules(storage('[{"merchantKey":"lidl"}]'))).toEqual([]);
  });

  test('survives storage that refuses to answer', async () => {
    const failing: RuleStorage = {
      read: () => Promise.reject(new Error('keychain locked')),
      write: () => Promise.resolve(),
    };

    expect(await loadRules(failing)).toEqual([]);
  });
});

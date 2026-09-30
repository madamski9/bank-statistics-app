import { describe, expect, test } from 'bun:test';

import examples from '../examples/bank-notification-examples.json';

import { BankNotificationInterpreter, minorUnits } from './bank-notification-interpreter';
import { bundledRules } from './index';
import type { RuleBundle } from './rule-bundle';

const interpreter = new BankNotificationInterpreter(bundledRules);
const capturedAt = new Date(examples.capturedAt);

function outcomeOf(input: (typeof examples.examples)[number]['input']) {
  const outcome = interpreter.normalize({ ...input, capturedAt });

  return outcome.kind === 'record'
    ? { outcome: 'record', record: outcome.record }
    : { outcome: 'ignored', reason: outcome.reason };
}

describe('bank notification rules', () => {
  for (const example of examples.examples) {
    test(example.name, () => {
      expect(outcomeOf(example.input)).toEqual(example.expected);
    });
  }

  test('every rule is exercised by at least one example', () => {
    const exercised = new Set(
      examples.examples.map((example) => interpreter.normalize({ ...example.input, capturedAt }).ruleId),
    );

    expect(bundledRules.rules.map((rule) => rule.id).filter((id) => !exercised.has(id))).toEqual([]);
  });

  test('refuses a bundle written for another schema version', () => {
    const future: RuleBundle = { ...bundledRules, schemaVersion: 2 };

    expect(() => new BankNotificationInterpreter(future)).toThrow();
  });

  test('refuses a rule that names an unknown fragment', () => {
    const broken: RuleBundle = {
      ...bundledRules,
      rules: [
        {
          id: 'broken',
          whitespace: 'single',
          match: { field: 'body', pattern: '{{missing}}' },
          ignore: 'notTransaction',
        },
      ],
    };

    expect(() => new BankNotificationInterpreter(broken)).toThrow();
  });
});

describe('minor units', () => {
  test('reads grouped thousands and either decimal separator', () => {
    expect(minorUnits('1 234,5')).toBe(123450);
    expect(minorUnits('19.99')).toBe(1999);
    expect(minorUnits('7')).toBe(700);
  });

  test('rejects text that is not an amount', () => {
    expect(minorUnits('')).toBeNull();
    expect(minorUnits('1.2.3')).toBeNull();
    expect(minorUnits('abc')).toBeNull();
  });
});

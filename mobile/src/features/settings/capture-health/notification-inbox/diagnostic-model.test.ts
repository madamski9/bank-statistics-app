import type { NotificationDiagnostic } from '@bankstats/ingestion-native';
import { diagnosticSamplePreview, diagnosticSampleProblem } from '@bankstats/parser-rules';
import { describe, expect, test } from 'bun:test';

import {
  diagnosticDetails,
  diagnosticJson,
  diagnosticReason,
  recoveryDraft,
  redactedSample,
} from './diagnostic-model';

const notification: NotificationDiagnostic = {
  id: 'raw-id',
  title: 'Przelew z konta',
  subtitle: '',
  body: '123,45 PLN do JAN KOWALSKI jan@example.com +48 501 234 567',
  capturedAt: '2026-10-20T12:00:00Z',
  sourceApp: 'pl.mbank',
  rulesVersion: 6,
  diagnosticJson: JSON.stringify({
    parser: {
      parserVersion: 6,
      reasonCode: 'notTransaction',
      attempts: [
        {
          ruleId: 'mbank.outgoingTransfer',
          reasonCode: 'invalidRecord',
          groups: { amount: '123,45', currency: 'PLN', party: 'JAN KOWALSKI' },
        },
      ],
    },
  }),
};

describe('notification diagnostics', () => {
  test('keeps the full original available only in the local technical preview', () => {
    expect(JSON.parse(diagnosticJson(notification)).notification.body).toBe(notification.body);
    expect(diagnosticDetails(notification).parser?.parserVersion).toBe(6);
    expect(diagnosticReason(notification)).toBe('invalidRecord');
  });

  test('distinguishes persistence errors from parser rejection', () => {
    const failed = {
      ...notification,
      diagnosticJson: JSON.stringify({ failureReason: 'database' }),
    };
    expect(diagnosticReason(failed)).toBe('database');
    expect(diagnosticReason({ ...notification, diagnosticJson: '{' })).toBe('notAttempted');
    expect(
      diagnosticReason({
        ...notification,
        diagnosticJson: '{"parser":{"parserVersion":6,"reasonCode":"notTransaction"}}',
      }),
    ).toBe('noMatchingRule');
  });

  test('tolerates legacy or malformed diagnostic snapshots', () => {
    for (const diagnosticJson of [
      'null',
      '[]',
      '{"parser":null}',
      '{"parser":{"parserVersion":6,"attempts":"bad"}}',
    ]) {
      expect(() => recoveryDraft({ ...notification, diagnosticJson })).not.toThrow();
      expect(() => redactedSample({ ...notification, diagnosticJson })).not.toThrow();
    }
  });

  test('prepares a manual draft from partial fields without inventing a completed transaction', () => {
    const draft = recoveryDraft(notification);
    expect(draft.amount).toBe('123,45');
    expect(draft.currency).toBe('PLN');
    expect(draft.name).toBe('JAN KOWALSKI');
    expect(draft.kind).toBe('other');
  });

  test('redacts recognized names, phone numbers, email and account numbers before review', () => {
    const sample = redactedSample({
      ...notification,
      subtitle: 'Lidl Gdańsk',
      body: notification.body + ' PL 12 1234 1234 1234 1234 1234 1234',
    });
    const serialized = JSON.stringify(sample);
    for (const secret of ['JAN KOWALSKI', 'jan@example.com', '501', '1234 1234', 'Lidl']) {
      expect(serialized).not.toContain(secret);
    }
    expect(diagnosticSampleProblem(sample)).toBeNull();
    expect(sample.subtitle).toBe('SKLEP TESTOWY');
  });

  test('the transmitted JSON is computed from the edited sample rather than the original', () => {
    const sample = { ...redactedSample(notification), body: '12,34 PLN do OSOBA TESTOWA' };
    const preview = diagnosticSamplePreview(sample);
    expect(preview.result.kind).toBe('record');
    if (preview.result.kind === 'record') {
      expect(preview.result.record.amountMinor).toBe(1234);
      expect(preview.result.record.merchant).toBe('OSOBA TESTOWA');
    }
    expect(JSON.stringify(preview)).not.toContain('JAN KOWALSKI');
    expect(JSON.stringify(preview)).not.toContain('12345');
  });
});

import {
  supportedSchemaVersion,
  type MappedValue,
  type NotificationField,
  type NotificationRule,
  type OccurrenceSource,
  type RuleBundle,
  type RulePattern,
  type WhitespaceMode,
} from './rule-bundle';

export interface BankNotification {
  title: string;
  subtitle: string;
  body: string;
  sourceApp: string;
  capturedAt: Date;
}

export interface NormalizedNotification {
  bank: string;
  direction: string;
  transactionType?: string;
  amountMinor: number;
  currency: string;
  merchant?: string;
  accountName?: string;
  occurredAt: string;
  capturedAt: string;
  sourceApp: string;
  status: string;
  review?: string;
}

export type NormalizationOutcome =
  | { kind: 'record'; ruleId: string; record: NormalizedNotification }
  | { kind: 'ignored'; ruleId: string | null; reason: string };

type PreparedFields = Record<NotificationField, string>;

const threeLetterCode = /^[A-Z]{3}$/u;
const formatTokens = /yyyy|MM|dd|HH|mm|ss/gu;
const tokenLengths: Record<string, number> = { yyyy: 4, MM: 2, dd: 2, HH: 2, mm: 2, ss: 2 };

function escapeLiteral(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\/]/gu, '\\$&');
}

export class BankNotificationInterpreter {
  private readonly expressions = new Map<string, RegExp>();

  constructor(private readonly bundle: RuleBundle) {
    if (bundle.schemaVersion !== supportedSchemaVersion) {
      throw new Error(`Unsupported rule schema version ${bundle.schemaVersion}`);
    }

    for (const rule of bundle.rules) {
      this.expression(rule.match);
    }

    this.expression(bundle.merchantLocationSuffix);
  }

  get version(): number {
    return this.bundle.version;
  }

  normalize(notification: BankNotification): NormalizationOutcome {
    for (const rule of this.bundle.rules) {
      const fields = this.prepare(notification, rule.whitespace);

      if (!this.meetsRequirements(rule, fields)) {
        continue;
      }

      const match = this.expression(rule.match).exec(fields[rule.match.field]);

      if (match === null) {
        continue;
      }

      if (rule.ignore !== undefined) {
        return { kind: 'ignored', ruleId: rule.id, reason: rule.ignore };
      }

      const record = this.record(rule, match.groups ?? {}, fields, notification);

      if (record !== null) {
        return { kind: 'record', ruleId: rule.id, record };
      }
    }

    return { kind: 'ignored', ruleId: null, reason: this.bundle.fallbackIgnoreReason };
  }

  private expression(pattern: RulePattern): RegExp {
    const key = `${pattern.caseInsensitive === true ? 'i' : ''}:${pattern.pattern}`;
    const cached = this.expressions.get(key);

    if (cached !== undefined) {
      return cached;
    }

    const expanded = pattern.pattern.replace(/\{\{(\w+)\}\}/gu, (placeholder, name: string) => {
      const fragment = this.bundle.fragments[name];

      if (fragment === undefined) {
        throw new Error(`Unknown rule fragment ${placeholder}`);
      }

      return fragment;
    });
    const compiled = new RegExp(expanded, pattern.caseInsensitive === true ? 'iu' : 'u');
    this.expressions.set(key, compiled);

    return compiled;
  }

  private prepare(notification: BankNotification, mode: WhitespaceMode): PreparedFields {
    return {
      title: collapseWhitespace(notification.title, mode),
      subtitle: collapseWhitespace(notification.subtitle, mode),
      body: collapseWhitespace(notification.body, mode),
    };
  }

  private meetsRequirements(rule: NotificationRule, fields: PreparedFields): boolean {
    const subtitle = rule.requires?.subtitle;

    if (subtitle === 'empty') {
      return fields.subtitle === '';
    }

    if (subtitle === 'present') {
      return fields.subtitle !== '';
    }

    return true;
  }

  private record(
    rule: NotificationRule,
    groups: Record<string, string | undefined>,
    fields: PreparedFields,
    notification: BankNotification,
  ): NormalizedNotification | null {
    const template = rule.record;

    if (template === undefined) {
      return null;
    }

    const amountMinor = minorUnits(groups[template.amountGroup] ?? '');

    if (amountMinor === null || amountMinor <= 0) {
      return null;
    }

    const capturedAt = isoTimestamp(notification.capturedAt);
    let occurredAt = capturedAt;

    if (template.occurredAt !== undefined) {
      const occurred = parseOccurrence(groups, template.occurredAt);

      if (occurred === null) {
        return null;
      }

      occurredAt = isoTimestamp(occurred);
    }

    const currencyValue = template.currencyGroups
      .map((name) => groups[name])
      .find((value): value is string => value !== undefined && value !== '');
    const currency = currencyValue === undefined ? null : this.currencyCode(currencyValue);
    const record: NormalizedNotification = {
      bank: this.mapped(template.bank, groups, fields),
      direction: this.mapped(template.direction, groups, fields),
      amountMinor,
      currency: currency ?? this.bundle.fallbackCurrency,
      occurredAt,
      capturedAt,
      sourceApp: template.sourceApp ?? notification.sourceApp,
      status: template.status,
    };

    if (template.transactionType !== undefined) {
      record.transactionType = this.mapped(template.transactionType, groups, fields);
    }

    if (template.merchant !== undefined) {
      const source = template.merchant;
      const raw = 'group' in source ? (groups[source.group] ?? '') : fields[source.field];
      const merchant = source.stripLocation === true ? this.merchantName(raw) : raw.trim();

      if (merchant !== '') {
        record.merchant = merchant;
      }
    }

    if (template.accountGroup !== undefined) {
      const account = (groups[template.accountGroup] ?? '').trim();

      if (account !== '') {
        record.accountName = account;
      }
    }

    if (currency === null) {
      record.review = 'currency';
    }

    return record;
  }

  private mapped(
    value: MappedValue,
    groups: Record<string, string | undefined>,
    fields: PreparedFields,
  ): string {
    if (typeof value === 'string') {
      return value;
    }

    if ('group' in value) {
      const key = (groups[value.group] ?? '').toLowerCase();

      return value.cases[key] ?? value.otherwise;
    }

    return this.expression(value).test(fields[value.field]) ? value.whenMatched : value.otherwise;
  }

  private currencyCode(symbol: string): string | null {
    const mapped = this.bundle.currencySymbols[symbol.toLowerCase()];

    if (mapped !== undefined) {
      return mapped;
    }

    const code = symbol.toUpperCase();

    return threeLetterCode.test(code) ? code : null;
  }

  private merchantName(value: string): string {
    const trimmed = value.trim();
    const suffix = this.expression(this.bundle.merchantLocationSuffix);
    const separator = trimmed.indexOf('  ');

    if (separator !== -1) {
      const name = trimmed.slice(0, separator).trim();

      if (name !== '' && suffix.test(trimmed.slice(separator))) {
        return name;
      }
    }

    const match = suffix.exec(trimmed);

    if (match === null || match.index === 0) {
      return trimmed;
    }

    return trimmed.slice(0, match.index).trim();
  }
}

export function collapseWhitespace(value: string, mode: WhitespaceMode): string {
  if (mode === 'single') {
    return value.replace(/\s+/gu, ' ').trim();
  }

  return value.replace(/[^\S ]+/gu, ' ').replace(/ {2,}/gu, '  ').trim();
}

export function minorUnits(value: string): number | null {
  const parts = value
    .replace(/\s/gu, '')
    .replace(/,/gu, '.')
    .split('.')
    .filter((part) => part !== '');

  const whole = parts[0];

  if (whole === undefined || parts.length > 2 || !/^\d+$/u.test(whole)) {
    return null;
  }

  const fraction = (parts[1] ?? '').slice(0, 2).padEnd(2, '0');

  if (!/^\d{2}$/u.test(fraction)) {
    return null;
  }

  return Number.parseInt(whole, 10) * 100 + Number.parseInt(fraction, 10);
}

export function isoTimestamp(moment: Date): string {
  return `${moment.toISOString().slice(0, 19)}Z`;
}

function timeZoneOffsetMs(epochMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(epochMs));
  const part = (type: string) => Number(parts.find((candidate) => candidate.type === type)?.value);
  const asUtc = Date.UTC(
    part('year'),
    part('month') - 1,
    part('day'),
    part('hour'),
    part('minute'),
    part('second'),
  );

  return asUtc - Math.floor(epochMs / 1000) * 1000;
}

interface LocalMoment {
  yyyy: number;
  MM: number;
  dd: number;
  HH: number;
  mm: number;
  ss: number;
}

function parseLocalMoment(value: string, format: string): LocalMoment | null {
  const order: string[] = [];
  let pattern = '';
  let cursor = 0;

  for (const token of format.matchAll(formatTokens)) {
    pattern += escapeLiteral(format.slice(cursor, token.index));
    pattern += `(\\d{${tokenLengths[token[0]]}})`;
    order.push(token[0]);
    cursor = token.index + token[0].length;
  }

  pattern += escapeLiteral(format.slice(cursor));
  const match = new RegExp(`^${pattern}$`, 'u').exec(value);

  if (match === null) {
    return null;
  }

  const moment: LocalMoment = { yyyy: 0, MM: 1, dd: 1, HH: 0, mm: 0, ss: 0 };

  order.forEach((token, index) => {
    moment[token as keyof LocalMoment] = Number.parseInt(match[index + 1] ?? '', 10);
  });

  return moment;
}

function zonedEpochMs(moment: LocalMoment, timeZone: string): number | null {
  const guess = Date.UTC(moment.yyyy, moment.MM - 1, moment.dd, moment.HH, moment.mm, moment.ss);
  const firstOffset = timeZoneOffsetMs(guess, timeZone);
  let epochMs = guess - firstOffset;
  const secondOffset = timeZoneOffsetMs(epochMs, timeZone);

  if (secondOffset !== firstOffset) {
    epochMs = guess - secondOffset;
  }

  const roundTrip = new Date(epochMs + timeZoneOffsetMs(epochMs, timeZone));
  const isExact =
    roundTrip.getUTCFullYear() === moment.yyyy &&
    roundTrip.getUTCMonth() === moment.MM - 1 &&
    roundTrip.getUTCDate() === moment.dd &&
    roundTrip.getUTCHours() === moment.HH &&
    roundTrip.getUTCMinutes() === moment.mm &&
    roundTrip.getUTCSeconds() === moment.ss;

  return isExact ? epochMs : null;
}

function parseOccurrence(
  groups: Record<string, string | undefined>,
  source: OccurrenceSource,
): Date | null {
  const value = groups[source.group];

  if (value === undefined) {
    return null;
  }

  for (const format of source.formats) {
    const moment = parseLocalMoment(value, format);
    const epochMs = moment === null ? null : zonedEpochMs(moment, source.timeZone);

    if (epochMs !== null) {
      return new Date(epochMs);
    }
  }

  return null;
}

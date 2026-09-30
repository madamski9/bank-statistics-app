export interface RulePattern {
  pattern: string;
  caseInsensitive?: boolean;
}

export type NotificationField = 'title' | 'subtitle' | 'body';

export type WhitespaceMode = 'single' | 'keepDoubleSpace';

export interface GroupMapping {
  group: string;
  cases: Record<string, string>;
  otherwise: string;
}

export interface FieldMatchMapping extends RulePattern {
  field: NotificationField;
  whenMatched: string;
  otherwise: string;
}

export type MappedValue = string | GroupMapping | FieldMatchMapping;

export type MerchantSource =
  | { group: string; stripLocation?: boolean }
  | { field: NotificationField; stripLocation?: boolean };

export interface OccurrenceSource {
  group: string;
  formats: string[];
  timeZone: string;
}

export interface RecordTemplate {
  bank: MappedValue;
  sourceApp?: string;
  direction: MappedValue;
  transactionType?: MappedValue;
  amountGroup: string;
  currencyGroups: string[];
  merchant?: MerchantSource;
  accountGroup?: string;
  occurredAt?: OccurrenceSource;
  status: string;
}

export interface NotificationRule {
  id: string;
  whitespace: WhitespaceMode;
  requires?: { subtitle?: 'empty' | 'present' };
  match: RulePattern & { field: NotificationField };
  ignore?: string;
  record?: RecordTemplate;
}

export interface RuleBundle {
  schemaVersion: number;
  version: number;
  fragments: Record<string, string>;
  currencySymbols: Record<string, string>;
  fallbackCurrency: string;
  merchantLocationSuffix: RulePattern;
  fallbackIgnoreReason: string;
  rules: NotificationRule[];
}

export const supportedSchemaVersion = 1;

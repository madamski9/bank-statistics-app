import type { CategorizationRule } from '../categorization-rule';

export interface RuleStorage {
  read: () => Promise<string | null>;
  write: (value: string) => Promise<void>;
}

function isRule(value: unknown): value is CategorizationRule {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<CategorizationRule>;

  return (
    typeof candidate.merchantKey === 'string' &&
    typeof candidate.merchantName === 'string' &&
    typeof candidate.category === 'string' &&
    candidate.scope === 'private'
  );
}

export async function loadRules(storage: RuleStorage): Promise<CategorizationRule[]> {
  let stored: string | null = null;

  try {
    stored = await storage.read();
  } catch {
    return [];
  }

  if (stored === null) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(stored);

    return Array.isArray(parsed) && parsed.every(isRule) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveRules(
  storage: RuleStorage,
  rules: CategorizationRule[],
): Promise<void> {
  await storage.write(JSON.stringify(rules));
}

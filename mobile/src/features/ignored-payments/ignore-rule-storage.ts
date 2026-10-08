import * as SecureStore from 'expo-secure-store';

import { isIgnoreRule, type IgnoreRule } from './ignore-rule';

const storageKey = 'bankstats.ignore-rules.v1';

export async function readIgnoreRules(): Promise<IgnoreRule[]> {
  try {
    const stored = await SecureStore.getItemAsync(storageKey);
    const parsed: unknown = stored === null ? [] : JSON.parse(stored);

    return Array.isArray(parsed) ? parsed.filter(isIgnoreRule) : [];
  } catch {
    return [];
  }
}

export async function writeIgnoreRules(rules: IgnoreRule[]): Promise<void> {
  await SecureStore.setItemAsync(storageKey, JSON.stringify(rules));
}

export function clearIgnoreRules(): Promise<void> {
  return SecureStore.deleteItemAsync(storageKey);
}

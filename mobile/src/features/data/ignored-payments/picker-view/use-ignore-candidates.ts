import type { IngestionRecord } from '@bankstats/ingestion-native';
import { useMemo } from 'react';

import {
  ignoreCandidates,
  ignoreKeyOf,
  ignoreKinds,
  matchesCandidateQuery,
  normalizeIgnoredName,
  type IgnoreRule,
} from '../ignore-rule';

const candidateLimit = 80;

export function useIgnoreCandidates(records: IngestionRecord[], rules: IgnoreRule[], query: string) {
  const candidates = useMemo(() => ignoreCandidates(records, rules), [records, rules]);
  const matching = useMemo(
    () => candidates.filter((candidate) => matchesCandidateQuery(candidate, query)).slice(0, candidateLimit),
    [candidates, query],
  );
  const typedName = query.replace(/\s+/gu, ' ').trim();
  const typedTargets = useMemo(() => {
    if (normalizeIgnoredName(typedName) === '') {
      return [];
    }

    const ruled = new Set(rules.map(ignoreKeyOf));

    return ignoreKinds
      .map((kind) => ({ kind, name: typedName }))
      .filter((target) => !ruled.has(ignoreKeyOf(target)));
  }, [rules, typedName]);

  return { hasCandidates: candidates.length > 0, matching, typedName, typedTargets };
}

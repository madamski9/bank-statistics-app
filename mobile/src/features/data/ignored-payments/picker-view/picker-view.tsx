import type { IngestionRecord } from '@bankstats/ingestion-native';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, { FadeIn, FadeInRight, ReduceMotion } from 'react-native-reanimated';

import { formatDayHeading } from '@/features/app-shell/formatting/format-date';
import { useCopy } from '@/features/app-shell/localization/language';
import { BackButton } from '@/features/app-shell/sheet/back-button';
import { SheetRow } from '@/features/app-shell/sheet/components/sheet-row';
import { SheetSection } from '@/features/app-shell/sheet/components/sheet-section';
import { SheetLayout } from '@/features/app-shell/sheet/sheet-layout';
import { overviewColors, overviewSpacing } from '@/features/app-shell/theme/overview-theme';
import { reportingCurrency } from '@/features/data/currency-conversion/exchange-rate';
import { useAmountFormatting } from '@/features/settings/privacy/amounts/use-private-amounts';

import { ignoredPaymentsCopy } from '../ignored-payments-copy';
import { rowLayout, staggerMs } from '../ignored-motion';
import type { IgnoreMatch, IgnoreRule, IgnoreTarget } from '../ignore-rule';
import { SearchField } from './components/search-field';
import { useIgnoreCandidates } from './use-ignore-candidates';

interface PickerViewProps {
  records: IngestionRecord[];
  rules: IgnoreRule[];
  now: Date;
  onPick: (target: IgnoreTarget, match: IgnoreMatch) => void;
  onBack: () => void;
  onClose: () => void;
}

export function PickerView({ records, rules, now, onPick, onBack, onClose }: PickerViewProps) {
  const copy = useCopy(ignoredPaymentsCopy);
  const { formatAmount } = useAmountFormatting();
  const [query, setQuery] = useState('');
  const { hasCandidates, matching, typedName, typedTargets } = useIgnoreCandidates(records, rules, query);

  return (
    <SheetLayout
      closeLabel={copy.close}
      leading={<BackButton label={copy.back} onPress={onBack} />}
      onClose={onClose}
      title={copy.pickTitle}
    >
      <Animated.View entering={FadeInRight.duration(260).reduceMotion(ReduceMotion.System)} style={styles.content}>
        <SearchField onChange={setQuery} placeholder={copy.searchPlaceholder} value={query} />

        {!hasCandidates && typedTargets.length === 0 ? (
          <Text maxFontSizeMultiplier={1.5} style={styles.note}>
            {copy.noHistory}
          </Text>
        ) : null}

        {matching.length > 0 ? (
          <SheetSection label={copy.historySection}>
            {matching.map((candidate, index) => (
              <Animated.View
                entering={FadeIn.delay(Math.min(index, 10) * staggerMs).duration(220).reduceMotion(ReduceMotion.System)}
                key={candidate.key}
                layout={rowLayout}
              >
                <SheetRow
                  accessibilityHint={copy.pickHint}
                  detail={copy.candidateDetail(
                    copy.kinds[candidate.kind],
                    candidate.count,
                    formatDayHeading(new Date(candidate.lastOccurredAt), now).toLocaleLowerCase(),
                  )}
                  isFirst={index === 0}
                  label={candidate.name}
                  onPress={() => onPick(candidate, 'exact')}
                  value={formatAmount(candidate.totalMinor, reportingCurrency)}
                />
              </Animated.View>
            ))}
          </SheetSection>
        ) : null}

        {typedTargets.length > 0 && matching.length === 0 ? (
          <Animated.View entering={FadeIn.duration(200).reduceMotion(ReduceMotion.System)} style={styles.content}>
            <Text maxFontSizeMultiplier={1.5} style={styles.note}>
              {copy.noMatch(typedName)}
            </Text>
            <SheetSection label={copy.typedSection}>
              {typedTargets.map((target, index) => (
                <SheetRow
                  accessibilityHint={copy.pickHint}
                  detail={copy.kinds[target.kind]}
                  isFirst={index === 0}
                  key={target.kind}
                  label={copy.typedRow(target.name)}
                  onPress={() => onPick(target, 'contains')}
                />
              ))}
            </SheetSection>
          </Animated.View>
        ) : null}
      </Animated.View>
    </SheetLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: overviewSpacing.section,
  },
  note: {
    fontSize: 15,
    lineHeight: 21,
    color: overviewColors.textSecondary,
  },
});

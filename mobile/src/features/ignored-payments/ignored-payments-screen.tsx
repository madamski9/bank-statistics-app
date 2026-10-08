import type { IngestionRecord } from '@bankstats/ingestion-native';
import { SymbolView } from 'expo-symbols';
import { useMemo, useState } from 'react';
import { Keyboard, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeInLeft,
  FadeInRight,
  FadeOut,
  LinearTransition,
  ReduceMotion,
} from 'react-native-reanimated';

import { ScalePressable } from '@/features/app-shell/scale-pressable';
import { SheetButton, SheetLayout, SheetRow, SheetSection } from '@/features/app-shell/sheet-layout';
import { reportingCurrency } from '@/features/currency-conversion/exchange-rate';
import { useCopy } from '@/features/localization/language';
import { useAmountFormatting } from '@/features/privacy/use-private-amounts';
import { overviewColors, overviewSpacing } from '@/features/spending-overview/overview-theme';
import { formatDayHeading } from '@/features/transactions/format-date';
import { selectionChanged } from '@/haptics';

import { IgnoreChoice, type IgnoreChoiceTarget } from './ignore-choice';
import {
  historyCount,
  ignoreCandidates,
  ignoreKeyOf,
  ignoreKinds,
  matchesCandidateQuery,
  normalizeIgnoredName,
  type IgnoreRule,
  type IgnoreTarget,
} from './ignore-rule';
import { ignoredPaymentsCopy } from './ignored-payments-copy';

const candidateLimit = 80;
const staggerMs = 35;
const rowLayout = LinearTransition.springify().dampingRatio(0.9).duration(360).reduceMotion(ReduceMotion.System);

type ScreenView = 'rules' | 'picker';

interface IgnoredPaymentsScreenProps {
  records: IngestionRecord[];
  rules: IgnoreRule[];
  onIgnore: (rule: IgnoreRule) => Promise<void>;
  onStopIgnoring: (target: IgnoreTarget) => Promise<void>;
  onClose: () => void;
}

interface BackButtonProps {
  label: string;
  onPress: () => void;
}

function BackButton({ label, onPress }: BackButtonProps) {
  return (
    <ScalePressable
      accessibilityLabel={label}
      accessibilityRole="button"
      hitSlop={8}
      onPress={() => {
        selectionChanged();
        onPress();
      }}
      pressedScale={0.88}
      style={styles.backButton}
    >
      <SymbolView
        name={{ ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' }}
        size={17}
        tintColor={overviewColors.textPrimary}
      />
    </ScalePressable>
  );
}

export function IgnoredPaymentsScreen({
  records,
  rules,
  onIgnore,
  onStopIgnoring,
  onClose,
}: IgnoredPaymentsScreenProps) {
  const copy = useCopy(ignoredPaymentsCopy);
  const { formatAmount } = useAmountFormatting();
  const [view, setView] = useState<ScreenView>('rules');
  const [hasNavigated, setHasNavigated] = useState(false);
  const [query, setQuery] = useState('');
  const [choice, setChoice] = useState<IgnoreChoiceTarget | null>(null);
  const now = useMemo(() => new Date(), []);

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

  const openPicker = () => {
    selectionChanged();
    setQuery('');
    setHasNavigated(true);
    setView('picker');
  };

  const backToRules = () => {
    setHasNavigated(true);
    setView('rules');
  };

  const openChoice = (target: IgnoreTarget, rule: IgnoreRule | null) => {
    Keyboard.dismiss();
    selectionChanged();
    setChoice({ kind: target.kind, name: target.name, rule, historyCount: historyCount(records, target) });
  };

  const choicePanel = (
    <IgnoreChoice
      onDismiss={() => setChoice(null)}
      onDone={() => {
        setChoice(null);
        backToRules();
      }}
      onIgnore={onIgnore}
      onStopIgnoring={onStopIgnoring}
      target={choice}
    />
  );

  if (view === 'picker') {
    return (
      <View style={styles.fill}>
        <SheetLayout
          closeLabel={copy.close}
          leading={<BackButton label={copy.back} onPress={backToRules} />}
          onClose={onClose}
          title={copy.pickTitle}
        >
          <Animated.View entering={FadeInRight.duration(260).reduceMotion(ReduceMotion.System)} style={styles.content}>
            <View style={styles.searchField}>
              <SymbolView
                accessibilityElementsHidden
                importantForAccessibility="no"
                name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }}
                size={17}
                tintColor={overviewColors.textSecondary}
              />
              <TextInput
                accessibilityLabel={copy.searchPlaceholder}
                autoCorrect={false}
                autoFocus
                clearButtonMode="while-editing"
                onChangeText={setQuery}
                placeholder={copy.searchPlaceholder}
                placeholderTextColor={overviewColors.textSecondary}
                returnKeyType="search"
                selectionColor={overviewColors.textPrimary}
                style={styles.searchInput}
                value={query}
              />
            </View>

            {candidates.length === 0 && typedTargets.length === 0 ? (
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
                      onPress={() => openChoice(candidate, null)}
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
                      onPress={() => openChoice(target, null)}
                    />
                  ))}
                </SheetSection>
              </Animated.View>
            ) : null}
          </Animated.View>
        </SheetLayout>
        {choicePanel}
      </View>
    );
  }

  return (
    <View style={styles.fill}>
      <SheetLayout closeLabel={copy.close} onClose={onClose} title={copy.title}>
        <Animated.View
          entering={hasNavigated ? FadeInLeft.duration(260).reduceMotion(ReduceMotion.System) : undefined}
          style={styles.content}
        >
          <Text maxFontSizeMultiplier={1.5} style={styles.note}>
            {copy.intro}
          </Text>

          <SheetButton label={copy.add} onPress={openPicker} tone="primary" />

          {rules.length === 0 ? (
            <Animated.View entering={FadeIn.duration(220).reduceMotion(ReduceMotion.System)} style={styles.empty}>
              <View accessibilityElementsHidden importantForAccessibility="no" style={styles.emptyIcon}>
                <SymbolView
                  name={{ ios: 'eye.slash', android: 'visibility_off', web: 'visibility_off' }}
                  size={24}
                  tintColor={overviewColors.textSecondary}
                />
              </View>
              <Text maxFontSizeMultiplier={1.4} style={styles.emptyTitle}>
                {copy.emptyTitle}
              </Text>
              <Text maxFontSizeMultiplier={1.5} style={styles.emptyBody}>
                {copy.emptyBody}
              </Text>
            </Animated.View>
          ) : null}

          {ignoreKinds.map((kind) => {
            const ofKind = rules.filter((rule) => rule.kind === kind);

            if (ofKind.length === 0) {
              return null;
            }

            return (
              <Animated.View
                entering={FadeIn.duration(220).reduceMotion(ReduceMotion.System)}
                exiting={FadeOut.duration(150).reduceMotion(ReduceMotion.System)}
                key={kind}
                layout={rowLayout}
              >
                <SheetSection label={copy.sections[kind]}>
                  {ofKind.map((rule, index) => (
                    <Animated.View
                      entering={FadeIn.delay(index * staggerMs).duration(240).reduceMotion(ReduceMotion.System)}
                      exiting={FadeOut.duration(150).reduceMotion(ReduceMotion.System)}
                      key={ignoreKeyOf(rule)}
                      layout={rowLayout}
                    >
                      <SheetRow
                        accessibilityHint={copy.ruleHint}
                        detail={
                          rule.since === undefined
                            ? copy.ruleEverything
                            : copy.ruleSince(formatDayHeading(new Date(rule.since), now).toLocaleLowerCase())
                        }
                        isFirst={index === 0}
                        label={rule.name}
                        onPress={() => openChoice(rule, rule)}
                      />
                    </Animated.View>
                  ))}
                </SheetSection>
              </Animated.View>
            );
          })}

          <Animated.Text layout={rowLayout} maxFontSizeMultiplier={1.5} style={styles.footnote}>
            {copy.footnote}
          </Animated.Text>
        </Animated.View>
      </SheetLayout>
      {choicePanel}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  content: {
    gap: overviewSpacing.section,
  },
  note: {
    fontSize: 15,
    lineHeight: 21,
    color: overviewColors.textSecondary,
  },
  searchField: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 14,
    borderRadius: 14,
    backgroundColor: overviewColors.surfacePressed,
  },
  searchInput: {
    flex: 1,
    minHeight: 48,
    paddingRight: 14,
    fontSize: 17,
    color: overviewColors.textPrimary,
  },
  empty: {
    alignItems: 'center',
    gap: overviewSpacing.tight,
    paddingVertical: overviewSpacing.section,
    paddingHorizontal: overviewSpacing.block,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    borderRadius: 28,
    backgroundColor: overviewColors.surfacePressed,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: overviewColors.textPrimary,
  },
  emptyBody: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    color: overviewColors.textSecondary,
  },
  footnote: {
    fontSize: 13,
    lineHeight: 18,
    color: overviewColors.textSecondary,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: overviewColors.surfacePressed,
  },
});

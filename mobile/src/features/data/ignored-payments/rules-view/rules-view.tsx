import { StyleSheet, Text } from 'react-native';
import Animated, { FadeInLeft, ReduceMotion } from 'react-native-reanimated';

import { useCopy } from '@/features/app-shell/localization/language';
import { SheetButton } from '@/features/app-shell/sheet/components/sheet-button';
import { SheetLayout } from '@/features/app-shell/sheet/sheet-layout';
import { overviewColors, overviewSpacing } from '@/features/app-shell/theme/overview-theme';

import { ignoredPaymentsCopy } from '../ignored-payments-copy';
import { rowLayout } from '../ignored-motion';
import { ignoreKinds, type IgnoreRule } from '../ignore-rule';
import { EmptyRules } from './components/empty-rules';
import { IgnoreRuleSection } from './components/ignore-rule-section';

interface RulesViewProps {
  rules: IgnoreRule[];
  now: Date;
  isReturning: boolean;
  onAdd: () => void;
  onSelectRule: (rule: IgnoreRule) => void;
  onClose: () => void;
}

export function RulesView({ rules, now, isReturning, onAdd, onSelectRule, onClose }: RulesViewProps) {
  const copy = useCopy(ignoredPaymentsCopy);

  return (
    <SheetLayout closeLabel={copy.close} onClose={onClose} title={copy.title}>
      <Animated.View
        entering={isReturning ? FadeInLeft.duration(260).reduceMotion(ReduceMotion.System) : undefined}
        style={styles.content}
      >
        <Text maxFontSizeMultiplier={1.5} style={styles.note}>
          {copy.intro}
        </Text>

        <SheetButton label={copy.add} onPress={onAdd} tone="primary" />

        {rules.length === 0 ? <EmptyRules /> : null}

        {ignoreKinds.map((kind) => {
          const ofKind = rules.filter((rule) => rule.kind === kind);

          if (ofKind.length === 0) {
            return null;
          }

          return (
            <IgnoreRuleSection
              key={kind}
              label={copy.sections[kind]}
              now={now}
              onSelect={onSelectRule}
              rules={ofKind}
            />
          );
        })}

        <Animated.Text layout={rowLayout} maxFontSizeMultiplier={1.5} style={styles.footnote}>
          {copy.footnote}
        </Animated.Text>
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
  footnote: {
    fontSize: 13,
    lineHeight: 18,
    color: overviewColors.textSecondary,
  },
});

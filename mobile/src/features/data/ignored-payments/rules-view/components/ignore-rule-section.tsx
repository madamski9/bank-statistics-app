import Animated, { FadeIn, FadeOut, ReduceMotion } from 'react-native-reanimated';

import { formatDayHeading } from '@/features/app-shell/formatting/format-date';
import { useCopy } from '@/features/app-shell/localization/language';
import { SheetRow } from '@/features/app-shell/sheet/components/sheet-row';
import { SheetSection } from '@/features/app-shell/sheet/components/sheet-section';

import { ignoredPaymentsCopy } from '../../ignored-payments-copy';
import { rowLayout, staggerMs } from '../../ignored-motion';
import { ignoreKeyOf, type IgnoreRule } from '../../ignore-rule';

interface IgnoreRuleSectionProps {
  label: string;
  rules: IgnoreRule[];
  now: Date;
  onSelect: (rule: IgnoreRule) => void;
}

export function IgnoreRuleSection({ label, rules, now, onSelect }: IgnoreRuleSectionProps) {
  const copy = useCopy(ignoredPaymentsCopy);

  return (
    <Animated.View
      entering={FadeIn.duration(220).reduceMotion(ReduceMotion.System)}
      exiting={FadeOut.duration(150).reduceMotion(ReduceMotion.System)}
      layout={rowLayout}
    >
      <SheetSection label={label}>
        {rules.map((rule, index) => (
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
              onPress={() => onSelect(rule)}
            />
          </Animated.View>
        ))}
      </SheetSection>
    </Animated.View>
  );
}

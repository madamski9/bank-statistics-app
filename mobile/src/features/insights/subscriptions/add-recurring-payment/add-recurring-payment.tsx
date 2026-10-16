import { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeInRight, ReduceMotion } from 'react-native-reanimated';

import { useAndroidBack } from '@/features/app-shell/sheet/sheet-modal';
import { BackButton } from '@/features/app-shell/sheet/back-button';
import { SheetButton } from '@/features/app-shell/sheet/components/sheet-button';
import { SheetRow } from '@/features/app-shell/sheet/components/sheet-row';
import { SheetSection } from '@/features/app-shell/sheet/components/sheet-section';
import { SheetLayout } from '@/features/app-shell/sheet/sheet-layout';
import { reportingCurrency } from '@/features/data/currency-conversion/exchange-rate';
import { useCopy } from '@/features/app-shell/localization/language';
import { AmountText } from '@/features/settings/privacy/amounts/amount-text';
import { useAmountFormatting } from '@/features/settings/privacy/amounts/use-private-amounts';
import { overviewColors, overviewSpacing } from '@/features/app-shell/theme/overview-theme';
import { formatDayHeading } from '@/features/app-shell/formatting/format-date';
import { impactLight, selectionChanged } from '@/haptics';

import {
  type Cadence,
  type RecurringCandidate,
  type RecurringCandidatePayment,
  type TrackedPayment,
  trackedPaymentKey,
  upcomingChargeAfter,
} from '../recurring-payments';
import { subscriptionsCopy } from '../subscriptions-copy';

const candidateLimit = 80;
const cadenceChoices: Cadence[] = ['monthly', 'yearly', 'quarterly', 'weekly'];

interface AddRecurringPaymentProps {
  candidates: RecurringCandidate[];
  now: Date;
  onAdd: (payment: TrackedPayment) => Promise<void>;
  onBack: () => void;
  onClose: () => void;
}

function matchesQuery(candidate: RecurringCandidate, query: string): boolean {
  const needle = query.trim().toLocaleLowerCase('pl');

  return needle === '' || candidate.name.toLocaleLowerCase('pl').includes(needle);
}

export function AddRecurringPayment({ candidates, now, onAdd, onBack, onClose }: AddRecurringPaymentProps) {
  const copy = useCopy(subscriptionsCopy);
  const { formatAmount } = useAmountFormatting();
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<RecurringCandidate | null>(null);
  const [pickedPayment, setPickedPayment] = useState<RecurringCandidatePayment | null>(null);
  const [cadence, setCadence] = useState<Cadence>('monthly');
  const [isSaving, setIsSaving] = useState(false);
  const matching = useMemo(
    () => candidates.filter((candidate) => matchesQuery(candidate, query)).slice(0, candidateLimit),
    [candidates, query],
  );

  const pickCadence = (payment: RecurringCandidatePayment) => {
    selectionChanged();
    setCadence('monthly');
    setPickedPayment(payment);
  };

  const goBack = () => {
    if (picked !== null && pickedPayment !== null) {
      setPickedPayment(null);

      if (picked.payments.length === 1) {
        setPicked(null);
      }
    } else if (picked !== null) {
      setPicked(null);
    } else {
      onBack();
    }
  };

  useAndroidBack(goBack);

  if (picked !== null && pickedPayment !== null) {
    const lastDate = new Date(pickedPayment.lastChargedAt);
    const next = upcomingChargeAfter(pickedPayment.lastChargedAt, cadence, now);


    const save = () => {
      if (isSaving) {
        return;
      }

      impactLight();
      setIsSaving(true);
      void onAdd({
        key: trackedPaymentKey(picked.key, pickedPayment.amountMinor),
        partyKey: picked.key,
        name: picked.name,
        cadence,
        amountMinor: pickedPayment.amountMinor,
      }).finally(() => setIsSaving(false));
    };

    return (
      <SheetLayout
        closeLabel={copy.close}
        footer={
          <SheetButton disabled={isSaving} label={copy.confirmAdd} onPress={save} tone="primary" />
        }
        leading={<BackButton label={copy.back} onPress={goBack} />}
        onClose={onClose}
        title={picked.name}
      >
        <Animated.View
          entering={FadeInRight.duration(240).reduceMotion(ReduceMotion.System)}
          style={styles.content}
        >
          <View style={styles.summary}>
            <AmountText maxFontSizeMultiplier={1.3} style={styles.amount}>
              {formatAmount(pickedPayment.amountMinor, reportingCurrency)}
            </AmountText>
            <AmountText maxFontSizeMultiplier={1.4} style={styles.caption}>
              {copy.lastCharge(formatAmount(pickedPayment.amountMinor, reportingCurrency), formatDayHeading(lastDate, now))}
            </AmountText>
          </View>

          <SheetSection footnote={copy.preview(formatDayHeading(next, now))} label={copy.cadenceTitle}>
            {cadenceChoices.map((choice, index) => (
              <SheetRow
                isFirst={index === 0}
                isSelected={choice === cadence}
                key={choice}
                label={copy.cadenceOptions[choice]}
                onPress={() => {
                  selectionChanged();
                  setCadence(choice);
                }}
              />
            ))}
          </SheetSection>
        </Animated.View>
      </SheetLayout>
    );
  }

  if (picked !== null) {
    return (
      <SheetLayout
        closeLabel={copy.close}
        leading={<BackButton label={copy.back} onPress={goBack} />}
        onClose={onClose}
        title={picked.name}
      >
        <Animated.View
          entering={FadeInRight.duration(240).reduceMotion(ReduceMotion.System)}
          style={styles.content}
        >
          <Text maxFontSizeMultiplier={1.5} style={styles.note}>
            {copy.pickPaymentIntro(picked.name)}
          </Text>
          <SheetSection>
            {picked.payments.map((payment, index) => (
              <SheetRow
                accessibilityHint={copy.pickHint}
                detail={copy.paymentDetail(formatDayHeading(new Date(payment.lastChargedAt), now), payment.chargeCount)}
                isFirst={index === 0}
                key={payment.amountMinor}
                label={formatAmount(payment.amountMinor, reportingCurrency)}
                onPress={() => pickCadence(payment)}
              />
            ))}
          </SheetSection>
        </Animated.View>
      </SheetLayout>
    );
  }

  return (
    <SheetLayout
      closeLabel={copy.close}
      leading={<BackButton label={copy.back} onPress={goBack} />}
      onClose={onClose}
      title={copy.pickTitle}
    >
      <Text maxFontSizeMultiplier={1.5} style={styles.note}>
        {copy.pickIntro}
      </Text>
      <TextInput
        accessibilityLabel={copy.searchPlaceholder}
        autoCorrect={false}
        clearButtonMode="while-editing"
        onChangeText={setQuery}
        placeholder={copy.searchPlaceholder}
        placeholderTextColor={overviewColors.textDisabled}
        returnKeyType="search"
        selectionColor={overviewColors.textPrimary}
        style={styles.search}
        value={query}
      />
      {candidates.length === 0 || matching.length === 0 ? (
        <Text maxFontSizeMultiplier={1.5} style={styles.note}>
          {candidates.length === 0 ? copy.noCandidates : copy.noMatch}
        </Text>
      ) : (
        <Animated.View entering={FadeIn.duration(200).reduceMotion(ReduceMotion.System)}>
          <SheetSection>
            {matching.map((candidate, index) => (
              <SheetRow
                accessibilityHint={copy.pickHint}
                detail={
                  candidate.payments.length > 1
                    ? copy.candidatePaymentsDetail(
                        formatDayHeading(new Date(candidate.lastChargedAt), now),
                        candidate.payments.length,
                      )
                    : copy.candidateDetail(formatDayHeading(new Date(candidate.lastChargedAt), now), candidate.chargeCount)
                }
                isFirst={index === 0}
                key={candidate.key}
                label={candidate.name}
                onPress={() => {
                  setPicked(candidate);
                  const [only] = candidate.payments;

                  if (candidate.payments.length === 1 && only !== undefined) {
                    pickCadence(only);
                  } else {
                    selectionChanged();
                  }
                }}
                value={formatAmount(candidate.lastAmountMinor, reportingCurrency)}
                valueTone="muted"
              />
            ))}
          </SheetSection>
        </Animated.View>
      )}
    </SheetLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: overviewSpacing.section,
  },
  summary: {
    gap: 4,
  },
  amount: {
    fontSize: 40,
    fontWeight: '700',
    letterSpacing: -1.2,
    color: overviewColors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  caption: {
    fontSize: 13,
    color: overviewColors.textSecondary,
  },
  note: {
    fontSize: 14,
    lineHeight: 20,
    color: overviewColors.textSecondary,
  },
  search: {
    minHeight: 48,
    paddingHorizontal: 14,
    borderRadius: 14,
    fontSize: 17,
    color: overviewColors.textPrimary,
    backgroundColor: overviewColors.surfacePressed,
  },
});

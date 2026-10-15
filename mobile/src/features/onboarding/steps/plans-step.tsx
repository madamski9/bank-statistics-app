import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { useCopy } from '@/features/app-shell/localization/language';
import { overviewColors } from '@/features/app-shell/theme/overview-theme';

import { SectionHeading } from '../components/section-heading';
import { SelectionCard } from '../components/selection-card';
import { stepStyles } from '../components/step-styles';
import { OnboardingIcon } from '../illustrations/onboarding-icon';
import { onboardingCopy } from '../onboarding-copy';
import { onboardingColors } from '../onboarding-motion';

export type OnboardingPlan = 'free' | 'premium';

interface PlansStepProps {
  onSelect: (plan: OnboardingPlan) => void;
  selectedPlan: OnboardingPlan;
}

export function PlansStep({ onSelect, selectedPlan }: PlansStepProps) {
  const copy = useCopy(onboardingCopy).plans;
  return (
    <View style={stepStyles.stepContent}>
      <SectionHeading
        eyebrow={copy.eyebrow}
        title={copy.title}
        description={copy.description}
      />
      <SelectionCard
        selected={selectedPlan === 'free'}
        delay={120}
        accessibilityLabel={copy.freeLabel}
        accessibilityRole="radio"
        accessibilityState={{ checked: selectedPlan === 'free' }}
        onPress={() => onSelect('free')}
        style={styles.planCard}
      >
        <View style={styles.planHeading}>
          <Text style={styles.planName}>{copy.freeName}</Text>
          <View style={styles.planHeadingRight}>
            <Text style={styles.planPrice}>{copy.freePrice}</Text>
            <PlanCheck isSelected={selectedPlan === 'free'} />
          </View>
        </View>
        <Text style={styles.planDetail}>{copy.freeDetail}</Text>
      </SelectionCard>
      <SelectionCard
        selected={selectedPlan === 'premium'}
        delay={180}
        accessibilityLabel={copy.premiumLabel}
        accessibilityRole="radio"
        accessibilityState={{ checked: selectedPlan === 'premium' }}
        onPress={() => onSelect('premium')}
        style={[
          styles.planCard,
          styles.premiumCard,
        ]}
      >
        <View style={styles.planHeading}>
          <Text style={styles.premiumName}>Premium</Text>
          <View style={styles.planHeadingRight}>
            <Text style={styles.comingSoon}>{copy.comingSoon}</Text>
            <PlanCheck isSelected={selectedPlan === 'premium'} />
          </View>
        </View>
        <Text style={styles.premiumPrice}>{copy.monthlyPrice}</Text>
        <View style={styles.yearlyPriceRow}>
          <Text style={styles.planDetail}>{copy.or}</Text>
          <Text style={styles.oldYearlyPrice}>{copy.oldYearlyPrice}</Text>
          <Text style={styles.newYearlyPrice}>{copy.yearlyPrice}</Text>
        </View>
        <View style={styles.premiumDivider} />
        {[copy.unlimitedLimits, copy.moreStatistics].map((benefit) => (
          <View key={benefit} style={styles.benefitRow}>
            <OnboardingIcon name="check" size={16} />
            <Text style={styles.premiumBenefit}>{benefit}</Text>
          </View>
        ))}
      </SelectionCard>
      <Text style={stepStyles.smallNote}>{copy.note}</Text>
    </View>
  );
}

function PlanCheck({ isSelected }: { isSelected: boolean }) {
  return (
    <View
      style={[
        styles.planCheck,
        isSelected ? styles.planCheckSelected : null,
      ]}
    >
      {isSelected ? (
        <SymbolView
          name={{ ios: 'checkmark', android: 'check', web: 'check' }}
          size={13}
          tintColor={overviewColors.background}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  planCard: {
    gap: 9,
    minHeight: 88,
    padding: 20,
    borderRadius: 22,
    backgroundColor: overviewColors.surface,
    borderWidth: 1,
    borderColor: overviewColors.hairline,
  },
  premiumCard: {
    backgroundColor: overviewColors.surfacePressed,
  },
  planHeading: {
    flexWrap: 'wrap',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  planHeadingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  planCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: overviewColors.textSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planCheckSelected: {
    borderColor: onboardingColors.accent,
    backgroundColor: onboardingColors.accent,
  },
  planName: {
    color: overviewColors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  planPrice: {
    color: overviewColors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  planDetail: {
    color: overviewColors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  premiumName: {
    color: onboardingColors.accentText,
    fontSize: 18,
    fontWeight: '700',
  },
  premiumPrice: {
    color: overviewColors.textPrimary,
    fontSize: 26,
    fontWeight: '700',
  },
  yearlyPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: 7,
  },
  oldYearlyPrice: {
    color: overviewColors.textSecondary,
    fontSize: 14,
    textDecorationLine: 'line-through',
  },
  newYearlyPrice: {
    color: overviewColors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  comingSoon: {
    color: onboardingColors.accentText,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: onboardingColors.accentMuted,
    overflow: 'hidden',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  premiumDivider: {
    height: 1,
    marginVertical: 5,
    backgroundColor: overviewColors.hairline,
  },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  premiumBenefit: {
    flex: 1,
    color: overviewColors.textPrimary,
    fontSize: 14,
    lineHeight: 20,
  },
});

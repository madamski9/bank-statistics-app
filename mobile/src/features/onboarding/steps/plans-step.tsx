import { SymbolView } from 'expo-symbols';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { useCopy } from '@/features/app-shell/localization/language';
import { overviewColors } from '@/features/app-shell/theme/overview-theme';
import type { PremiumPlan, PremiumPlanPeriod } from '@/features/settings/premium/store/store-purchases';

import { SectionHeading } from '../components/section-heading';
import { SelectionCard } from '../components/selection-card';
import { stepStyles } from '../components/step-styles';
import { OnboardingIcon } from '../illustrations/onboarding-icon';
import { onboardingCopy } from '../onboarding-copy';
import { onboardingColors } from '../onboarding-motion';

export type OnboardingPlan = 'free' | PremiumPlanPeriod;

const storeName = Platform.OS === 'android' ? 'Google Play' : 'App Store';

interface PlansStepProps {
  onSelect: (plan: OnboardingPlan) => void;
  selectedPlan: OnboardingPlan;
  premiumPlans: PremiumPlan[];
  sellsPremium: boolean;
}

export function PlansStep({ onSelect, selectedPlan, premiumPlans, sellsPremium }: PlansStepProps) {
  const copy = useCopy(onboardingCopy).plans;
  const annual = premiumPlans.find((plan) => plan.period === 'annual');
  const monthly = premiumPlans.find((plan) => plan.period === 'monthly');
  const trialDays = premiumPlans.find((plan) => plan.trialDays !== null)?.trialDays ?? null;
  const annualPrice = annual === undefined ? copy.yearlyPrice : copy.yearlyPriceOf(annual.price);
  const monthlyPrice = monthly === undefined ? copy.monthlyPrice : copy.monthlyPriceOf(monthly.price);

  return (
    <View style={stepStyles.stepContent}>
      <SectionHeading
        eyebrow={copy.eyebrow}
        title={copy.title}
        description={sellsPremium ? copy.sellingDescription : copy.description}
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
      <View style={styles.premiumHeading}>
        <Text style={styles.premiumName}>Premium</Text>
        {sellsPremium && trialDays === null ? null : (
          <Text style={styles.badge}>{trialDays === null ? copy.comingSoon : copy.trialBadge(trialDays)}</Text>
        )}
      </View>
      <PremiumPlanCard
        delay={180}
        detail={trialDays === null ? null : copy.afterTrial(trialDays, annualPrice)}
        isSelected={selectedPlan === 'annual'}
        name={copy.premiumYearlyName}
        onSelect={() => onSelect('annual')}
        price={annualPrice}
        previousPrice={annual === undefined ? copy.oldYearlyPrice : null}
      />
      <PremiumPlanCard
        delay={220}
        detail={trialDays === null ? null : copy.afterTrial(trialDays, monthlyPrice)}
        isSelected={selectedPlan === 'monthly'}
        name={copy.premiumMonthlyName}
        onSelect={() => onSelect('monthly')}
        price={monthlyPrice}
        previousPrice={null}
      />
      <View style={styles.benefits}>
        {[copy.unlimitedLimits, copy.moreStatistics].map((benefit) => (
          <View key={benefit} style={styles.benefitRow}>
            <OnboardingIcon name="check" size={16} />
            <Text style={styles.premiumBenefit}>{benefit}</Text>
          </View>
        ))}
      </View>
      <Text style={stepStyles.smallNote}>{sellsPremium ? copy.storeNote(storeName) : copy.note}</Text>
    </View>
  );
}

interface PremiumPlanCardProps {
  name: string;
  price: string;
  previousPrice: string | null;
  detail: string | null;
  isSelected: boolean;
  delay: number;
  onSelect: () => void;
}

function PremiumPlanCard({ name, price, previousPrice, detail, isSelected, delay, onSelect }: PremiumPlanCardProps) {
  const copy = useCopy(onboardingCopy).plans;

  return (
    <SelectionCard
      selected={isSelected}
      delay={delay}
      accessibilityLabel={copy.premiumPlanLabel(name, detail ?? price)}
      accessibilityRole="radio"
      accessibilityState={{ checked: isSelected }}
      onPress={onSelect}
      style={[styles.planCard, styles.premiumCard]}
    >
      <View style={styles.planHeading}>
        <Text style={styles.planName}>{name}</Text>
        <PlanCheck isSelected={isSelected} />
      </View>
      <View style={styles.priceRow}>
        {previousPrice === null ? null : <Text style={styles.oldPrice}>{previousPrice}</Text>}
        <Text style={styles.premiumPrice}>{price}</Text>
      </View>
      {detail === null ? null : <Text style={styles.planDetail}>{detail}</Text>}
    </SelectionCard>
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
  premiumHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 6,
  },
  premiumName: {
    color: onboardingColors.accentText,
    fontSize: 18,
    fontWeight: '700',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: 8,
  },
  premiumPrice: {
    color: overviewColors.textPrimary,
    fontSize: 22,
    fontWeight: '700',
  },
  oldPrice: {
    color: overviewColors.textSecondary,
    fontSize: 14,
    textDecorationLine: 'line-through',
  },
  badge: {
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
  benefits: {
    gap: 8,
  },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  premiumBenefit: {
    flex: 1,
    color: overviewColors.textPrimary,
    fontSize: 14,
    lineHeight: 20,
  },
});

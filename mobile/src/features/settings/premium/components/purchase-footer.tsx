import { useState } from 'react';
import { ActivityIndicator, Alert, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCopy } from '@/features/app-shell/localization/language';
import { overviewColors, overviewSpacing } from '@/features/app-shell/theme/overview-theme';
import { privacyPolicyUrl, termsOfUseUrl } from '@/features/settings/legal/legal-links';

import { premiumCopy } from '../premium-copy';
import {
  presentOfferCodeRedemption,
  redeemsOfferCodes,
  type PremiumPlan,
  type PremiumPlanPeriod,
} from '../store/store-purchases';
import type { StoreOfferingId } from '../store/trial-offer';
import { usePremiumOffer } from '../store/use-premium-offer';

const storeName = Platform.OS === 'android' ? 'Google Play' : 'App Store';

interface PlanOptionProps {
  plan: PremiumPlan;
  isSelected: boolean;
  onSelect: () => void;
}

function PlanOption({ plan, isSelected, onSelect }: PlanOptionProps) {
  const copy = useCopy(premiumCopy);
  const price = copy.planPrice[plan.period](plan.price);

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: isSelected }}
      onPress={onSelect}
      style={({ pressed }) => [styles.plan, isSelected ? styles.planSelected : null, pressed ? styles.pressed : null]}
    >
      <Text maxFontSizeMultiplier={1.3} style={styles.planName}>
        {copy.plans[plan.period]}
      </Text>
      <Text maxFontSizeMultiplier={1.3} style={styles.planPrice}>
        {plan.trialDays === null ? price : `${copy.planTrial(plan.trialDays)} ${price}`}
      </Text>
    </Pressable>
  );
}

export function PurchaseFooter({ offeringId }: { offeringId: StoreOfferingId }) {
  const copy = useCopy(premiumCopy);
  const insets = useSafeAreaInsets();
  const offer = usePremiumOffer(offeringId);
  const [chosenPeriod, setChosenPeriod] = useState<PremiumPlanPeriod>('annual');
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const plans = offer.state.kind === 'ready' ? offer.state.plans : [];
  const selectedPlan = plans.find((plan) => plan.period === chosenPeriod) ?? plans[0];

  async function buy() {
    if (offer.state.kind === 'unavailable') {
      Alert.alert('BankStats Premium', copy.purchaseSoon);
      return;
    }

    if (offer.state.kind === 'failed') {
      offer.reload();
      return;
    }

    if (selectedPlan === undefined) {
      return;
    }

    setMessage(null);
    setIsBusy(true);
    const outcome = await offer.purchase(selectedPlan);
    setIsBusy(false);

    if (outcome === 'failed') {
      setMessage(copy.purchaseFailed);
    }
  }

  async function restore() {
    setMessage(null);
    setIsBusy(true);
    const outcome = await offer.restore();
    setIsBusy(false);
    setMessage(
      outcome === 'restored' ? copy.restored : outcome === 'nothingToRestore' ? copy.nothingToRestore : copy.restoreFailed,
    );
  }

  const isWaiting = isBusy || offer.state.kind === 'loading';
  const purchaseLabel =
    offer.state.kind === 'failed'
      ? copy.retry
      : selectedPlan?.trialDays != null
        ? copy.startTrial(selectedPlan.trialDays)
        : copy.buy;

  return (
    <View style={[styles.footer, { paddingBottom: insets.bottom + overviewSpacing.block }]}>
      {plans.length > 0 ? (
        <View accessibilityRole="radiogroup" style={styles.plans}>
          {plans.map((plan) => (
            <PlanOption
              isSelected={plan === selectedPlan}
              key={plan.period}
              onSelect={() => setChosenPeriod(plan.period)}
              plan={plan}
            />
          ))}
        </View>
      ) : null}
      {offer.state.kind === 'failed' ? (
        <Text maxFontSizeMultiplier={1.4} style={styles.message}>
          {copy.plansFailed}
        </Text>
      ) : null}
      <Pressable
        accessibilityLabel={offer.state.kind === 'loading' ? copy.loadingPlans : purchaseLabel}
        accessibilityRole="button"
        accessibilityState={{ busy: isWaiting, disabled: isWaiting }}
        disabled={isWaiting}
        onPress={() => void buy()}
        style={({ pressed }) => [styles.purchase, pressed ? styles.pressed : null]}
      >
        {isWaiting ? (
          <ActivityIndicator color={overviewColors.textPrimary} />
        ) : (
          <Text maxFontSizeMultiplier={1.3} style={styles.purchaseLabel}>
            {purchaseLabel}
          </Text>
        )}
      </Pressable>
      {message !== null ? (
        <Text accessibilityLiveRegion="polite" maxFontSizeMultiplier={1.4} style={styles.message}>
          {message}
        </Text>
      ) : null}
      {offer.state.kind === 'unavailable' ? null : (
        <View style={styles.secondaryActions}>
          <Pressable
            accessibilityRole="button"
            disabled={isBusy}
            hitSlop={8}
            onPress={() => void restore()}
            style={({ pressed }) => [styles.restore, pressed ? styles.pressed : null]}
          >
            <Text maxFontSizeMultiplier={1.4} style={styles.restoreLabel}>
              {copy.restore}
            </Text>
          </Pressable>
          {redeemsOfferCodes() ? (
            <Pressable
              accessibilityRole="button"
              disabled={isBusy}
              hitSlop={8}
              onPress={() => void presentOfferCodeRedemption().catch(() => setMessage(copy.purchaseFailed))}
              style={({ pressed }) => [styles.restore, pressed ? styles.pressed : null]}
            >
              <Text maxFontSizeMultiplier={1.4} style={styles.restoreLabel}>
                {copy.redeemCode}
              </Text>
            </Pressable>
          ) : null}
        </View>
      )}
      <Text maxFontSizeMultiplier={1.4} style={styles.footnote}>
        {copy.footnote(storeName)}
      </Text>
      <View style={styles.legalLinks}>
        <Pressable accessibilityRole="link" hitSlop={8} onPress={() => void Linking.openURL(privacyPolicyUrl)}>
          <Text maxFontSizeMultiplier={1.4} style={styles.legalLink}>
            {copy.privacyPolicy}
          </Text>
        </Pressable>
        <Pressable accessibilityRole="link" hitSlop={8} onPress={() => void Linking.openURL(termsOfUseUrl)}>
          <Text maxFontSizeMultiplier={1.4} style={styles.legalLink}>
            {copy.termsOfUse}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    gap: 10,
    paddingHorizontal: overviewSpacing.gutter,
    paddingTop: overviewSpacing.row,
  },
  plans: {
    flexDirection: 'row',
    gap: 10,
  },
  plan: {
    flex: 1,
    gap: 4,
    minHeight: 64,
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: overviewColors.hairline,
    backgroundColor: overviewColors.surface,
  },
  planSelected: {
    borderColor: overviewColors.textPrimary,
  },
  planName: {
    fontSize: 15,
    fontWeight: '700',
    color: overviewColors.textPrimary,
  },
  planPrice: {
    fontSize: 13,
    lineHeight: 17,
    color: overviewColors.textSecondary,
  },
  purchase: {
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    experimental_backgroundImage: 'linear-gradient(120deg, #FF5C8A 0%, #8F7BFF 100%)',
  },
  purchaseLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: overviewColors.textPrimary,
  },
  message: {
    fontSize: 14,
    lineHeight: 19,
    textAlign: 'center',
    color: overviewColors.textSecondary,
  },
  secondaryActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
  },
  restore: {
    alignSelf: 'center',
    minHeight: 36,
    justifyContent: 'center',
  },
  restoreLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: overviewColors.textSecondary,
  },
  footnote: {
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
    color: overviewColors.textSecondary,
  },
  legalLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    columnGap: 18,
    rowGap: 4,
  },
  legalLink: {
    fontSize: 12,
    lineHeight: 16,
    textDecorationLine: 'underline',
    color: overviewColors.textSecondary,
  },
  pressed: {
    opacity: 0.7,
  },
});

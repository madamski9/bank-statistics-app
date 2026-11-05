import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { useCopy } from '@/features/app-shell/localization/language';
import { AnimatedReveal } from '@/features/app-shell/motion/animated-reveal';
import { overviewColors } from '@/features/app-shell/theme/overview-theme';

import { SectionHeading } from '../components/section-heading';
import { SelectionCard } from '../components/selection-card';
import { stepStyles } from '../components/step-styles';
import { onboardingCopy } from '../onboarding-copy';
import { onboardingColors } from '../onboarding-motion';
import { walletOnlyCapture } from '../shortcut-setup/shortcut-links';
import { supportedBanks } from './supported-banks';

interface BanksStepProps {
  disabled: boolean;
  onToggle: (bankId: string) => void;
  selectedBanks: string[];
}

export function BanksStep({ disabled, onToggle, selectedBanks }: BanksStepProps) {
  const copy = useCopy(onboardingCopy).banks;
  const isWalletSelected = selectedBanks.includes(walletOnlyCapture);
  return (
    <View style={stepStyles.stepContent}>
      <SectionHeading
        eyebrow={copy.eyebrow}
        title={copy.title}
        description={copy.description}
      />
      <View style={styles.bankList}>
        {supportedBanks.map((bank, index) => {
          const selected = selectedBanks.includes(bank.id);

          return (
            <SelectionCard
              selected={selected}
              delay={100 + index * 50}
              accessibilityLabel={`${bank.name}${bank.available ? '' : copy.soonSuffix}`}
              accessibilityRole="checkbox"
              accessibilityState={{
                checked: selected,
                disabled: disabled || !bank.available,
              }}
              disabled={disabled || !bank.available}
              key={bank.id}
              onPress={() => onToggle(bank.id)}
              style={[
                styles.bankCard,
                !bank.available && styles.unavailableBank,
              ]}
            >
              <View
                style={[
                  styles.checkbox,
                  selected ? styles.checkboxSelected : null,
                ]}
              >
                {selected ? (
                  <SymbolView
                    name={{ ios: 'checkmark', android: 'check', web: 'check' }}
                    size={14}
                    tintColor={overviewColors.background}
                  />
                ) : null}
              </View>
              <Image
                accessible={false}
                contentFit="cover"
                source={bank.logo}
                style={styles.bankLogo}
              />
              <Text maxFontSizeMultiplier={1.4} style={styles.bankName}>
                {bank.name}
              </Text>
              {!bank.available ? (
                <Text style={styles.bankSoon}>{copy.soon}</Text>
              ) : null}
            </SelectionCard>
          );
        })}
        <SelectionCard
          selected={isWalletSelected}
          delay={100 + supportedBanks.length * 50}
          accessibilityLabel={copy.walletOption}
          accessibilityHint={copy.walletOptionDetail}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: isWalletSelected, disabled }}
          disabled={disabled}
          onPress={() => onToggle(walletOnlyCapture)}
          style={styles.bankCard}
        >
          <View style={[styles.checkbox, isWalletSelected ? styles.checkboxSelected : null]}>
            {isWalletSelected ? (
              <SymbolView
                name={{ ios: 'checkmark', android: 'check', web: 'check' }}
                size={14}
                tintColor={overviewColors.background}
              />
            ) : null}
          </View>
          <View style={styles.walletIcon}>
            <SymbolView
              name={{ ios: 'wallet.pass.fill', android: 'wallet', web: 'wallet' }}
              size={20}
              tintColor={overviewColors.textPrimary}
            />
          </View>
          <View style={styles.walletText}>
            <Text maxFontSizeMultiplier={1.4} style={styles.bankName}>
              {copy.walletOption}
            </Text>
            <Text maxFontSizeMultiplier={1.4} style={styles.walletDetail}>
              {copy.walletOptionDetail}
            </Text>
          </View>
        </SelectionCard>
      </View>
      <AnimatedReveal delay={300} style={stepStyles.stepsCard}>
        <Text style={stepStyles.stepsTitle}>{copy.stepsTitle}</Text>
        <Text style={stepStyles.stepsLine}>{copy.stepOne}</Text>
        <Text style={stepStyles.stepsLine}>{copy.stepTwo}</Text>
      </AnimatedReveal>
      <Text style={stepStyles.smallNote}>{copy.note}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bankList: { gap: 12 },
  unavailableBank: { opacity: 0.55 },
  bankCard: {
    minHeight: 76,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: overviewColors.hairline,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 16,
    backgroundColor: overviewColors.surface,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: overviewColors.textSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: onboardingColors.accent,
    borderColor: onboardingColors.accent,
  },
  bankLogo: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: overviewColors.textPrimary,
  },
  bankName: {
    flex: 1,
    color: overviewColors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  walletIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: overviewColors.hairline,
  },
  walletText: { flex: 1, gap: 4 },
  walletDetail: {
    color: overviewColors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  bankSoon: {
    color: overviewColors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
});

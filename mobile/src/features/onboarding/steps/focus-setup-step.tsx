import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { useCopy } from '@/features/app-shell/localization/language';
import { overviewColors } from '@/features/app-shell/theme/overview-theme';

import { InstructionCard } from '../components/instruction-card';
import { SectionHeading } from '../components/section-heading';
import { stepStyles } from '../components/step-styles';
import { onboardingCopy } from '../onboarding-copy';
import { onboardingColors } from '../onboarding-motion';

export function FocusSetupStep() {
  const copy = useCopy(onboardingCopy).focusSetup;

  return (
    <View style={stepStyles.stepContent}>
      <SectionHeading
        eyebrow={copy.eyebrow}
        title={copy.title}
        description={copy.description}
      />
      <View style={styles.walletCard}>
        <SymbolView
          name={{ ios: 'wallet.pass.fill', android: 'wallet', web: 'wallet' }}
          size={22}
          tintColor={overviewColors.caution}
        />
        <View style={styles.walletText}>
          <Text maxFontSizeMultiplier={1.5} style={styles.walletTitle}>{copy.walletTitle}</Text>
          <Text maxFontSizeMultiplier={1.5} style={styles.walletDescription}>
            {copy.walletDescription}
          </Text>
        </View>
      </View>
      <InstructionCard number={1} title={copy.stepOne} />
      <InstructionCard number={2} title={copy.stepTwo}>
        <Image
          accessible={false}
          contentFit="contain"
          source={require('../assets/focus-step-apps.png')}
          style={[styles.stepScreenshot, styles.appsScreenshot]}
        />
      </InstructionCard>
      <InstructionCard number={3} title={copy.stepThree}>
        <Image
          accessible={false}
          contentFit="contain"
          source={require('../assets/focus-step-allow.png')}
          style={[styles.stepScreenshot, styles.allowScreenshot]}
        />
      </InstructionCard>
      <Text maxFontSizeMultiplier={1.5} style={stepStyles.smallNote}>{copy.verification}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  walletCard: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderRadius: 18,
    backgroundColor: onboardingColors.cautionMuted,
    borderWidth: 1,
    borderColor: overviewColors.caution,
  },
  walletText: { flex: 1, gap: 4 },
  walletTitle: {
    color: overviewColors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  walletDescription: {
    color: overviewColors.textPrimary,
    fontSize: 14,
    lineHeight: 21,
  },
  stepScreenshot: {
    width: '100%',
    marginTop: 4,
    marginBottom: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: overviewColors.hairline,
    backgroundColor: overviewColors.background,
  },
  appsScreenshot: { aspectRatio: 786 / 505 },
  allowScreenshot: { aspectRatio: 786 / 637 },
});

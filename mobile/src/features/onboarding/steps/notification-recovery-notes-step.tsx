import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { useCopy } from '@/features/app-shell/localization/language';
import { overviewColors } from '@/features/app-shell/theme/overview-theme';

import { InstructionCard } from '../components/instruction-card';
import { SectionHeading } from '../components/section-heading';
import { stepStyles } from '../components/step-styles';
import { onboardingCopy } from '../onboarding-copy';

export function NotificationRecoveryNotesStep() {
  const copy = useCopy(onboardingCopy).notificationRecoveryNotes;
  const instructions = [
    { title: copy.recoveryTitle, description: copy.recoveryDescription },
    { title: copy.bankTitle, description: copy.bankDescription },
    { title: copy.reportTitle, description: copy.reportDescription },
  ];

  return (
    <View style={stepStyles.stepContent}>
      <SectionHeading eyebrow={copy.eyebrow} title={copy.title} description={copy.description} />
      <InstructionCard number={1} title={copy.inboxTitle}>
        <Text style={stepStyles.smallNote}>{copy.inboxDescription}</Text>
        <Image
          accessible={false}
          contentFit="contain"
          source={require('../assets/news-step-capture-row.png')}
          style={[styles.stepScreenshot, styles.captureRowScreenshot]}
        />
        <Image
          accessible={false}
          contentFit="contain"
          source={require('../assets/news-step-inbox-row.png')}
          style={[styles.stepScreenshot, styles.inboxRowScreenshot]}
        />
      </InstructionCard>
      {instructions.map((instruction, index) => (
        <InstructionCard key={instruction.title} number={index + 2} title={instruction.title}>
          <Text style={stepStyles.smallNote}>{instruction.description}</Text>
        </InstructionCard>
      ))}
      <Text style={stepStyles.smallNote}>{copy.note}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stepScreenshot: {
    width: '100%',
    marginTop: 4,
    marginBottom: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: overviewColors.hairline,
    backgroundColor: overviewColors.background,
  },
  captureRowScreenshot: { aspectRatio: 786 / 417 },
  inboxRowScreenshot: { aspectRatio: 786 / 307 },
});

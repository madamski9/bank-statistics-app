import { Text, View } from 'react-native';

import { useCopy } from '@/features/app-shell/localization/language';

import { InstructionCard } from '../components/instruction-card';
import { SectionHeading } from '../components/section-heading';
import { stepStyles } from '../components/step-styles';
import { onboardingCopy } from '../onboarding-copy';

export function NotificationRecoveryNotesStep() {
  const copy = useCopy(onboardingCopy).notificationRecoveryNotes;
  const instructions = [
    { title: copy.inboxTitle, description: copy.inboxDescription },
    { title: copy.recoveryTitle, description: copy.recoveryDescription },
    { title: copy.reportTitle, description: copy.reportDescription },
  ];

  return (
    <View style={stepStyles.stepContent}>
      <SectionHeading eyebrow={copy.eyebrow} title={copy.title} description={copy.description} />
      {instructions.map((instruction, index) => (
        <InstructionCard key={instruction.title} number={index + 1} title={instruction.title}>
          <Text style={stepStyles.smallNote}>{instruction.description}</Text>
        </InstructionCard>
      ))}
      <Text style={stepStyles.smallNote}>{copy.note}</Text>
    </View>
  );
}

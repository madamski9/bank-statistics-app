import { Modal, StyleSheet, View } from 'react-native';

import { overviewColors } from '@/features/spending-overview/overview-theme';

interface PrivacyCoverProps {
  isVisible: boolean;
}

export function PrivacyCover({ isVisible }: PrivacyCoverProps) {
  return (
    <Modal
      animationType="none"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      transparent={false}
      visible={isVisible}
    >
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.cover} />
    </Modal>
  );
}

const styles = StyleSheet.create({
  cover: {
    flex: 1,
    backgroundColor: overviewColors.background,
  },
});

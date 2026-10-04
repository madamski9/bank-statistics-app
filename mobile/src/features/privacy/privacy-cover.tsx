import type { ReactNode } from 'react';
import { Modal, StyleSheet, View } from 'react-native';

import { overviewColors } from '@/features/spending-overview/overview-theme';

interface PrivacyCoverProps {
  isVisible: boolean;
  children?: ReactNode;
}

export function PrivacyCover({ isVisible, children }: PrivacyCoverProps) {
  return (
    <Modal
      animationType="none"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      transparent={false}
      visible={isVisible}
    >
      <View style={styles.cover}>
        {children ?? (
          <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.cover} />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  cover: {
    flex: 1,
    backgroundColor: overviewColors.background,
  },
});

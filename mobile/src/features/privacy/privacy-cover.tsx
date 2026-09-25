import { SymbolView } from 'expo-symbols';
import { Modal, StyleSheet, Text, View } from 'react-native';

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
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.cover}>
        <SymbolView
          name={{ ios: 'lock.fill', android: 'lock', web: 'lock' }}
          size={34}
          tintColor={overviewColors.textSecondary}
        />
        <Text style={styles.name}>BankStats</Text>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  cover: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: overviewColors.background,
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: overviewColors.textPrimary,
  },
});

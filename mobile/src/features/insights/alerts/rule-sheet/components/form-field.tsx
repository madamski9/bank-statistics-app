import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { overviewColors } from '@/features/app-shell/theme/overview-theme';

interface FormFieldProps {
  label: string;
  children: ReactNode;
}

export function FormField({ label, children }: FormFieldProps) {
  return (
    <View style={styles.field}>
      <FormLabel>{label}</FormLabel>
      {children}
    </View>
  );
}

export function FormLabel({ children }: { children: string }) {
  return (
    <Text maxFontSizeMultiplier={1.4} style={styles.label}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: 10,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: overviewColors.textPrimary,
  },
});

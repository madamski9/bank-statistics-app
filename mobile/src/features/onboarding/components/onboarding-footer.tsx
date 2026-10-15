import { SymbolView } from 'expo-symbols';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScalePressable } from '@/features/app-shell/motion/scale-pressable';
import { overviewColors, overviewSpacing } from '@/features/app-shell/theme/overview-theme';

import { onboardingColors } from '../onboarding-motion';

export interface FooterAction {
  key: string;
  label: string;
  disabled?: boolean;
  busy?: boolean;
  onPress: () => void;
}

interface PrimaryAction {
  label: string;
  isBusy: boolean;
  isDisabled: boolean;
  onPress: () => void;
}

interface OnboardingFooterProps {
  error: string | null;
  primary: PrimaryAction | null;
  secondaryActions: FooterAction[];
}

export function OnboardingFooter({ error, primary, secondaryActions }: OnboardingFooterProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) + 12, paddingLeft: Math.max(insets.left, 20), paddingRight: Math.max(insets.right, 20) }]}>
      {error !== null ? (
        <Text accessibilityLiveRegion="polite" style={styles.error}>
          {error}
        </Text>
      ) : null}
      {primary !== null ? (
        <ScalePressable
          accessibilityRole="button"
          accessibilityState={{ disabled: primary.isDisabled, busy: primary.isBusy }}
          containerStyle={primary.isDisabled && styles.disabled}
          disabled={primary.isDisabled}
          onPress={primary.onPress}
          style={styles.primaryButton}
        >
          <Text style={styles.primaryLabel}>{primary.label}</Text>
          {primary.isBusy ? (
            <ActivityIndicator color={overviewColors.background} size="small" />
          ) : (
            <SymbolView
              name={{ ios: 'arrow.right', android: 'arrow_forward', web: 'arrow_forward' }}
              size={18}
              tintColor={overviewColors.background}
            />
          )}
        </ScalePressable>
      ) : null}
      {secondaryActions.map((action) => (
        <ScalePressable
          accessibilityRole="button"
          accessibilityState={{ disabled: action.disabled === true, busy: action.busy }}
          disabled={action.disabled}
          key={action.key}
          onPress={action.onPress}
          style={styles.secondaryButton}
        >
          <Text style={styles.secondaryLabel}>{action.label}</Text>
        </ScalePressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    width: '100%',
    maxWidth: 580,
    alignSelf: 'center',
    gap: 8,
    paddingHorizontal: overviewSpacing.gutter,
    paddingTop: 12,
    backgroundColor: overviewColors.background,
  },
  primaryButton: {
    minHeight: 56,
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 12,
    borderRadius: 18,
    backgroundColor: onboardingColors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  primaryLabel: {
    flexShrink: 1,
    color: overviewColors.background,
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryLabel: {
    textAlign: 'center',
    color: overviewColors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  disabled: { opacity: 0.4 },
  error: { color: overviewColors.negative, fontSize: 14, lineHeight: 20 },
});

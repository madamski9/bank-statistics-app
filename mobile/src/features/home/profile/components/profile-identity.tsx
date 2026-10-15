import { StyleSheet, Text, View } from 'react-native';

import { overviewColors } from '@/features/app-shell/theme/overview-theme';

interface ProfileIdentityProps {
  initial: string;
  name: string;
  email: string;
}

export function ProfileIdentity({ initial, name, email }: ProfileIdentityProps) {
  return (
    <View style={styles.identity}>
      <View style={styles.avatar}>
        <Text maxFontSizeMultiplier={1.3} style={styles.avatarInitial}>
          {initial}
        </Text>
      </View>
      <View style={styles.identityCopy}>
        <Text maxFontSizeMultiplier={1.35} numberOfLines={1} style={styles.name}>
          {name}
        </Text>
        <Text maxFontSizeMultiplier={1.5} numberOfLines={1} style={styles.email}>
          {email}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatar: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 36,
    backgroundColor: overviewColors.surfacePressed,
  },
  avatarInitial: {
    fontSize: 30,
    fontWeight: '600',
    letterSpacing: -0.4,
    color: overviewColors.textPrimary,
  },
  identityCopy: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
    color: overviewColors.textPrimary,
  },
  email: {
    fontSize: 14,
    color: overviewColors.textSecondary,
  },
});

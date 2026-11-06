import { useUser } from '@clerk/expo';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { useCopy } from '@/features/app-shell/localization/language';
import { overviewColors, overviewSpacing } from '@/features/app-shell/theme/overview-theme';

import { accountDataCopy } from '../../account-data-copy';
import { appleSignInSupportUrl } from '../../account-links';
import { signsInWithApple } from '../apple-sign-in';

export function AppleDisconnectNotice() {
  const copy = useCopy(accountDataCopy);
  const { user } = useUser();

  if (!signsInWithApple(user?.externalAccounts)) {
    return null;
  }

  return (
    <View style={styles.notice}>
      <Text maxFontSizeMultiplier={1.4} style={styles.title}>
        {copy.appleTitle}
      </Text>
      <Text maxFontSizeMultiplier={1.5} style={styles.body}>
        {copy.appleBody}
      </Text>
      <Pressable
        accessibilityRole="link"
        onPress={() => void Linking.openURL(appleSignInSupportUrl)}
        style={({ pressed }) => [styles.link, pressed ? styles.pressed : null]}
      >
        <Text maxFontSizeMultiplier={1.4} style={styles.linkLabel}>
          {copy.appleHelp}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: {
    gap: 8,
    padding: overviewSpacing.block,
    borderRadius: 18,
    backgroundColor: overviewColors.surface,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: overviewColors.textPrimary,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    color: overviewColors.textSecondary,
  },
  link: {
    minHeight: 44,
    justifyContent: 'center',
  },
  linkLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: overviewColors.positive,
  },
  pressed: {
    opacity: 0.6,
  },
});

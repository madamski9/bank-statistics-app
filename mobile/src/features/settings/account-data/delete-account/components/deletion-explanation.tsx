import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { useCopy } from '@/features/app-shell/localization/language';
import { overviewColors, overviewSpacing } from '@/features/app-shell/theme/overview-theme';

import { accountDataCopy } from '../../account-data-copy';
import { subscriptionManagementUrl } from '../../account-links';
import { AppleDisconnectNotice } from './apple-disconnect-notice';
import { DangerButton } from './danger-button';
import { deletionStyles } from './deletion-styles';

export function DeletionExplanation({ onContinue }: { onContinue: () => void }) {
  const copy = useCopy(accountDataCopy);

  return (
    <View style={deletionStyles.block}>
      <Text maxFontSizeMultiplier={1.5} style={deletionStyles.body}>
        {copy.deleteBody}
      </Text>
      <Text maxFontSizeMultiplier={1.5} style={deletionStyles.body}>
        {copy.deleteExportHint}
      </Text>
      <View style={styles.notice}>
        <Text maxFontSizeMultiplier={1.4} style={styles.noticeTitle}>
          {copy.subscriptionTitle}
        </Text>
        <Text maxFontSizeMultiplier={1.5} style={styles.noticeBody}>
          {copy.subscriptionBody}
        </Text>
        <Pressable
          accessibilityRole="link"
          onPress={() => void Linking.openURL(subscriptionManagementUrl)}
          style={({ pressed }) => [styles.link, pressed ? styles.pressed : null]}
        >
          <Text maxFontSizeMultiplier={1.4} style={styles.linkLabel}>
            {copy.manageSubscriptions}
          </Text>
        </Pressable>
      </View>
      <AppleDisconnectNotice />
      <DangerButton label={copy.continue} onPress={onContinue} />
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
  noticeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: overviewColors.textPrimary,
  },
  noticeBody: {
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

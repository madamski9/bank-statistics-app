import { useAuth } from '@clerk/expo';
import { useConvex } from 'convex/react';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { SettingsSwitch } from '@/features/app-shell/controls/settings-switch';
import { useCopy } from '@/features/app-shell/localization/language';
import { overviewColors, overviewSpacing } from '@/features/app-shell/theme/overview-theme';

import { setCloudSyncEnabled, useCloudSyncEnabled } from './cloud-sync-preference';
import { keepDataOnThisDeviceOnly } from './delete-cloud-copy';
import { cloudSyncCopy } from '../sync-copy';

export function CloudSyncSection() {
  const copy = useCopy(cloudSyncCopy);
  const convex = useConvex();
  const { userId } = useAuth();
  const isEnabled = useCloudSyncEnabled();
  const [status, setStatus] = useState<'idle' | 'deleting' | 'failed'>('idle');

  const turnOff = () => {
    Alert.alert(copy.offTitle, copy.offBody, [
      { style: 'cancel', text: copy.cancel },
      { text: copy.keepCloudCopy, onPress: () => void setCloudSyncEnabled(false) },
      {
        style: 'destructive',
        text: copy.deleteCloudCopy,
        onPress: () => {
          if (userId == null) {
            return;
          }

          setStatus('deleting');
          void keepDataOnThisDeviceOnly(convex, userId)
            .then(() => setStatus('idle'))
            .catch(() => setStatus('failed'));
        },
      },
    ]);
  };

  const footnote =
    status === 'deleting'
      ? copy.deleting
      : status === 'failed'
        ? copy.failed
        : isEnabled === true
          ? copy.onFootnote
          : copy.offFootnote;

  return (
    <View style={styles.section}>
      <Text maxFontSizeMultiplier={1.4} style={styles.sectionLabel}>
        {copy.section}
      </Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <Text maxFontSizeMultiplier={1.4} style={styles.rowLabel}>
            {copy.label}
          </Text>
          <SettingsSwitch
            isDisabled={isEnabled === null || status === 'deleting'}
            label={copy.label}
            onValueChange={(next) => (next ? void setCloudSyncEnabled(true) : turnOff())}
            value={isEnabled === true}
          />
        </View>
      </View>
      <Text
        accessibilityLiveRegion="polite"
        maxFontSizeMultiplier={1.5}
        style={[styles.footnote, status === 'failed' ? styles.error : null]}
      >
        {footnote}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: overviewSpacing.tight,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.6,
    color: overviewColors.textSecondary,
  },
  card: {
    overflow: 'hidden',
    borderRadius: 18,
    backgroundColor: overviewColors.surface,
  },
  row: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: overviewSpacing.block,
  },
  rowLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: overviewColors.textPrimary,
  },
  footnote: {
    fontSize: 13,
    lineHeight: 18,
    color: overviewColors.textSecondary,
  },
  error: {
    color: overviewColors.negative,
  },
});

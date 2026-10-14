import { useCallback, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LoadingScreen } from '@/features/brand/loading-screen';

import { useCopy } from '@/features/localization/language';
import { overviewColors, overviewSpacing } from '@/features/spending-overview/overview-theme';

import { setCloudSyncEnabled, useCloudSyncChoice } from './cloud-sync-preference';
import { cloudSyncChoiceCopy } from './sync-copy';

interface CloudSyncChoiceGateProps {
  children: ReactNode;
}

export function CloudSyncChoiceGate({ children }: CloudSyncChoiceGateProps) {
  const choice = useCloudSyncChoice();

  if (choice === 'loading') {
    return <LoadingScreen />;
  }

  return choice === 'undecided' ? <CloudSyncChoiceScreen /> : children;
}

function CloudSyncChoiceScreen() {
  const copy = useCopy(cloudSyncChoiceCopy);
  const insets = useSafeAreaInsets();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const choose = useCallback(
    async (isEnabled: boolean) => {
      setError(null);
      setIsSaving(true);

      try {
        await setCloudSyncEnabled(isEnabled);
      } catch {
        setError(copy.saveFailed);
        setIsSaving(false);
      }
    },
    [copy.saveFailed],
  );

  return (
    <ScrollView
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 48, paddingBottom: insets.bottom + overviewSpacing.block },
      ]}
      style={styles.screen}
    >
      <View style={styles.copy}>
        <Text accessibilityRole="header" maxFontSizeMultiplier={1.35} style={styles.title}>
          {copy.title}
        </Text>
        <Text maxFontSizeMultiplier={1.5} style={styles.body}>
          {copy.body}
        </Text>
        <View style={styles.option}>
          <Text maxFontSizeMultiplier={1.4} style={styles.optionTitle}>
            {copy.syncedTitle}
          </Text>
          <Text maxFontSizeMultiplier={1.5} style={styles.optionBody}>
            {copy.syncedBody}
          </Text>
        </View>
        <View style={styles.option}>
          <Text maxFontSizeMultiplier={1.4} style={styles.optionTitle}>
            {copy.localTitle}
          </Text>
          <Text maxFontSizeMultiplier={1.5} style={styles.optionBody}>
            {copy.localBody}
          </Text>
        </View>
      </View>

      {error !== null ? (
        <Text accessibilityLiveRegion="polite" maxFontSizeMultiplier={1.5} style={styles.error}>
          {error}
        </Text>
      ) : null}

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          disabled={isSaving}
          onPress={() => void choose(true)}
          style={({ pressed }) => [styles.primary, pressed ? styles.pressed : null]}
        >
          {isSaving ? (
            <ActivityIndicator color={overviewColors.background} />
          ) : (
            <Text maxFontSizeMultiplier={1.4} style={styles.primaryLabel}>
              {copy.enable}
            </Text>
          )}
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={isSaving}
          onPress={() => void choose(false)}
          style={({ pressed }) => [styles.secondary, pressed ? styles.pressed : null]}
        >
          <Text maxFontSizeMultiplier={1.4} style={styles.secondaryLabel}>
            {copy.keepLocal}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: overviewColors.background,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'space-between',
    gap: 32,
    paddingHorizontal: overviewSpacing.gutter,
  },
  copy: {
    gap: 14,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
    color: overviewColors.textPrimary,
  },
  body: {
    fontSize: 16,
    lineHeight: 23,
    color: overviewColors.textSecondary,
  },
  option: {
    gap: 6,
    padding: overviewSpacing.block,
    borderRadius: 18,
    backgroundColor: overviewColors.surface,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: overviewColors.textPrimary,
  },
  optionBody: {
    fontSize: 14,
    lineHeight: 20,
    color: overviewColors.textSecondary,
  },
  error: {
    fontSize: 13,
    lineHeight: 18,
    color: overviewColors.negative,
  },
  actions: {
    gap: 12,
  },
  primary: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: overviewColors.textPrimary,
  },
  primaryLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: overviewColors.background,
  },
  secondary: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: overviewColors.surfacePressed,
  },
  secondaryLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: overviewColors.textPrimary,
  },
  pressed: {
    opacity: 0.6,
  },
});

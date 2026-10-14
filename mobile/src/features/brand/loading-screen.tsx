import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { defineCopy, useCopy } from '@/features/localization/language';

import { brandColors, brandName } from './brand-artwork';
import { BrandMark } from './brand-mark';

const loadingCopy = defineCopy({
  pl: {
    loading: 'Przygotowujemy aplikację…',
  },
  en: {
    loading: 'Getting things ready…',
  },
});

export function LoadingScreen() {
  const copy = useCopy(loadingCopy);
  const reduceMotion = useReducedMotion();

  return (
    <ScrollView bounces={false} contentContainerStyle={styles.content} style={styles.screen}>
      <StatusBar style="light" />
      <View style={styles.identity}>
        <BrandMark />
        <Text accessibilityRole="header" style={styles.name}>{brandName}</Text>
      </View>
      <View accessibilityRole="progressbar" accessibilityLabel={copy.loading} accessibilityState={{ busy: true }} style={styles.status}>
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.indicator}>
          {reduceMotion ? <View style={styles.stillIndicator} /> : <ActivityIndicator color={brandColors.mint} size="small" />}
        </View>
        <Text style={styles.statusLabel}>{copy.loading}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: brandColors.background,
  },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
    gap: 48,
  },
  identity: {
    alignItems: 'center',
    maxWidth: 440,
    gap: 12,
  },
  name: {
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: -1.5,
    color: brandColors.foreground,
    textAlign: 'center',
  },
  status: {
    alignItems: 'center',
    gap: 12,
  },
  indicator: {
    height: 20,
    justifyContent: 'center',
  },
  stillIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: brandColors.mint,
  },
  statusLabel: {
    fontSize: 13,
    lineHeight: 20,
    color: brandColors.secondary,
    textAlign: 'center',
  },
});

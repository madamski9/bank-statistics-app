import type { IngestionRecord } from '@bankstats/ingestion-native';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { shareTransactionExport } from '@/features/data-export/share-export';
import type { ExportFormat } from '@/features/data-export/transaction-export';
import type { FinancialAccount } from '@/features/financial-accounts/financial-account';
import { formatTransactionCount } from '@/features/spending-overview/formatting';
import { overviewColors, overviewSpacing } from '@/features/spending-overview/overview-theme';

import { DeleteAccountScreen } from './delete-account-screen';
import { DevicesSection } from './devices-section';

interface DataScreenProps {
  records: IngestionRecord[];
  accounts: FinancialAccount[];
  onClose: () => void;
}

const exportLabels: Record<ExportFormat, string> = {
  csv: 'Eksportuj do CSV',
  json: 'Eksportuj do JSON',
};

export function DataScreen({ records, accounts, onClose }: DataScreenProps) {
  const insets = useSafeAreaInsets();
  const [isDeleting, setIsDeleting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const exportAs = (format: ExportFormat) => {
    setExportError(null);
    void shareTransactionExport(format, records, accounts).catch(() =>
      setExportError('Nie udało się przygotować pliku. Spróbuj ponownie.'),
    );
  };

  return (
    <View style={[styles.screen, styles.sheetTop]}>
      <View style={styles.header}>
        <Text accessibilityRole="header" maxFontSizeMultiplier={1.35} style={styles.title}>
          Twoje dane
        </Text>
        <Pressable
          accessibilityLabel="Zamknij"
          accessibilityRole="button"
          hitSlop={8}
          onPress={onClose}
          style={({ pressed }) => [styles.closeButton, pressed ? styles.pressed : null]}
        >
          <SymbolView
            name={{ ios: 'xmark', android: 'close', web: 'close' }}
            size={18}
            tintColor={overviewColors.textPrimary}
          />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text maxFontSizeMultiplier={1.4} style={styles.sectionLabel}>
            EKSPORT
          </Text>
          <View style={styles.card}>
            {(['csv', 'json'] as const).map((format) => (
              <Pressable
                accessibilityHint="Otwiera arkusz udostępniania z plikiem"
                accessibilityRole="button"
                key={format}
                onPress={() => exportAs(format)}
                style={({ pressed }) => [styles.row, pressed ? styles.rowPressed : null]}
              >
                <Text maxFontSizeMultiplier={1.4} style={styles.rowLabel}>
                  {exportLabels[format]}
                </Text>
                <SymbolView
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                  name={{ ios: 'square.and.arrow.up', android: 'share', web: 'share' }}
                  size={17}
                  tintColor={overviewColors.textSecondary}
                />
              </Pressable>
            ))}
          </View>
          <Text maxFontSizeMultiplier={1.5} style={styles.footnote}>
            {exportError ??
              `${formatTransactionCount(records.length)} z tego telefonu, z kontem, kategorią i statusem. Bez treści powiadomień bankowych.`}
          </Text>
        </View>

        <View style={styles.section}>
          <Text maxFontSizeMultiplier={1.4} style={styles.sectionLabel}>
            URZĄDZENIA
          </Text>
          <View style={styles.card}>
            <DevicesSection />
          </View>
          <Text maxFontSizeMultiplier={1.5} style={styles.footnote}>
            Odłącz telefon, którego już nie używasz albo który zgubiłeś.
          </Text>
        </View>

        <View style={styles.section}>
          <Text maxFontSizeMultiplier={1.4} style={styles.sectionLabel}>
            KONTO
          </Text>
          <View style={styles.card}>
            <Pressable
              accessibilityRole="button"
              onPress={() => setIsDeleting(true)}
              style={({ pressed }) => [styles.row, pressed ? styles.rowPressed : null]}
            >
              <Text maxFontSizeMultiplier={1.4} style={styles.dangerLabel}>
                Usuń konto
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <Modal
        animationType="slide"
        onRequestClose={() => setIsDeleting(false)}
        presentationStyle="fullScreen"
        visible={isDeleting}
      >
        <DeleteAccountScreen onCancel={() => setIsDeleting(false)} />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  sheetTop: {
    paddingTop: 14,
  },
  screen: {
    flex: 1,
    backgroundColor: overviewColors.background,
  },
  header: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: overviewSpacing.gutter,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
    color: overviewColors.textPrimary,
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: overviewColors.surfacePressed,
  },
  content: {
    gap: overviewSpacing.section,
    paddingHorizontal: overviewSpacing.gutter,
    paddingTop: overviewSpacing.block,
  },
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
    paddingHorizontal: overviewSpacing.block,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: overviewColors.hairline,
  },
  rowPressed: {
    backgroundColor: overviewColors.surfacePressed,
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: overviewColors.textPrimary,
  },
  dangerLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: overviewColors.negative,
  },
  footnote: {
    fontSize: 13,
    lineHeight: 18,
    color: overviewColors.textSecondary,
  },
  pressed: {
    opacity: 0.6,
  },
});

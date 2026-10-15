import type { IngestionRecord } from '@bankstats/ingestion-native';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCopy } from '@/features/app-shell/localization/language';
import { overviewColors, overviewSpacing } from '@/features/app-shell/theme/overview-theme';
import type { FinancialAccount } from '@/features/data/financial-accounts/financial-account';
import { CloudSyncSection } from '@/features/data/sync/cloud-sync/cloud-sync-section';
import { statementImportCopy } from '@/features/settings/statement-import/statement-import-copy';
import { StatementImportScreen } from '@/features/settings/statement-import/statement-import-screen';

import { accountDataCopy } from './account-data-copy';
import { DataRow, DataSection } from './components/data-section';
import { ExportSection } from './components/export-section';
import { FullScreenSheet } from './components/full-screen-sheet';
import { DeleteAccountScreen } from './delete-account/delete-account-screen';
import { DevicesSection } from './devices/devices-section';

interface DataScreenProps {
  records: IngestionRecord[];
  accounts: FinancialAccount[];
  onRecordsChanged: () => void | Promise<void>;
  onClose: () => void;
}

export function DataScreen({ records, accounts, onRecordsChanged, onClose }: DataScreenProps) {
  const insets = useSafeAreaInsets();
  const copy = useCopy(accountDataCopy);
  const importCopy = useCopy(statementImportCopy);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  return (
    <View style={[styles.screen, styles.sheetTop]}>
      <View style={styles.header}>
        <Text accessibilityRole="header" maxFontSizeMultiplier={1.35} style={styles.title}>
          {copy.title}
        </Text>
        <Pressable
          accessibilityLabel={copy.close}
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
        <ExportSection accounts={accounts} records={records} />

        <DataSection footnote={importCopy.entryFootnote} label={copy.importSection}>
          <DataRow
            accessibilityHint={importCopy.entryHint}
            label={importCopy.entryLabel}
            onPress={() => setIsImporting(true)}
            symbol={{ ios: 'square.and.arrow.down', android: 'download', web: 'download' }}
          />
        </DataSection>

        <CloudSyncSection />

        <DataSection footnote={copy.devicesFootnote} label={copy.devicesSection}>
          <DevicesSection />
        </DataSection>

        <DataSection label={copy.accountSection}>
          <DataRow label={copy.deleteAccount} onPress={() => setIsDeleting(true)} tone="danger" />
        </DataSection>
      </ScrollView>

      <FullScreenSheet onClose={() => setIsDeleting(false)} visible={isDeleting}>
        <DeleteAccountScreen onCancel={() => setIsDeleting(false)} />
      </FullScreenSheet>

      <FullScreenSheet onClose={() => setIsImporting(false)} visible={isImporting}>
        <StatementImportScreen
          accounts={accounts}
          onClose={() => setIsImporting(false)}
          onImported={onRecordsChanged}
          records={records}
        />
      </FullScreenSheet>
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
  pressed: {
    opacity: 0.6,
  },
});

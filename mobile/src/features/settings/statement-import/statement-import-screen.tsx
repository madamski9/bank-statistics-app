import type { IngestionRecord } from '@bankstats/ingestion-native';
import { SymbolView } from 'expo-symbols';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCopy } from '@/features/app-shell/localization/language';
import { overviewColors, overviewSpacing } from '@/features/app-shell/theme/overview-theme';
import type { FinancialAccount } from '@/features/data/financial-accounts/financial-account';

import { PrimaryImportButton } from './components/import-buttons';
import { importStyles } from './components/import-styles';
import { ReconciliationReview } from './components/reconciliation-review';
import { statementImportCopy } from './statement-import-copy';
import { useStatementImport } from './use-statement-import';

interface StatementImportScreenProps {
  records: IngestionRecord[];
  accounts: FinancialAccount[];
  onImported: () => void | Promise<void>;
  onClose: () => void;
}

export function StatementImportScreen({
  records,
  accounts,
  onImported,
  onClose,
}: StatementImportScreenProps) {
  const insets = useSafeAreaInsets();
  const copy = useCopy(statementImportCopy);
  const { state, choose, toggle, addSelected, reset } = useStatementImport(records, accounts, onImported);

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 14 }]}>
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
        {state.step === 'idle' || state.step === 'failed' ? (
          <>
            <Text maxFontSizeMultiplier={1.5} style={importStyles.body}>
              {copy.intro}
            </Text>
            {state.step === 'failed' ? (
              <Text accessibilityRole="alert" maxFontSizeMultiplier={1.5} style={styles.problem}>
                {copy.problems[state.problem]}
              </Text>
            ) : null}
            <PrimaryImportButton label={copy.choose} onPress={() => void choose()} />
          </>
        ) : null}

        {state.step === 'reading' ? (
          <View style={styles.reading}>
            <ActivityIndicator color={overviewColors.textSecondary} />
            <Text maxFontSizeMultiplier={1.5} style={importStyles.body}>
              {copy.reading}
            </Text>
          </View>
        ) : null}

        {state.step === 'reviewing' ? (
          <ReconciliationReview
            onAdd={() => void addSelected()}
            onChooseAnother={() => {
              reset();
              void choose();
            }}
            onToggle={toggle}
            state={state}
          />
        ) : null}

        {state.step === 'finished' ? (
          <>
            <Text maxFontSizeMultiplier={1.5} style={importStyles.body}>
              {copy.added(state.addedCount)}
            </Text>
            <PrimaryImportButton label={copy.done} onPress={onClose} />
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
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
  problem: {
    fontSize: 15,
    lineHeight: 21,
    color: overviewColors.caution,
  },
  reading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: overviewSpacing.row,
  },
  pressed: {
    opacity: 0.6,
  },
});

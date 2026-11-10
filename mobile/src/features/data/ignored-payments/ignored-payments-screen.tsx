import { useAndroidBack } from '@/features/app-shell/sheet/sheet-modal';
import type { IngestionRecord } from '@bankstats/ingestion-native';
import { useMemo, useState } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';

import { selectionChanged } from '@/haptics';

import { IgnoreChoice, type IgnoreChoiceTarget } from './ignore-choice/ignore-choice';
import { historyCount, type IgnoreMatch, type IgnoreRule, type IgnoreTarget } from './ignore-rule';
import { PickerView } from './picker-view/picker-view';
import { RulesView } from './rules-view/rules-view';

type ScreenView = 'rules' | 'picker';

interface IgnoredPaymentsScreenProps {
  records: IngestionRecord[];
  rules: IgnoreRule[];
  onIgnore: (rule: IgnoreRule) => Promise<void>;
  onStopIgnoring: (target: IgnoreTarget) => Promise<void>;
  onClose: () => void;
}

export function IgnoredPaymentsScreen({
  records,
  rules,
  onIgnore,
  onStopIgnoring,
  onClose,
}: IgnoredPaymentsScreenProps) {
  const [view, setView] = useState<ScreenView>('rules');
  const [hasNavigated, setHasNavigated] = useState(false);
  const [choice, setChoice] = useState<IgnoreChoiceTarget | null>(null);
  const now = useMemo(() => new Date(), []);

  const openPicker = () => {
    selectionChanged();
    setHasNavigated(true);
    setView('picker');
  };

  const backToRules = () => {
    setHasNavigated(true);
    setView('rules');
  };

  useAndroidBack(backToRules, view === 'picker');

  const openChoice = (target: IgnoreTarget, rule: IgnoreRule | null, match: IgnoreMatch = 'exact') => {
    Keyboard.dismiss();
    selectionChanged();
    setChoice({
      kind: target.kind,
      name: target.name,
      match,
      rule,
      historyCount: historyCount(records, target, match),
    });
  };

  return (
    <View style={styles.fill}>
      {view === 'picker' ? (
        <PickerView
          now={now}
          onBack={backToRules}
          onClose={onClose}
          onPick={(target, match) => openChoice(target, null, match)}
          records={records}
          rules={rules}
        />
      ) : (
        <RulesView
          isReturning={hasNavigated}
          now={now}
          onAdd={openPicker}
          onClose={onClose}
          onSelectRule={(rule) => openChoice(rule, rule, rule.match)}
          rules={rules}
        />
      )}
      <IgnoreChoice
        onDismiss={() => setChoice(null)}
        onDone={() => {
          setChoice(null);
          backToRules();
        }}
        onIgnore={onIgnore}
        onStopIgnoring={onStopIgnoring}
        target={choice}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});

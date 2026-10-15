import { StyleSheet, View } from 'react-native';

import { overviewColors } from '@/features/app-shell/theme/overview-theme';
import { AmountText } from '@/features/settings/privacy/amounts/amount-text';

import type { DetailRow } from '../use-detail-rows';

export function DetailRowsCard({ rows }: { rows: DetailRow[] }) {
  return (
    <View style={styles.card}>
      {rows.map((detail, index) => (
        <View key={detail.label}>
          {index > 0 ? <View style={styles.separator} /> : null}
          <View accessible style={styles.field}>
            <AmountText maxFontSizeMultiplier={1.4} style={styles.fieldLabel}>
              {detail.label}
            </AmountText>
            <AmountText maxFontSizeMultiplier={1.4} numberOfLines={2} style={styles.fieldValue}>
              {detail.value}
            </AmountText>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: overviewColors.hairline,
    backgroundColor: overviewColors.surface,
  },
  separator: {
    marginLeft: 14,
    height: StyleSheet.hairlineWidth,
    backgroundColor: overviewColors.hairline,
  },
  field: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  fieldLabel: {
    width: 86,
    fontSize: 14,
    color: overviewColors.textSecondary,
  },
  fieldValue: {
    flex: 1,
    fontSize: 15,
    textAlign: 'right',
    color: overviewColors.textPrimary,
  },
});

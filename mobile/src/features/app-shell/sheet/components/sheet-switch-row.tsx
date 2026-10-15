import { Switch, Text, View } from 'react-native';

import { overviewColors } from '@/features/app-shell/theme/overview-theme';
import { AmountText } from '@/features/settings/privacy/amounts/amount-text';

import { sheetRowStyles } from './sheet-row-styles';

interface SheetSwitchRowProps {
  label: string;
  detail?: string;
  value: boolean;
  disabled?: boolean;
  isFirst?: boolean;
  onChange: (value: boolean) => void;
}

export function SheetSwitchRow({
  label,
  detail,
  value,
  disabled = false,
  isFirst = false,
  onChange,
}: SheetSwitchRowProps) {
  return (
    <View style={[sheetRowStyles.row, isFirst ? null : sheetRowStyles.rowDivider]}>
      <View style={sheetRowStyles.rowCopy}>
        <AmountText maxFontSizeMultiplier={1.4} style={sheetRowStyles.rowLabel}>
          {label}
        </AmountText>
        {detail !== undefined ? (
          <Text maxFontSizeMultiplier={1.4} style={sheetRowStyles.rowDetail}>
            {detail}
          </Text>
        ) : null}
      </View>
      <Switch
        accessibilityLabel={label}
        disabled={disabled}
        onValueChange={onChange}
        trackColor={{ true: overviewColors.positive, false: overviewColors.surfacePressed }}
        value={value}
      />
    </View>
  );
}

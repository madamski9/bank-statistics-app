import { Host, Toggle } from '@expo/ui/swift-ui';
import { accessibilityHint, disabled, labelsHidden, tint } from '@expo/ui/swift-ui/modifiers';
import { Platform, Switch } from 'react-native';

import { overviewColors } from '@/features/app-shell/theme/overview-theme';

interface SettingsSwitchProps {
  value: boolean;
  label: string;
  hint?: string;
  isDisabled?: boolean;
  onValueChange: (value: boolean) => void;
}

export function SettingsSwitch({ value, label, hint, isDisabled = false, onValueChange }: SettingsSwitchProps) {
  if (Platform.OS !== 'ios') {
    return (
      <Switch
        accessibilityHint={hint}
        accessibilityLabel={label}
        disabled={isDisabled}
        onValueChange={onValueChange}
        trackColor={{ true: overviewColors.positive, false: overviewColors.surfacePressed }}
        value={value}
      />
    );
  }

  return (
    <Host matchContents>
      <Toggle
        isOn={value}
        label={label}
        modifiers={[
          labelsHidden(),
          tint(overviewColors.positive),
          disabled(isDisabled),
          ...(hint === undefined ? [] : [accessibilityHint(hint)]),
        ]}
        onIsOnChange={onValueChange}
      />
    </Host>
  );
}

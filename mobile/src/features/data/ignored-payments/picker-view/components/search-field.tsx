import { SymbolView } from 'expo-symbols';
import { StyleSheet, TextInput, View } from 'react-native';

import { overviewColors } from '@/features/app-shell/theme/overview-theme';

interface SearchFieldProps {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}

export function SearchField({ value, placeholder, onChange }: SearchFieldProps) {
  return (
    <View style={styles.searchField}>
      <SymbolView
        accessibilityElementsHidden
        importantForAccessibility="no"
        name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }}
        size={17}
        tintColor={overviewColors.textSecondary}
      />
      <TextInput
        accessibilityLabel={placeholder}
        autoCorrect={false}
        autoFocus
        clearButtonMode="while-editing"
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={overviewColors.textSecondary}
        returnKeyType="search"
        selectionColor={overviewColors.textPrimary}
        style={styles.searchInput}
        value={value}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  searchField: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 14,
    borderRadius: 14,
    backgroundColor: overviewColors.surfacePressed,
  },
  searchInput: {
    flex: 1,
    minHeight: 48,
    paddingRight: 14,
    fontSize: 17,
    color: overviewColors.textPrimary,
  },
});

import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { bubbleTints, overviewColors, overviewSpacing } from '@/features/app-shell/theme/overview-theme';

import { languageNames, useCopy, type Language } from '../../language';
import { languageScreenCopy } from '../language-screen-copy';

const languageBadges: Record<Language, string> = {
  pl: 'PL',
  en: 'EN',
};

const accent = bubbleTints.net.film;

interface LanguageOptionProps {
  language: Language;
  isSelected: boolean;
  isFirst: boolean;
  onSelect: () => void;
}

export function LanguageOption({ language, isSelected, isFirst, onSelect }: LanguageOptionProps) {
  const copy = useCopy(languageScreenCopy);

  return (
    <Pressable
      accessibilityLabel={`${languageNames[language]}, ${copy.translated[language]}`}
      accessibilityRole="radio"
      accessibilityState={{ checked: isSelected }}
      onPress={onSelect}
      style={({ pressed }) => [
        styles.option,
        isFirst ? null : styles.optionDivided,
        pressed ? styles.optionPressed : null,
      ]}
    >
      <View
        accessibilityElementsHidden
        importantForAccessibility="no"
        style={[styles.badge, isSelected ? styles.badgeSelected : null]}
      >
        <Text maxFontSizeMultiplier={1.2} style={[styles.badgeLabel, isSelected ? styles.badgeLabelSelected : null]}>
          {languageBadges[language]}
        </Text>
      </View>
      <View style={styles.optionCopy}>
        <Text maxFontSizeMultiplier={1.4} style={styles.optionName}>
          {languageNames[language]}
        </Text>
        <Text maxFontSizeMultiplier={1.4} style={styles.optionDetail}>
          {isSelected ? copy.selected : copy.translated[language]}
        </Text>
      </View>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no"
        style={[styles.radio, isSelected ? styles.radioSelected : null]}
      >
        {isSelected ? (
          <SymbolView
            name={{ ios: 'checkmark', android: 'check', web: 'check' }}
            size={12}
            tintColor={overviewColors.textPrimary}
            weight="bold"
          />
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  option: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: overviewSpacing.block,
  },
  optionDivided: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: overviewColors.hairline,
  },
  optionPressed: {
    backgroundColor: overviewColors.surfacePressed,
  },
  badge: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: overviewColors.surfacePressed,
  },
  badgeSelected: {
    backgroundColor: accent,
  },
  badgeLabel: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.4,
    color: overviewColors.textSecondary,
  },
  badgeLabelSelected: {
    color: overviewColors.textPrimary,
  },
  optionCopy: {
    flex: 1,
    gap: 2,
  },
  optionName: {
    fontSize: 17,
    fontWeight: '600',
    color: overviewColors.textPrimary,
  },
  optionDetail: {
    fontSize: 13,
    color: overviewColors.textSecondary,
  },
  radio: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: overviewColors.textDisabled,
  },
  radioSelected: {
    borderColor: accent,
    backgroundColor: accent,
  },
});

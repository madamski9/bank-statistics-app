import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { bubbleTints, overviewColors, overviewSpacing } from '@/features/spending-overview/overview-theme';

import { changeLanguage } from './change-language';
import { defineCopy, languageNames, languages, useCopy, useLanguage, type Language } from './language';

const languageScreenCopy = defineCopy({
  pl: {
    title: 'Język',
    subtitle: 'Wybierz język, w którym BankStats pokazuje ekrany, powiadomienia i widżety.',
    close: 'Zamknij',
    translated: { pl: 'Polski', en: 'Angielski' },
    selected: 'Wybrany',
  },
  en: {
    title: 'Language',
    subtitle: 'Choose the language BankStats uses for screens, notifications and widgets.',
    close: 'Close',
    translated: { pl: 'Polish', en: 'English' },
    selected: 'Selected',
  },
});

const languageBadges: Record<Language, string> = {
  pl: 'PL',
  en: 'EN',
};

interface LanguageScreenProps {
  onClose: () => void;
}

export function LanguageScreen({ onClose }: LanguageScreenProps) {
  const copy = useCopy(languageScreenCopy);
  const current = useLanguage();

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

      <View style={styles.content}>
        <Text maxFontSizeMultiplier={1.5} style={styles.subtitle}>
          {copy.subtitle}
        </Text>

        <View accessibilityRole="radiogroup" style={styles.card}>
          {languages.map((language, index) => {
            const isSelected = language === current;

            return (
              <Pressable
                accessibilityLabel={`${languageNames[language]}, ${copy.translated[language]}`}
                accessibilityRole="radio"
                accessibilityState={{ checked: isSelected }}
                key={language}
                onPress={() => {
                  if (!isSelected) {
                    void changeLanguage(language);
                  }
                }}
                style={({ pressed }) => [
                  styles.option,
                  index > 0 ? styles.optionDivided : null,
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
          })}
        </View>
      </View>
    </View>
  );
}

const accent = bubbleTints.net.film;

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
  pressed: {
    opacity: 0.6,
  },
  content: {
    gap: overviewSpacing.section,
    paddingHorizontal: overviewSpacing.gutter,
    paddingTop: overviewSpacing.block,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 21,
    color: overviewColors.textSecondary,
  },
  card: {
    overflow: 'hidden',
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: overviewColors.hairline,
    backgroundColor: overviewColors.surface,
  },
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

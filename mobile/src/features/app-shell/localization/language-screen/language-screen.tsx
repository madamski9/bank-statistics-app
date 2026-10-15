import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { overviewColors, overviewSpacing } from '@/features/app-shell/theme/overview-theme';

import { changeLanguage } from '../change-language';
import { languages, useCopy, useLanguage } from '../language';
import { LanguageOption } from './components/language-option';
import { languageScreenCopy } from './language-screen-copy';

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
              <LanguageOption
                isFirst={index === 0}
                isSelected={isSelected}
                key={language}
                language={language}
                onSelect={() => {
                  if (!isSelected) {
                    void changeLanguage(language);
                  }
                }}
              />
            );
          })}
        </View>
      </View>
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
});

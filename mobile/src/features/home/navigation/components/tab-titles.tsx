import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useCopy } from '@/features/app-shell/localization/language';
import { overviewColors } from '@/features/app-shell/theme/overview-theme';

import { homeCopy } from '@/features/home/home-copy';
import { homeTabs, type HomeTabKey, type PageKey } from '../home-pages';

const navLabelFontSize = 24;
const navFadeWidth = 40;

interface TabTitlesProps {
  page: PageKey;
  onSelect: (page: PageKey) => void;
}

export function TabTitles({ page, onSelect }: TabTitlesProps) {
  const copy = useCopy(homeCopy);
  const [navViewportWidth, setNavViewportWidth] = useState(0);
  const [navRowWidth, setNavRowWidth] = useState(0);
  const [titleOffsets, setTitleOffsets] = useState<Partial<Record<HomeTabKey, number>>>({});
  const navOffset = useSharedValue(0);
  const navLeadingFade = useSharedValue(0);
  const navTrailingFade = useSharedValue(0);

  useEffect(() => {
    const target = titleOffsets[page === 'profile' ? 'merchants' : page];

    if (target === undefined || navViewportWidth === 0 || navRowWidth === 0) {
      return;
    }

    const maximumOffset = Math.max(navRowWidth - navViewportWidth, 0);
    const offset = Math.min(target, maximumOffset);
    const fade = { duration: 220, reduceMotion: ReduceMotion.System };

    navOffset.set(
      withSpring(-offset, { duration: 420, dampingRatio: 0.9, reduceMotion: ReduceMotion.System }),
    );
    navLeadingFade.set(withTiming(offset > 0 ? 1 : 0, fade));
    navTrailingFade.set(withTiming(offset < maximumOffset ? 1 : 0, fade));
  }, [navLeadingFade, navOffset, navRowWidth, navTrailingFade, navViewportWidth, page, titleOffsets]);

  const navRowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: navOffset.get() }],
  }));

  const navLeadingFadeStyle = useAnimatedStyle(() => ({
    opacity: navLeadingFade.get(),
  }));

  const navTrailingFadeStyle = useAnimatedStyle(() => ({
    opacity: navTrailingFade.get(),
  }));

  return (
    <View
      accessibilityRole="tablist"
      onLayout={(event) => setNavViewportWidth(event.nativeEvent.layout.width)}
      style={styles.navViewport}
    >
      <Animated.View
        onLayout={(event) => setNavRowWidth(event.nativeEvent.layout.width)}
        style={[styles.navRow, navRowStyle]}
      >
        {homeTabs.map((tab) => {
          const isActive = tab === page;

          return (
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              hitSlop={8}
              key={tab}
              onLayout={(event) => {
                const { x } = event.nativeEvent.layout;

                setTitleOffsets((current) =>
                  current[tab] === x ? current : { ...current, [tab]: x },
                );
              }}
              onPress={() => onSelect(tab)}
              style={({ pressed }) => [styles.navTab, pressed ? styles.pressed : null]}
            >
              <Text
                maxFontSizeMultiplier={1.4}
                style={[styles.navLabel, isActive ? styles.navLabelActive : null]}
              >
                {copy.tabs[tab]}
              </Text>
            </Pressable>
          );
        })}
      </Animated.View>
      <Animated.View pointerEvents="none" style={[styles.navLeadingFade, navLeadingFadeStyle]} />
      <Animated.View pointerEvents="none" style={[styles.navTrailingFade, navTrailingFadeStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  navViewport: {
    flex: 1,
    overflow: 'hidden',
  },
  navLeadingFade: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: navFadeWidth,
    experimental_backgroundImage: 'linear-gradient(to left, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 1) 100%)',
  },
  navTrailingFade: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: navFadeWidth,
    experimental_backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 1) 100%)',
  },
  navRow: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  navTab: {
    minHeight: 44,
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
  navLabel: {
    fontSize: navLabelFontSize,
    fontWeight: '700',
    letterSpacing: -0.6,
    color: overviewColors.textSecondary,
  },
  navLabelActive: {
    color: overviewColors.textPrimary,
  },
});

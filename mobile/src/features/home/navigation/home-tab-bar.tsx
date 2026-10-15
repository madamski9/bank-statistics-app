import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { overviewSpacing } from '@/features/app-shell/theme/overview-theme';

import { ProfileTabButton } from './components/profile-tab-button';
import { TabTitles } from './components/tab-titles';
import type { PageKey } from './home-pages';

interface HomeTabBarProps {
  page: PageKey;
  onSelect: (page: PageKey) => void;
}

export function HomeTabBar({ page, onSelect }: HomeTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.nav, { paddingTop: insets.top + 12 }]}>
      <TabTitles onSelect={onSelect} page={page} />
      <ProfileTabButton isSelected={page === 'profile'} onPress={() => onSelect('profile')} />
    </View>
  );
}

const styles = StyleSheet.create({
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: overviewSpacing.gutter,
    paddingBottom: overviewSpacing.tight,
  },
});

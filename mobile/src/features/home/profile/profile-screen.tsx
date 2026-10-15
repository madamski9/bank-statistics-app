import { useUser } from '@clerk/expo';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCopy } from '@/features/app-shell/localization/language';
import { overviewColors, overviewSpacing } from '@/features/app-shell/theme/overview-theme';
import type { SyncStatus } from '@/features/data/sync/engine/sync-status';
import { PremiumCard } from '@/features/settings/premium/components/premium-card';
import type { PremiumStatus } from '@/features/settings/premium/use-premium';

import { accountInitial } from './account-identity';
import { AccountSection } from './components/account-section';
import { AppSection, type AppSectionActions } from './components/app-section';
import { ProfileIdentity } from './components/profile-identity';
import { SignOutButton } from './components/sign-out-button';
import { profileCopy } from './profile-copy';

interface ProfileScreenProps extends AppSectionActions {
  onOpenPremium: () => void;
  premium: PremiumStatus | undefined;
  syncStatus: SyncStatus;
}

export function ProfileScreen({ onOpenPremium, premium, syncStatus, ...actions }: ProfileScreenProps) {
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const copy = useCopy(profileCopy);
  const email = user?.primaryEmailAddress?.emailAddress ?? copy.noEmail;
  const name = user?.fullName ?? user?.firstName ?? copy.yourAccount;

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <ProfileIdentity email={email} initial={accountInitial(user)} name={name} />
        <PremiumCard onPress={onOpenPremium} status={premium} />
        <AccountSection email={email} syncStatus={syncStatus} />
        <AppSection {...actions} />
        <SignOutButton />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: overviewColors.background,
  },
  content: {
    gap: 28,
    paddingHorizontal: overviewSpacing.gutter,
    paddingTop: overviewSpacing.tight,
  },
});

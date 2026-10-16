import { languageNames, useCopy, useLanguage } from '@/features/app-shell/localization/language';
import {
  replayFocusAnnouncement,
  replayOnboarding,
  replayShortcutsSetup,
} from '@/features/onboarding/onboarding-replay';

import { profileCopy } from '../profile-copy';
import { ProfileActionRow, ProfileSection } from './profile-rows';

export interface AppSectionActions {
  onOpenAlerts: () => void;
  onOpenCaptureHealth: () => void;
  onOpenCategories: () => void;
  onOpenEventHistory: () => void;
  onOpenData: () => void;
  onOpenPrivacy: () => void;
  onOpenLanguage: () => void;
}

export function AppSection({
  onOpenAlerts,
  onOpenCaptureHealth,
  onOpenCategories,
  onOpenEventHistory,
  onOpenData,
  onOpenPrivacy,
  onOpenLanguage,
}: AppSectionActions) {
  const copy = useCopy(profileCopy);
  const language = useLanguage();

  return (
    <ProfileSection label={copy.appSection}>
      <ProfileActionRow
        accessibilityHint={copy.alertsHint}
        label={copy.alerts}
        onPress={onOpenAlerts}
        symbol={{ ios: 'bell.badge', android: 'notifications', web: 'notifications' }}
      />
      <ProfileActionRow
        accessibilityHint={copy.eventHistoryHint}
        label={copy.eventHistory}
        onPress={onOpenEventHistory}
        symbol={{ ios: 'clock.arrow.circlepath', android: 'history', web: 'history' }}
      />
      <ProfileActionRow
        accessibilityHint={copy.categoriesHint}
        label={copy.categories}
        onPress={onOpenCategories}
        symbol={{ ios: 'tag', android: 'sell', web: 'sell' }}
      />
      <ProfileActionRow
        accessibilityHint={copy.captureHealthHint}
        label={copy.captureHealth}
        onPress={onOpenCaptureHealth}
        symbol={{ ios: 'waveform.path.ecg', android: 'monitor_heart', web: 'monitor_heart' }}
      />
      <ProfileActionRow
        accessibilityHint={copy.shortcutsSetupHint}
        label={copy.shortcutsSetup}
        onPress={replayShortcutsSetup}
        symbol={{ ios: 'square.2.layers.3d', android: 'bolt', web: 'bolt' }}
      />
      <ProfileActionRow
        accessibilityHint={copy.dataHint}
        label={copy.data}
        onPress={onOpenData}
        symbol={{ ios: 'externaldrive', android: 'storage', web: 'storage' }}
      />
      <ProfileActionRow
        accessibilityHint={copy.privacyHint}
        label={copy.privacy}
        onPress={onOpenPrivacy}
        symbol={{ ios: 'lock.shield', android: 'shield', web: 'shield' }}
      />
      <ProfileActionRow
        accessibilityHint={copy.languageHint}
        accessibilityLabel={`${copy.language}: ${languageNames[language]}`}
        label={copy.language}
        onPress={onOpenLanguage}
        symbol={{ ios: 'globe', android: 'language', web: 'language' }}
        value={languageNames[language]}
      />
      {__DEV__ ? (
        <ProfileActionRow
          hasChevron={false}
          label={copy.replayOnboarding}
          onPress={replayOnboarding}
          symbol={{ ios: 'arrow.counterclockwise', android: 'replay', web: 'replay' }}
        />
      ) : null}
      {__DEV__ ? (
        <ProfileActionRow
          hasChevron={false}
          label={copy.replayFocusAnnouncement}
          onPress={replayFocusAnnouncement}
          symbol={{ ios: 'moon', android: 'bedtime', web: 'bedtime' }}
        />
      ) : null}
    </ProfileSection>
  );
}

import { useEffect, useState } from 'react';

import { useCopy } from '@/features/app-shell/localization/language';
import { syncStatusLabel, type SyncStatus } from '@/features/data/sync/engine/sync-status';

import { profileCopy } from '../profile-copy';
import { ProfileInfoRow, ProfileSection } from './profile-rows';

interface AccountSectionProps {
  email: string;
  syncStatus: SyncStatus;
}

export function AccountSection({ email, syncStatus }: AccountSectionProps) {
  const copy = useCopy(profileCopy);
  const [now, setNow] = useState(() => Date.now());
  const syncLabel = syncStatusLabel(syncStatus, now);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60_000);

    return () => clearInterval(interval);
  }, []);

  return (
    <ProfileSection label={copy.accountSection}>
      <ProfileInfoRow
        accessibilityLabel={copy.emailLabel(email)}
        isSingleLine
        label={copy.email}
        symbol={{ ios: 'envelope.fill', android: 'mail', web: 'mail' }}
        value={email}
      />
      <ProfileInfoRow
        accessibilityLabel={copy.syncLabel(syncLabel)}
        isLive
        label={copy.sync}
        symbol={{
          ios: 'arrow.triangle.2.circlepath',
          android: 'sync',
          web: 'sync',
        }}
        value={syncLabel}
      />
    </ProfileSection>
  );
}

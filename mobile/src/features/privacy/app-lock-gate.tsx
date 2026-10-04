import type { ReactNode } from 'react';
import { useCopy } from '@/features/localization/language';

import { privacyCopy } from './privacy-copy';
import { biometricLabels } from './biometrics';
import { LockScreen } from './lock-screen';
import { usePrivacy } from './privacy-provider';

interface AppLockGateProps {
  children: ReactNode;
}

export function AppLockGate({ children }: AppLockGateProps) {
  const { isLoaded } = usePrivacy();

  if (!isLoaded) {
    return null;
  }

  return children;
}

export function AppLockScreen() {
  const { biometric, cancelWidgetReveal, lockReason, unlock } = usePrivacy();
  const copy = useCopy(privacyCopy);

  if (lockReason === 'widget') {
    return (
      <LockScreen
        key="widget"
        onCancel={cancelWidgetReveal}
        onUnlocked={unlock}
        promptMessage={copy.revealWidgetPrompt}
        subtitle={copy.revealWidgetSubtitle}
        title={copy.revealWidgetTitle}
      />
    );
  }

  return (
    <LockScreen
      key="app"
      onUnlocked={unlock}
      promptMessage={copy.unlockPrompt}
      subtitle={biometric === 'none' ? copy.enterPin : copy.useBiometricOrPin(biometricLabels[biometric])}
      title={copy.lockedTitle}
    />
  );
}

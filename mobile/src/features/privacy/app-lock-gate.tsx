import type { ReactNode } from 'react';

import { LockScreen } from './lock-screen';
import { usePrivacy } from './privacy-provider';

interface AppLockGateProps {
  children: ReactNode;
}

export function AppLockGate({ children }: AppLockGateProps) {
  const { biometric, cancelWidgetReveal, isLoaded, lockReason, unlock } = usePrivacy();

  if (!isLoaded) {
    return null;
  }

  if (lockReason === 'widget') {
    return (
      <LockScreen
        key="widget"
        onCancel={cancelWidgetReveal}
        onUnlocked={unlock}
        promptMessage="Pokaż widżet BankStats"
        subtitle="Potwierdź, że to Ty, żeby zobaczyć widżet."
        title="Odsłoń widżet"
      />
    );
  }

  if (lockReason === 'app') {
    return (
      <LockScreen
        key="app"
        onUnlocked={unlock}
        promptMessage="Odblokuj BankStats"
        subtitle={biometric === 'none' ? 'Wpisz kod PIN.' : 'Użyj Face ID albo wpisz kod PIN.'}
        title="BankStats jest zablokowany"
      />
    );
  }

  return children;
}

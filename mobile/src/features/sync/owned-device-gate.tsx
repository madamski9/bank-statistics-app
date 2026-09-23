import type { ReactNode } from 'react';

import { ForeignDeviceScreen } from './foreign-device-screen';
import { useDeviceOwnership } from './use-device-ownership';

interface OwnedDeviceGateProps {
  children: ReactNode;
}

export function OwnedDeviceGate({ children }: OwnedDeviceGateProps) {
  const { ownership, takeOver } = useDeviceOwnership();

  if (ownership === 'checking') {
    return null;
  }

  if (ownership === 'foreign') {
    return <ForeignDeviceScreen onTakeOver={takeOver} />;
  }

  return children;
}

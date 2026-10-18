import { useEffect } from 'react';

import { encryptedAlertPauseStorage, type AlertPauseStorage } from './alert-pause-storage';

export function AlertsPausedWhileSignedOut({
  storage = encryptedAlertPauseStorage,
}: {
  storage?: AlertPauseStorage;
}): null {
  useEffect(() => {
    void storage.markPaused(Date.now());
  }, [storage]);

  return null;
}

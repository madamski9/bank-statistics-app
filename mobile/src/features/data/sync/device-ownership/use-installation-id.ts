import { useEffect, useState } from 'react';

import { loadInstallationId } from './installation-id';

export function useInstallationId(): string | null {
  const [installationId, setInstallationId] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    void loadInstallationId()
      .then((id) => {
        if (isActive) {
          setInstallationId(id);
        }
      })
      .catch(() => undefined);

    return () => {
      isActive = false;
    };
  }, []);

  return installationId;
}

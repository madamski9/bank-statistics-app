import { useCallback, useEffect, useMemo, useState } from 'react';

import { queueLocalWrite } from '@/features/data/local-storage/local-write-queue';

import { loadAccounts, upsertAccount } from './account-storage';
import { newFinancialAccount, withGeneralAccounts, type FinancialAccount } from './financial-account';
import { encryptedAccountStorage } from './encrypted-account-storage';

export interface FinancialAccounts {
  accounts: FinancialAccount[];
  create: (name: string) => Promise<FinancialAccount>;
  reload: () => Promise<void>;
}

export function useFinancialAccounts(): FinancialAccounts {
  const [stored, setStored] = useState<FinancialAccount[]>([]);

  const reload = useCallback(async () => {
    setStored(await loadAccounts(encryptedAccountStorage));
  }, []);

  useEffect(() => {
    let isActive = true;

    void loadAccounts(encryptedAccountStorage).then((accounts) => {
      if (isActive) {
        setStored(accounts);
      }
    });

    return () => {
      isActive = false;
    };
  }, []);

  const create = useCallback(async (name: string) => {
    const account = newFinancialAccount(name, new Date(), Math.random);
    await queueLocalWrite(() => upsertAccount(encryptedAccountStorage, account));
    setStored(await loadAccounts(encryptedAccountStorage));

    return account;
  }, []);

  const accounts = useMemo(() => withGeneralAccounts(stored), [stored]);

  return { accounts, create, reload };
}

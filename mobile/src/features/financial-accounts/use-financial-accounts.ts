import { useCallback, useEffect, useMemo, useState } from 'react';

import { loadAccounts, upsertAccount } from './account-storage';
import { newFinancialAccount, withGeneralAccounts, type FinancialAccount } from './financial-account';
import { fileAccountStorage } from './file-account-storage';

export interface FinancialAccounts {
  accounts: FinancialAccount[];
  create: (name: string) => Promise<FinancialAccount>;
  reload: () => Promise<void>;
}

export function useFinancialAccounts(): FinancialAccounts {
  const [stored, setStored] = useState<FinancialAccount[]>([]);

  const reload = useCallback(async () => {
    setStored(await loadAccounts(fileAccountStorage));
  }, []);

  useEffect(() => {
    let isActive = true;

    void loadAccounts(fileAccountStorage).then((accounts) => {
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
    await upsertAccount(fileAccountStorage, account);
    setStored(await loadAccounts(fileAccountStorage));

    return account;
  }, []);

  const accounts = useMemo(() => withGeneralAccounts(stored), [stored]);

  return { accounts, create, reload };
}

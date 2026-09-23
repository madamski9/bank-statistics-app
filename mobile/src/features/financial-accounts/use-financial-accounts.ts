import { useCallback, useEffect, useMemo, useState } from 'react';

import { loadAccounts, upsertAccount } from './account-storage';
import { newFinancialAccount, withGeneralAccounts, type FinancialAccount } from './financial-account';
import { secureAccountStorage } from './secure-account-storage';

export interface FinancialAccounts {
  accounts: FinancialAccount[];
  create: (name: string) => Promise<FinancialAccount>;
  reload: () => Promise<void>;
}

export function useFinancialAccounts(): FinancialAccounts {
  const [stored, setStored] = useState<FinancialAccount[]>([]);

  const reload = useCallback(async () => {
    setStored(await loadAccounts(secureAccountStorage));
  }, []);

  useEffect(() => {
    let isActive = true;

    void loadAccounts(secureAccountStorage).then((accounts) => {
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
    await upsertAccount(secureAccountStorage, account);
    setStored(await loadAccounts(secureAccountStorage));

    return account;
  }, []);

  const accounts = useMemo(() => withGeneralAccounts(stored), [stored]);

  return { accounts, create, reload };
}

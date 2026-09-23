import { api } from '@bankstats/convex/convex/_generated/api';
import {
  deleteIngestionRecord,
  listIngestionRecords,
  saveIngestionRecord,
  type IngestionRecord,
} from '@bankstats/ingestion-native';
import { useAuth } from '@clerk/expo';
import { useConvex, useConvexAuth, useQuery } from 'convex/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';

import {
  loadAccounts,
  removeAccount,
  upsertAccount,
} from '@/features/financial-accounts/account-storage';
import type { FinancialAccount } from '@/features/financial-accounts/financial-account';
import { fileAccountStorage } from '@/features/financial-accounts/file-account-storage';

import { fileLedgerStorage } from './file-ledger-storage';
import { loadInstallationId } from './installation-id';
import { claimDevice, runSync, type SyncPorts } from './sync-runner';
import type { SyncStatus } from './sync-status';

const retryDelayMs = 30_000;
const triggerDebounceMs = 250;

interface Registration {
  userId: string;
  installationId: string;
}

interface CloudSyncOptions {
  records: IngestionRecord[];
  accounts: FinancialAccount[];
  onPulled: () => void | Promise<void>;
}

export function useCloudSync({ records, accounts, onPulled }: CloudSyncOptions): SyncStatus {
  const convex = useConvex();
  const { isAuthenticated } = useConvexAuth();
  const { userId } = useAuth();
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [status, setStatus] = useState<SyncStatus>({ state: 'waiting', lastSyncedAt: null });
  const [isConnected, setIsConnected] = useState(
    () => convex.connectionState().isWebSocketConnected,
  );
  const isSupported = Platform.OS === 'ios';
  const installationId =
    registration !== null && registration.userId === userId ? registration.installationId : null;
  const isReady = isSupported && isAuthenticated && installationId !== null;
  const remoteTransactions = useQuery(api.transactions.list, isReady ? { installationId } : 'skip');
  const remoteAccounts = useQuery(api.financialAccounts.list, isReady ? { installationId } : 'skip');
  const [registrationAttempt, setRegistrationAttempt] = useState(0);
  const isRunning = useRef(false);
  const isRerunNeeded = useRef(false);

  useEffect(() => {
    if (!isSupported || !isAuthenticated || userId == null) {
      return;
    }

    let isActive = true;

    claimDevice(fileLedgerStorage, userId)
      .then(async (isOwnDevice) => {
        if (!isOwnDevice) {
          return;
        }

        const id = await loadInstallationId();
        await convex.mutation(api.devices.register, { installationId: id, platform: 'ios' });

        if (isActive) {
          setRegistration({ userId, installationId: id });
        }
      })
      .catch(() => {
        if (isActive) {
          setStatus((current) => ({ ...current, state: 'failed' }));
        }
      });

    return () => {
      isActive = false;
    };
  }, [convex, isAuthenticated, isSupported, registrationAttempt, userId]);

  const synchronize = useCallback(async () => {
    if (!isReady || userId == null) {
      return;
    }

    if (isRunning.current) {
      isRerunNeeded.current = true;
      return;
    }

    isRunning.current = true;
    setStatus((current) => ({ ...current, state: 'syncing' }));

    const ports: SyncPorts = {
      ownerId: userId,
      transactions: {
        local: {
          list: listIngestionRecords,
          save: saveIngestionRecord,
          remove: deleteIngestionRecord,
        },
        cloud: {
          list: () => convex.query(api.transactions.list, { installationId }),
          push: (changes) => convex.mutation(api.transactions.push, { installationId, changes }),
        },
      },
      accounts: {
        local: {
          list: () => loadAccounts(fileAccountStorage),
          save: (account) => upsertAccount(fileAccountStorage, account),
          remove: (id) => removeAccount(fileAccountStorage, id),
        },
        cloud: {
          list: () => convex.query(api.financialAccounts.list, { installationId }),
          push: (changes) =>
            convex.mutation(api.financialAccounts.push, { installationId, changes }),
        },
      },
      ledger: fileLedgerStorage,
      now: Date.now,
    };

    try {
      do {
        isRerunNeeded.current = false;
        const { pulled } = await runSync(ports);

        if (pulled > 0) {
          await onPulled();
        }
      } while (isRerunNeeded.current);

      setStatus({ state: 'synced', lastSyncedAt: Date.now() });
    } catch {
      isRerunNeeded.current = false;
      setStatus((current) => ({ ...current, state: 'failed' }));
    } finally {
      isRunning.current = false;
    }
  }, [convex, installationId, isReady, onPulled, userId]);

  useEffect(() => {
    const timeout = setTimeout(() => void synchronize(), triggerDebounceMs);

    return () => clearTimeout(timeout);
  }, [accounts, records, remoteAccounts, remoteTransactions, synchronize]);

  useEffect(() => {
    if (status.state !== 'failed') {
      return;
    }

    const timeout = setTimeout(() => {
      if (isReady) {
        void synchronize();
      } else {
        setRegistrationAttempt((attempt) => attempt + 1);
      }
    }, retryDelayMs);

    return () => clearTimeout(timeout);
  }, [isReady, status.state, synchronize]);

  useEffect(() => {
    let wasConnected = convex.connectionState().isWebSocketConnected;

    const unsubscribe = convex.subscribeToConnectionState(({ isWebSocketConnected }) => {
      setIsConnected(isWebSocketConnected);

      if (isWebSocketConnected && !wasConnected) {
        void synchronize();
      }

      wasConnected = isWebSocketConnected;
    });

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        void synchronize();
      }
    });

    return () => {
      unsubscribe();
      subscription.remove();
    };
  }, [convex, synchronize]);

  if (!isConnected) {
    return { state: 'offline', lastSyncedAt: status.lastSyncedAt };
  }

  return status;
}

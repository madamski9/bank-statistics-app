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

import type { CustomCategory } from '@/features/classification/categories';
import { customCategoryStore } from '@/features/classification/custom-category-storage';
import { eventStore } from '@/features/events/event-storage';
import type { SpendingEvent } from '@/features/events/spending-event';
import {
  loadAccounts,
  removeAccount,
  upsertAccount,
} from '@/features/financial-accounts/account-storage';
import type { FinancialAccount } from '@/features/financial-accounts/financial-account';
import { encryptedAccountStorage } from '@/features/financial-accounts/encrypted-account-storage';

import { useCloudSyncEnabled } from './cloud-sync-preference';
import { encryptedLedgerStorage } from './encrypted-ledger-storage';
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
  categories: CustomCategory[];
  events: SpendingEvent[];
  onPulled: () => void | Promise<void>;
}

export function useCloudSync({
  records,
  accounts,
  categories,
  events,
  onPulled,
}: CloudSyncOptions): SyncStatus {
  const convex = useConvex();
  const { isAuthenticated } = useConvexAuth();
  const { userId } = useAuth();
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [status, setStatus] = useState<SyncStatus>({ state: 'waiting', lastSyncedAt: null });
  const [isConnected, setIsConnected] = useState(
    () => convex.connectionState().isWebSocketConnected,
  );
  const isCloudEnabled = useCloudSyncEnabled();
  const isSupported = Platform.OS === 'ios' && isCloudEnabled === true;
  const installationId =
    registration !== null && registration.userId === userId ? registration.installationId : null;
  const isReady = isSupported && isAuthenticated && installationId !== null;
  const remoteTransactions = useQuery(api.transactions.list, isReady ? { installationId } : 'skip');
  const remoteAccounts = useQuery(api.financialAccounts.list, isReady ? { installationId } : 'skip');
  const remoteCategories = useQuery(api.categories.list, isReady ? { installationId } : 'skip');
  const remoteEvents = useQuery(api.events.list, isReady ? { installationId } : 'skip');
  const [registrationAttempt, setRegistrationAttempt] = useState(0);
  const isRunning = useRef(false);
  const isRerunNeeded = useRef(false);

  useEffect(() => {
    if (!isSupported || !isAuthenticated || userId == null) {
      return;
    }

    let isActive = true;

    claimDevice(encryptedLedgerStorage, userId)
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
          list: () => loadAccounts(encryptedAccountStorage),
          save: (account) => upsertAccount(encryptedAccountStorage, account),
          remove: (id) => removeAccount(encryptedAccountStorage, id),
        },
        cloud: {
          list: () => convex.query(api.financialAccounts.list, { installationId }),
          push: (changes) =>
            convex.mutation(api.financialAccounts.push, { installationId, changes }),
        },
      },
      categories: {
        local: {
          list: customCategoryStore.load,
          save: customCategoryStore.upsert,
          remove: customCategoryStore.remove,
        },
        cloud: {
          list: () => convex.query(api.categories.list, { installationId }),
          push: (changes) => convex.mutation(api.categories.push, { installationId, changes }),
        },
      },
      events: {
        local: {
          list: eventStore.load,
          save: eventStore.upsert,
          remove: eventStore.remove,
        },
        cloud: {
          list: () => convex.query(api.events.list, { installationId }),
          push: (changes) => convex.mutation(api.events.push, { installationId, changes }),
        },
      },
      ledger: encryptedLedgerStorage,
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
  }, [
    accounts,
    categories,
    events,
    records,
    remoteAccounts,
    remoteCategories,
    remoteEvents,
    remoteTransactions,
    synchronize,
  ]);

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

  if (isCloudEnabled === false) {
    return { state: 'disabled', lastSyncedAt: status.lastSyncedAt };
  }

  if (!isConnected) {
    return { state: 'offline', lastSyncedAt: status.lastSyncedAt };
  }

  return status;
}

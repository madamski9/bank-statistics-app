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

import type { CustomCategory } from '@/features/data/classification/categories';
import { customCategoryStore } from '@/features/data/classification/custom-categories/custom-category-storage';
import { eventStore } from '@/features/insights/events/event-storage';
import type { SpendingEvent } from '@/features/insights/events/spending-event';
import {
  readAccounts,
  removeAccount,
  upsertAccount,
} from '@/features/data/financial-accounts/account-storage';
import type { FinancialAccount } from '@/features/data/financial-accounts/financial-account';
import { openLocalDataSession } from '@/features/data/local-storage/local-data-session';
import { queueLocalWrite } from '@/features/data/local-storage/local-write-queue';
import { encryptedAccountStorage } from '@/features/data/financial-accounts/encrypted-account-storage';

import { isCloudSyncEnabledNow, useCloudSyncEnabled } from './cloud-sync/cloud-sync-preference';
import { encryptedLedgerStorage } from './codecs/encrypted-ledger-storage';
import { loadInstallationId } from './device-ownership/installation-id';
import { claimDevice, runSync, type SyncPorts } from './engine/sync-runner';
import { trackSyncRun } from './engine/sync-activity';
import type { SyncStatus } from './engine/sync-status';

const retryDelayMs = 30_000;
const triggerDebounceMs = 250;

interface Registration {
  sessionId: string;
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
  const { userId, sessionId } = useAuth();
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [status, setStatus] = useState<SyncStatus>({ state: 'waiting', lastSyncedAt: null });
  const [isConnected, setIsConnected] = useState(
    () => convex.connectionState().isWebSocketConnected,
  );
  const isCloudEnabled = useCloudSyncEnabled();
  const isSupported = Platform.OS === 'ios' && isCloudEnabled === true;
  const installationId =
    registration !== null && registration.sessionId === sessionId ? registration.installationId : null;
  const isReady = isSupported && isAuthenticated && installationId !== null;
  const cloudHead = useQuery(api.sync.head, isReady ? { installationId } : 'skip');
  const [registrationAttempt, setRegistrationAttempt] = useState(0);
  const isRunning = useRef(false);
  const isRerunNeeded = useRef(false);
  const signedInUserId = useRef(userId);

  useEffect(() => {
    signedInUserId.current = userId;
  }, [userId]);

  useEffect(() => {
    if (!isSupported || !isAuthenticated || userId == null || sessionId == null) {
      return;
    }

    let isActive = true;

    claimDevice(encryptedLedgerStorage, userId)
      .then(async (isOwnDevice) => {
        if (!isOwnDevice) {
          return;
        }

        const id = await loadInstallationId();

        if (!isActive || !isCloudSyncEnabledNow()) {
          return;
        }

        await convex.mutation(api.devices.register, { installationId: id, platform: 'ios' });

        if (isActive) {
          setRegistration({ sessionId, installationId: id });
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
  }, [convex, isAuthenticated, isSupported, registrationAttempt, sessionId, userId]);

  const synchronize = useCallback(async () => {
    if (!isReady || userId == null || !isCloudSyncEnabledNow()) {
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
      cloud: {
        pull: (cursors) => convex.query(api.sync.pull, { installationId, cursors }),
        push: (changes) => convex.mutation(api.sync.push, { installationId, changes }),
      },
      transactions: {
        list: listIngestionRecords,
        save: saveIngestionRecord,
        remove: deleteIngestionRecord,
      },
      accounts: {
        list: () => readAccounts(encryptedAccountStorage),
        save: (account) => upsertAccount(encryptedAccountStorage, account),
        remove: (id) => removeAccount(encryptedAccountStorage, id),
      },
      categories: {
        list: customCategoryStore.read,
        save: customCategoryStore.upsert,
        remove: customCategoryStore.remove,
      },
      events: {
        list: eventStore.read,
        save: eventStore.upsert,
        remove: eventStore.remove,
      },
      ledger: encryptedLedgerStorage,
      session: openLocalDataSession(() => signedInUserId.current === userId),
      exclusive: queueLocalWrite,
      now: Date.now,
    };

    try {
      do {
        isRerunNeeded.current = false;
        const { pulled } = await trackSyncRun(runSync(ports));

        if (pulled > 0) {
          await onPulled();
        }
      } while (isRerunNeeded.current && isCloudSyncEnabledNow());

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
    cloudHead,
    records,
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

import { api } from '@bankstats/convex/convex/_generated/api';
import {
  deleteIngestionRecord,
  listIngestionRecords,
  saveIngestionRecord,
  type IngestionRecord,
} from '@bankstats/ingestion-native';
import { useAuth } from '@clerk/expo';
import { useConvex, useConvexAuth, useQuery } from 'convex/react';
import * as SecureStore from 'expo-secure-store';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';

import { loadInstallationId } from './installation-id';
import { runSync, type SyncPorts } from './sync-runner';

const ledgerKey = 'bankstats.sync-ledger';

interface Registration {
  userId: string;
  installationId: string;
}

interface TransactionSyncOptions {
  records: IngestionRecord[];
  refresh: () => void | Promise<void>;
}

export function useTransactionSync({ records, refresh }: TransactionSyncOptions): void {
  const convex = useConvex();
  const { isAuthenticated } = useConvexAuth();
  const { userId } = useAuth();
  const [registration, setRegistration] = useState<Registration | null>(null);
  const isSupported = Platform.OS === 'ios';
  const installationId =
    registration !== null && registration.userId === userId ? registration.installationId : null;
  const isReady = isSupported && isAuthenticated && installationId !== null;
  const remote = useQuery(api.transactions.list, isReady ? {} : 'skip');
  const isRunning = useRef(false);
  const isRerunNeeded = useRef(false);

  useEffect(() => {
    if (!isSupported || !isAuthenticated || userId == null) {
      return;
    }

    let isActive = true;

    loadInstallationId()
      .then(async (id) => {
        await convex.mutation(api.devices.register, { installationId: id, platform: 'ios' });

        if (isActive) {
          setRegistration({ userId, installationId: id });
        }
      })
      .catch(() => undefined);

    return () => {
      isActive = false;
    };
  }, [convex, isAuthenticated, isSupported, userId]);

  const synchronize = useCallback(async () => {
    if (!isReady) {
      return;
    }

    if (isRunning.current) {
      isRerunNeeded.current = true;
      return;
    }

    isRunning.current = true;

    const ports: SyncPorts = {
      outbox: {
        list: listIngestionRecords,
        save: saveIngestionRecord,
        remove: deleteIngestionRecord,
      },
      cloud: {
        list: () => convex.query(api.transactions.list, {}),
        push: (changes) => convex.mutation(api.transactions.push, { installationId, changes }),
      },
      ledger: {
        read: () => SecureStore.getItemAsync(ledgerKey),
        write: (value) => SecureStore.setItemAsync(ledgerKey, value),
      },
      now: Date.now,
    };

    try {
      do {
        isRerunNeeded.current = false;
        const { pulled } = await runSync(ports);

        if (pulled > 0) {
          await refresh();
        }
      } while (isRerunNeeded.current);
    } catch {
      isRerunNeeded.current = false;
    } finally {
      isRunning.current = false;
    }
  }, [convex, installationId, isReady, refresh]);

  useEffect(() => {
    void synchronize();
  }, [records, remote, synchronize]);

  useEffect(() => {
    let wasConnected = convex.connectionState().isWebSocketConnected;

    const unsubscribe = convex.subscribeToConnectionState(({ isWebSocketConnected }) => {
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
}

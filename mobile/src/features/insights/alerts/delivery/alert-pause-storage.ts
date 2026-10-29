import {
  deleteEncryptedDocument,
  readEncryptedDocument,
  supportsEncryptedDocuments,
  writeEncryptedDocument,
} from '@bankstats/ingestion-native';

const pausedSinceKey = 'alerts.paused-since';

export interface AlertPauseStorage {
  readPausedSince: () => Promise<number | null>;
  markPaused: (sinceMs: number) => Promise<void>;
  clearPaused: () => Promise<void>;
}

function parsedMs(value: string | null): number | null {
  if (value === null) {
    return null;
  }

  const ms = Number(value);

  return Number.isFinite(ms) ? ms : null;
}

async function readPausedSince(): Promise<number | null> {
  if (!supportsEncryptedDocuments()) {
    return null;
  }

  try {
    return parsedMs(await readEncryptedDocument(pausedSinceKey));
  } catch {
    return null;
  }
}

export const encryptedAlertPauseStorage: AlertPauseStorage = {
  readPausedSince,
  async markPaused(sinceMs) {
    if (!supportsEncryptedDocuments()) {
      return;
    }

    try {
      if ((await readPausedSince()) === null) {
        await writeEncryptedDocument(pausedSinceKey, String(sinceMs));
      }
    } catch {}
  },
  async clearPaused() {
    if (!supportsEncryptedDocuments()) {
      return;
    }

    try {
      await deleteEncryptedDocument(pausedSinceKey);
    } catch {}
  },
};

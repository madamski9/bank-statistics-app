import {
  deleteEncryptedDocument,
  readEncryptedDocument,
  supportsEncryptedDocuments,
  writeEncryptedDocument,
} from '@bankstats/ingestion-native';
import { File, Paths } from 'expo-file-system';

export interface DocumentStorage {
  read: () => Promise<string | null>;
  write: (value: string) => Promise<void>;
}

export interface EncryptedDocument extends DocumentStorage {
  clear: () => Promise<void>;
}

function legacyFile(name: string): File {
  return new File(Paths.document, name);
}

function readLegacy(name: string | undefined): string | null {
  if (name === undefined) {
    return null;
  }

  const file = legacyFile(name);

  return file.exists ? file.textSync() : null;
}

function deleteLegacy(name: string | undefined): void {
  if (name === undefined) {
    return;
  }

  const file = legacyFile(name);

  if (file.exists) {
    file.delete();
  }
}

function writeLegacy(name: string, value: string): void {
  const file = legacyFile(name);

  if (!file.exists) {
    file.create();
  }

  file.write(value);
}

export function encryptedDocument(key: string, legacyFileName?: string): EncryptedDocument {
  return {
    read: async () => {
      if (!supportsEncryptedDocuments()) {
        return readLegacy(legacyFileName);
      }

      const stored = await readEncryptedDocument(key);

      if (stored !== null) {
        return stored;
      }

      const legacy = readLegacy(legacyFileName);

      if (legacy !== null) {
        await writeEncryptedDocument(key, legacy);
        deleteLegacy(legacyFileName);
      }

      return legacy;
    },
    write: async (value) => {
      if (supportsEncryptedDocuments()) {
        await writeEncryptedDocument(key, value);
        deleteLegacy(legacyFileName);
        return;
      }

      if (legacyFileName !== undefined) {
        writeLegacy(legacyFileName, value);
      }
    },
    clear: async () => {
      if (supportsEncryptedDocuments()) {
        await deleteEncryptedDocument(key);
      }

      deleteLegacy(legacyFileName);
    },
  };
}

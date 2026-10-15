import type { IngestionRecord } from '@bankstats/ingestion-native';
import { File, Paths } from 'expo-file-system';
import { Share } from 'react-native';

import type { FinancialAccount } from '@/features/data/financial-accounts/financial-account';

import { exportContents, exportFileName, type ExportFormat } from './transaction-export';

export async function shareTransactionExport(
  format: ExportFormat,
  records: IngestionRecord[],
  accounts: FinancialAccount[],
): Promise<void> {
  const now = new Date();
  const file = new File(Paths.cache, exportFileName(format, now));

  if (file.exists) {
    file.delete();
  }

  file.create();
  file.write(exportContents(format, records, accounts, now));

  try {
    await Share.share({ url: file.uri, title: file.name });
  } finally {
    if (file.exists) {
      file.delete();
    }
  }
}

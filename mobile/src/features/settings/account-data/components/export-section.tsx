import type { IngestionRecord } from '@bankstats/ingestion-native';
import { useState } from 'react';

import { formatTransactionCount } from '@/features/app-shell/formatting/formatting';
import { useCopy } from '@/features/app-shell/localization/language';
import type { FinancialAccount } from '@/features/data/financial-accounts/financial-account';
import { shareTransactionExport } from '@/features/settings/data-export/share-export';
import type { ExportFormat } from '@/features/settings/data-export/transaction-export';

import { accountDataCopy } from '../account-data-copy';
import { DataRow, DataSection } from './data-section';

interface ExportSectionProps {
  records: IngestionRecord[];
  accounts: FinancialAccount[];
}

export function ExportSection({ records, accounts }: ExportSectionProps) {
  const copy = useCopy(accountDataCopy);
  const [exportError, setExportError] = useState<string | null>(null);

  const exportAs = (format: ExportFormat) => {
    setExportError(null);
    void shareTransactionExport(format, records, accounts).catch(() =>
      setExportError(copy.exportFailed),
    );
  };

  return (
    <DataSection
      footnote={exportError ?? copy.exportFootnote(formatTransactionCount(records.length))}
      label={copy.exportSection}
    >
      {(['csv', 'json'] as const).map((format) => (
        <DataRow
          accessibilityHint={copy.exportHint}
          key={format}
          label={copy.exportLabels[format]}
          onPress={() => exportAs(format)}
          symbol={{ ios: 'square.and.arrow.up', android: 'share', web: 'share' }}
        />
      ))}
    </DataSection>
  );
}

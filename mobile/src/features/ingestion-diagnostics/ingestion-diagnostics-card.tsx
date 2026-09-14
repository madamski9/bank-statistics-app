import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { useIngestionDiagnostics } from './use-ingestion-diagnostics';

export function IngestionDiagnosticsCard() {
  const { error, ingestSynthetic, isLoading, records, storage } = useIngestionDiagnostics();
  const latestRecord = records[0];
  const latestRecordTitle =
    latestRecord?.merchant ??
    (latestRecord?.transactionType === 'incomingTransfer'
      ? 'Przelew przychodzący'
      : 'Przelew wychodzący');

  if (Platform.OS !== 'ios') {
    return null;
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Diagnostyka przechwytywania iOS</Text>
      <Text style={styles.detail}>
        SQLCipher {storage?.cipherVersion ?? '—'} · rekordy: {records.length}
      </Text>
      {latestRecord ? (
        <View style={styles.record}>
          <Text style={styles.merchant}>{latestRecordTitle}</Text>
          <Text style={styles.amount}>
            {latestRecord.direction === 'income' ? '+' : '−'}
            {(latestRecord.amountMinor / 100).toFixed(2)} {latestRecord.currency}
          </Text>
          <Text style={styles.detail}>
            Millennium
            {latestRecord.accountName ? ` · ${latestRecord.accountName}` : ''} · {latestRecord.status}
          </Text>
        </View>
      ) : (
        <Text style={styles.detail}>Brak przechwyconych rekordów</Text>
      )}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.actions}>
        <Pressable disabled={isLoading} onPress={() => void ingestSynthetic()} style={styles.button}>
          <Text style={styles.buttonText}>{isLoading ? 'Sprawdzanie…' : 'Dodaj próbkę'}</Text>
        </Pressable>
        <Pressable onPress={() => void Linking.openURL('shortcuts://')} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Otwórz Skróty</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    maxWidth: 440,
    gap: 12,
    borderRadius: 18,
    padding: 18,
    backgroundColor: 'rgba(128, 128, 128, 0.12)',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  detail: {
    fontSize: 13,
    opacity: 0.65,
  },
  record: {
    gap: 3,
    borderRadius: 12,
    padding: 14,
    backgroundColor: 'rgba(128, 128, 128, 0.12)',
  },
  merchant: {
    fontSize: 16,
    fontWeight: '600',
  },
  amount: {
    fontSize: 20,
    fontWeight: '700',
  },
  error: {
    color: '#C62828',
    fontSize: 13,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#208AEF',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  secondaryButton: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: 'rgba(128, 128, 128, 0.18)',
  },
  secondaryButtonText: {
    fontWeight: '600',
  },
});

import { useUser } from '@clerk/expo';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { IngestionDiagnosticsCard } from '@/features/ingestion-diagnostics/ingestion-diagnostics-card';

export function OverviewScreen() {
  const { user } = useUser();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.heading}>
        <Text style={styles.title}>Witaj{user?.firstName ? `, ${user.firstName}` : ''}</Text>
        <Text style={styles.subtitle}>Twój przegląd finansów pojawi się tutaj</Text>
      </View>
      <IngestionDiagnosticsCard />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28,
    padding: 24,
  },
  heading: {
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.6,
  },
});

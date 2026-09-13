import { useUser } from '@clerk/clerk-expo';
import { StyleSheet, Text, View } from 'react-native';

export function OverviewScreen() {
  const { user } = useUser();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Witaj{user?.firstName ? `, ${user.firstName}` : ''}</Text>
      <Text style={styles.subtitle}>Twój przegląd finansów pojawi się tutaj</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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

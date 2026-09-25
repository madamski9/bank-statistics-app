import { api } from '@bankstats/convex/convex/_generated/api';
import type { Id } from '@bankstats/convex/convex/_generated/dataModel';
import { useMutation, useQuery } from 'convex/react';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { overviewColors, overviewSpacing } from '@/features/spending-overview/overview-theme';
import { useInstallationId } from '@/features/sync/use-installation-id';

import { devicePlatformName, lastSeenLabel } from './device-labels';

export function DevicesSection() {
  const installationId = useInstallationId();
  const devices = useQuery(api.devices.list, installationId === null ? 'skip' : { installationId });
  const revoke = useMutation(api.devices.revoke);
  const [error, setError] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<Id<'devices'> | null>(null);
  const [now] = useState(() => Date.now());

  const confirmRevoke = (deviceId: Id<'devices'>, name: string) => {
    Alert.alert(
      `Odłączyć ${name}?`,
      'To urządzenie przestanie synchronizować dane, a przy następnym połączeniu usunie z siebie Twoje transakcje i wyloguje się.',
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Odłącz',
          style: 'destructive',
          onPress: () => {
            if (installationId === null) {
              return;
            }

            setError(null);
            setRevokingId(deviceId);
            void revoke({ installationId, deviceId })
              .catch(() => setError('Nie udało się odłączyć urządzenia. Spróbuj ponownie.'))
              .finally(() => setRevokingId(null));
          },
        },
      ],
    );
  };

  if (devices === undefined) {
    return (
      <View style={styles.placeholder}>
        {installationId === null ? null : <ActivityIndicator color={overviewColors.textSecondary} />}
        <Text maxFontSizeMultiplier={1.5} style={styles.meta}>
          Lista urządzeń pojawi się po połączeniu z internetem.
        </Text>
      </View>
    );
  }

  return (
    <View>
      {devices.map((device) => {
        const name = devicePlatformName(device.platform);

        return (
          <View key={device.id} style={styles.row}>
            <View style={styles.copy}>
              <Text maxFontSizeMultiplier={1.4} style={styles.name}>
                {device.isCurrent ? `${name} (to urządzenie)` : name}
              </Text>
              <Text maxFontSizeMultiplier={1.5} style={styles.meta}>
                {lastSeenLabel(device.lastSeenAt, now)}
              </Text>
            </View>
            {device.isCurrent ? null : (
              <Pressable
                accessibilityLabel={`Odłącz ${name}`}
                accessibilityRole="button"
                disabled={revokingId !== null}
                hitSlop={8}
                onPress={() => confirmRevoke(device.id, name)}
                style={({ pressed }) => [styles.revoke, pressed ? styles.pressed : null]}
              >
                {revokingId === device.id ? (
                  <ActivityIndicator color={overviewColors.negative} />
                ) : (
                  <Text maxFontSizeMultiplier={1.4} style={styles.revokeLabel}>
                    Odłącz
                  </Text>
                )}
              </Pressable>
            )}
          </View>
        );
      })}
      {error !== null ? (
        <Text accessibilityLiveRegion="polite" maxFontSizeMultiplier={1.5} style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    gap: 8,
    padding: overviewSpacing.block,
  },
  row: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: overviewSpacing.row,
    paddingHorizontal: overviewSpacing.block,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: overviewColors.hairline,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: overviewColors.textPrimary,
  },
  meta: {
    fontSize: 13,
    lineHeight: 18,
    color: overviewColors.textSecondary,
  },
  revoke: {
    minHeight: 44,
    minWidth: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  revokeLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: overviewColors.negative,
  },
  error: {
    padding: overviewSpacing.block,
    fontSize: 13,
    color: overviewColors.negative,
  },
  pressed: {
    opacity: 0.6,
  },
});

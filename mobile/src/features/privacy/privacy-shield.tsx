import { useEffect, useId, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { overviewColors } from '@/features/spending-overview/overview-theme';

import { usePrivacy } from './privacy-provider';

export function PrivacyShield() {
  const { lockScreen, registerShield, shieldMode, topShieldId } = usePrivacy();
  const shieldId = useId();

  useEffect(() => registerShield(shieldId), [registerShield, shieldId]);

  if (shieldMode === 'hidden') {
    return null;
  }

  const isTop = shieldId === topShieldId;

  return (
    <View accessibilityViewIsModal style={styles.shield}>
      {shieldMode === 'lock' && isTop ? lockScreen : null}
    </View>
  );
}

interface PrivacyBoundaryProps {
  children: ReactNode;
}

export function PrivacyBoundary({ children }: PrivacyBoundaryProps) {
  return (
    <View style={styles.boundary}>
      {children}
      <PrivacyShield />
    </View>
  );
}

const styles = StyleSheet.create({
  boundary: {
    flex: 1,
  },
  shield: {
    ...StyleSheet.absoluteFill,
    zIndex: 1000,
    backgroundColor: overviewColors.background,
  },
});

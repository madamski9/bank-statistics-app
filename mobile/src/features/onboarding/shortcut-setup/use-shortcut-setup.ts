import { useAuth } from '@clerk/expo';
import * as SecureStore from 'expo-secure-store';
import { useCallback, useEffect, useState } from 'react';
import { Linking, Platform } from 'react-native';

import { useCopy } from '@/features/app-shell/localization/language';

import { onboardingCopy } from '../onboarding-copy';
import { readSelectedBanks } from '../selected-banks';
import { shortcutUrlFor, toggledCapture } from './shortcut-links';
import { pendingShortcutBanks, shortcutSetupProgressKey } from './shortcut-setup-progress';

interface ShortcutSetupOptions {
  isShortcutsFlow: boolean;
  onError: (message: string | null) => void;
  onResume: () => void;
}

export function useShortcutSetup({ isShortcutsFlow, onError, onResume }: ShortcutSetupOptions) {
  const copy = useCopy(onboardingCopy);
  const { userId } = useAuth();
  const [selectedBanks, setSelectedBanks] = useState<string[]>(['millennium']);
  const [isRestoring, setIsRestoring] = useState(true);
  const [hasOpenedShortcut, setHasOpenedShortcut] = useState(false);
  const [isOpeningShortcut, setIsOpeningShortcut] = useState(false);
  const [isSavingProgress, setIsSavingProgress] = useState(false);

  useEffect(() => {
    if (userId == null) {
      return;
    }

    let isActive = true;

    void Promise.all([
      readSelectedBanks(userId),
      SecureStore.getItemAsync(shortcutSetupProgressKey(userId)),
    ])
      .then(([savedBanks, storedProgress]) => {
        if (!isActive) {
          return;
        }

        const pendingBanks = pendingShortcutBanks(storedProgress, savedBanks);

        if (pendingBanks !== null) {
          setSelectedBanks(pendingBanks);
          setHasOpenedShortcut(true);
          onResume();
        } else if (isShortcutsFlow && savedBanks.length > 0) {
          setSelectedBanks(savedBanks);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (isActive) {
          setIsRestoring(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [isShortcutsFlow, onResume, userId]);

  const toggleBank = useCallback(
    (bankId: string) => {
      setHasOpenedShortcut(false);
      onError(null);
      setSelectedBanks((current) => toggledCapture(current, bankId));
    },
    [onError],
  );

  const openShortcut = useCallback(async () => {
    if (isOpeningShortcut || isSavingProgress) {
      return;
    }

    if (selectedBanks.length === 0) {
      onError(copy.chooseBank);
      return;
    }

    if (Platform.OS !== 'ios') {
      onError(copy.shortcutsIphoneOnly);
      return;
    }

    const shortcutUrl = shortcutUrlFor(selectedBanks);

    if (shortcutUrl === null) {
      onError(copy.shortcutUnavailable);
      return;
    }

    onError(null);
    setIsOpeningShortcut(true);
    if (userId != null) {
      try {
        await SecureStore.setItemAsync(shortcutSetupProgressKey(userId), JSON.stringify(selectedBanks));
      } catch {
        onError(copy.progressSaveFailed);
        setIsOpeningShortcut(false);
        return;
      }
    }

    try {
      await Linking.openURL(shortcutUrl);
      setHasOpenedShortcut(true);
    } catch {
      if (userId != null && !hasOpenedShortcut) {
        await SecureStore.deleteItemAsync(shortcutSetupProgressKey(userId)).catch(() => undefined);
      }
      onError(copy.shortcutOpenFailed);
    } finally {
      setIsOpeningShortcut(false);
    }
  }, [copy, hasOpenedShortcut, isOpeningShortcut, isSavingProgress, onError, selectedBanks, userId]);

  const leave = useCallback(
    async (afterLeaving: () => void) => {
      if (isOpeningShortcut || isSavingProgress) {
        return;
      }

      onError(null);
      setIsSavingProgress(true);

      try {
        if (userId != null) {
          await SecureStore.deleteItemAsync(shortcutSetupProgressKey(userId));
        }

        afterLeaving();
      } catch {
        onError(copy.progressSaveFailed);
      } finally {
        setIsSavingProgress(false);
      }
    },
    [copy.progressSaveFailed, isOpeningShortcut, isSavingProgress, onError, userId],
  );

  return {
    selectedBanks,
    isRestoring,
    hasOpenedShortcut,
    isOpeningShortcut,
    isSavingProgress,
    toggleBank,
    openShortcut,
    leave,
  };
}

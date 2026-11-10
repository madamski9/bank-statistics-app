import { createContext, useContext, useEffect, useState, type ComponentProps } from 'react';
import { BackHandler, Modal, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

import { overviewColors } from '../theme/overview-theme';
import { createBackActions, type BackAction } from './back-actions';

type RegisterBackAction = (action: BackAction) => () => void;

const BackActionsContext = createContext<RegisterBackAction | null>(null);

export function useAndroidBack(handle: () => void, enabled = true, priority = 0) {
  const register = useContext(BackActionsContext);

  useEffect(() => {
    if (Platform.OS !== 'android' || !enabled) {
      return;
    }

    if (register !== null) {
      return register({ handle, priority });
    }

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      handle();
      return true;
    });

    return () => subscription.remove();
  }, [enabled, handle, priority, register]);
}

export function SheetModal({ children, onRequestClose, ...props }: ComponentProps<typeof Modal>) {
  const [actions] = useState(createBackActions);

  return (
    <Modal
      {...props}
      onRequestClose={(event) => {
        if (Platform.OS !== 'android' || !actions.dispatch()) {
          onRequestClose?.(event);
        }
      }}
    >
      <BackActionsContext value={actions.register}>
        <GestureHandlerRootView style={{ flex: 1, backgroundColor: overviewColors.background }}>
          <SafeAreaView edges={Platform.OS === 'android' ? ['top', 'left', 'right'] : []} style={{ flex: 1 }}>
            {children}
          </SafeAreaView>
        </GestureHandlerRootView>
      </BackActionsContext>
    </Modal>
  );
}

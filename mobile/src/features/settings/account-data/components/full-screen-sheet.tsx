import type { ReactNode } from 'react';
import { Modal } from 'react-native';

import { PrivacyShield } from '@/features/settings/privacy/privacy-shield';

interface FullScreenSheetProps {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function FullScreenSheet({ visible, onClose, children }: FullScreenSheetProps) {
  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="fullScreen"
      visible={visible}
    >
      {children}
      <PrivacyShield />
    </Modal>
  );
}

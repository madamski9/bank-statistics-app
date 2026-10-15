import { Modal } from 'react-native';

import { PrivacyShield } from '@/features/settings/privacy/privacy-shield';
import { WidgetPreview } from '@/features/widgets/widget-preview';
import type { buildSpendingWidgetProps } from '@/features/widgets/widget-snapshot';

interface WidgetPreviewSheetProps {
  props: ReturnType<typeof buildSpendingWidgetProps> | null;
  onClose: () => void;
}

export function WidgetPreviewSheet({ props, onClose }: WidgetPreviewSheetProps) {
  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="pageSheet"
      visible={props !== null}
    >
      {props !== null ? <WidgetPreview onClose={onClose} props={props} /> : null}
      <PrivacyShield />
    </Modal>
  );
}

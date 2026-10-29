import type { HomeSheetKey } from '@/features/home/sheets/home-sheet-key';

export function canOpenNotificationInbox(activeSheet: HomeSheetKey | null, isEditingAlert: boolean): boolean {
  return !isEditingAlert && (activeSheet === null || activeSheet === 'captureHealth');
}

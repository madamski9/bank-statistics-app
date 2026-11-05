import { endLocalDataSessions } from './local-data-session';
import { queueLocalWrite } from './local-write-queue';

export async function clearLocalDataWith(clear: () => Promise<void>): Promise<void> {
  await endLocalDataSessions();
  await queueLocalWrite(clear);
}

import { ConvexReactClient } from 'convex/react';

import { appEnvironment } from '@/app-environment';

export const convexClient = new ConvexReactClient(appEnvironment.convexUrl, {
  unsavedChangesWarning: false,
});

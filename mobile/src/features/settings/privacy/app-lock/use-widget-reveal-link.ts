import * as Linking from 'expo-linking';
import { useEffect, useRef, type RefObject } from 'react';

import { isWidgetRevealUrl } from '@/features/widgets/widget-links';

import type { LockReason } from '../privacy-context';

interface WidgetRevealLinkOptions {
  isEnabled: boolean;
  lockReasonRef: RefObject<LockReason | null>;
  onRevealRequested: () => void;
}

export function useWidgetRevealLink({ isEnabled, lockReasonRef, onRevealRequested }: WidgetRevealLinkOptions) {
  const hasHandledInitialUrl = useRef(false);

  useEffect(() => {
    if (!isEnabled) {
      return;
    }

    const requestReveal = (url: string | null) => {
      if (isWidgetRevealUrl(url) && lockReasonRef.current !== 'widget') {
        onRevealRequested();
      }
    };

    if (!hasHandledInitialUrl.current) {
      hasHandledInitialUrl.current = true;
      void Linking.getInitialURL().then(requestReveal);
    }

    const subscription = Linking.addEventListener('url', ({ url }) => requestReveal(url));

    return () => subscription.remove();
  }, [isEnabled, lockReasonRef, onRevealRequested]);
}

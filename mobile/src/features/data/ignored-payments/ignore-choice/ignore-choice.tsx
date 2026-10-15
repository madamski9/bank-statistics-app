import { useState } from 'react';

import { useCopy } from '@/features/app-shell/localization/language';

import { ignoredPaymentsCopy } from '../ignored-payments-copy';
import type { IgnoreRule, IgnoreTarget } from '../ignore-rule';
import { ChoicePanel } from './components/choice-panel';
import { IgnoreChoiceContent } from './components/ignore-choice-content';
import type { IgnoreChoiceTarget, IgnoreOutcome } from './use-ignore-choice-actions';

export type { IgnoreChoiceTarget, IgnoreOutcome } from './use-ignore-choice-actions';

interface IgnoreChoiceProps {
  target: IgnoreChoiceTarget | null;
  onIgnore: (rule: IgnoreRule) => Promise<void>;
  onStopIgnoring: (target: IgnoreTarget) => Promise<void>;
  onDone: (outcome: IgnoreOutcome) => void;
  onDismiss: () => void;
}

export function IgnoreChoice({ target, onIgnore, onStopIgnoring, onDone, onDismiss }: IgnoreChoiceProps) {
  const copy = useCopy(ignoredPaymentsCopy);
  const [shown, setShown] = useState<IgnoreChoiceTarget | null>(target);
  const [session, setSession] = useState(0);

  if (target !== null && target !== shown) {
    setShown(target);
    setSession((current) => current + 1);
  }

  return (
    <ChoicePanel dismissLabel={copy.cancel} onDismiss={onDismiss} visible={target !== null}>
      {shown !== null ? (
        <IgnoreChoiceContent
          key={session}
          onDismiss={onDismiss}
          onDone={onDone}
          onIgnore={onIgnore}
          onStopIgnoring={onStopIgnoring}
          target={shown}
        />
      ) : null}
    </ChoicePanel>
  );
}

import type { BubbleOrigin } from './glass-bubble';
import type { BubbleKey } from '@/features/app-shell/theme/overview-theme';

export interface BubbleSelection {
  key: BubbleKey;
  origin: BubbleOrigin;
}

interface BubbleSelectionState {
  selection: BubbleSelection | null;
  revision: number;
}

type BubbleSelectionAction =
  | { type: 'select'; selection: BubbleSelection }
  | { type: 'closed'; revision: number };

export const initialBubbleSelection: BubbleSelectionState = {
  selection: null,
  revision: 0,
};

export function bubbleSelectionReducer(
  state: BubbleSelectionState,
  action: BubbleSelectionAction,
): BubbleSelectionState {
  if (action.type === 'select') {
    return { selection: action.selection, revision: state.revision + 1 };
  }

  if (action.revision !== state.revision || state.selection === null) {
    return state;
  }

  return { ...state, selection: null };
}

import { describe, expect, test } from 'bun:test';

import {
  bubbleSelectionReducer,
  initialBubbleSelection,
  type BubbleSelection,
} from './bubble-selection';

const expense: BubbleSelection = {
  key: 'expense',
  origin: { x: 120, y: 300, size: 180, scaleX: 1, scaleY: 1 },
};
const income: BubbleSelection = {
  key: 'income',
  origin: { x: 260, y: 450, size: 120, scaleX: 1, scaleY: 1 },
};

describe('bubble selection lifecycle', () => {
  for (const next of [expense, income]) {
    test(`reopens ${next.key} during expense dismissal and ignores its delayed close`, () => {
      const first = bubbleSelectionReducer(initialBubbleSelection, {
        type: 'select',
        selection: expense,
      });
      const reopened = bubbleSelectionReducer(first, { type: 'select', selection: next });
      const afterOldClose = bubbleSelectionReducer(reopened, {
        type: 'closed',
        revision: first.revision,
      });

      expect(reopened.revision).not.toBe(first.revision);
      expect(afterOldClose).toBe(reopened);
      expect(afterOldClose.selection).toBe(next);
      expect(
        bubbleSelectionReducer(afterOldClose, {
          type: 'closed',
          revision: reopened.revision,
        }).selection,
      ).toBeNull();
    });
  }

  test('reopens immediately after dismissal with a fresh detail instance', () => {
    const first = bubbleSelectionReducer(initialBubbleSelection, {
      type: 'select',
      selection: expense,
    });
    const closed = bubbleSelectionReducer(first, { type: 'closed', revision: first.revision });
    const reopened = bubbleSelectionReducer(closed, { type: 'select', selection: expense });

    expect(reopened.selection).toBe(expense);
    expect(reopened.revision).toBeGreaterThan(first.revision);
    expect(
      bubbleSelectionReducer(reopened, { type: 'closed', revision: first.revision }),
    ).toBe(reopened);
  });

  test('clears selection after repeated interrupted dismissals so the pager can scroll again', () => {
    let state = initialBubbleSelection;
    const staleRevisions: number[] = [];

    for (let index = 0; index < 50; index += 1) {
      state = bubbleSelectionReducer(state, {
        type: 'select',
        selection: index % 2 === 0 ? expense : income,
      });
      staleRevisions.push(state.revision);
    }

    const currentRevision = staleRevisions.pop()!;

    for (const revision of staleRevisions.reverse()) {
      state = bubbleSelectionReducer(state, { type: 'closed', revision });
      expect(state.selection).not.toBeNull();
      expect(state.revision).toBe(currentRevision);
    }

    state = bubbleSelectionReducer(state, { type: 'closed', revision: currentRevision });

    expect(state.selection).toBeNull();
    expect(
      bubbleSelectionReducer(state, { type: 'closed', revision: currentRevision }),
    ).toBe(state);
  });
});

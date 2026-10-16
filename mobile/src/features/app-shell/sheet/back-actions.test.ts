import { expect, test } from 'bun:test';

import { createBackActions } from './back-actions';

test('an empty modal lets its owner handle Back', () => {
  expect(createBackActions().dispatch()).toBe(false);
});

test('Back dismisses the frontmost nested view before its parent', () => {
  const actions = createBackActions();
  const visited: string[] = [];
  const removeChoice = actions.register({ priority: 10, handle: () => visited.push('choice') });
  const removePicker = actions.register({ priority: 1, handle: () => visited.push('picker') });
  const removeDetail = actions.register({ priority: 0, handle: () => visited.push('detail') });

  expect(actions.dispatch()).toBe(true);
  removeChoice();
  expect(actions.dispatch()).toBe(true);
  removePicker();
  expect(actions.dispatch()).toBe(true);
  removeDetail();
  expect(actions.dispatch()).toBe(false);
  expect(visited).toEqual(['choice', 'picker', 'detail']);
});

test('unmounting one view keeps the other modal actions registered', () => {
  const actions = createBackActions();
  let calls = 0;
  const remove = actions.register({ priority: 1, handle: () => { throw new Error('unmounted'); } });
  actions.register({ priority: 0, handle: () => { calls += 1; } });

  remove();
  remove();
  expect(actions.dispatch()).toBe(true);
  expect(calls).toBe(1);
});

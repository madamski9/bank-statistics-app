export interface BackAction {
  priority: number;
  handle: () => void;
}

export function createBackActions() {
  const actions = new Set<BackAction>();

  return {
    register(action: BackAction) {
      actions.add(action);
      return () => { actions.delete(action); };
    },
    dispatch() {
      const action = [...actions].sort((left, right) => right.priority - left.priority)[0];

      if (action === undefined) {
        return false;
      }

      action.handle();
      return true;
    },
  };
}

const activeRuns = new Set<Promise<unknown>>();

export function trackSyncRun<Result>(run: Promise<Result>): Promise<Result> {
  activeRuns.add(run);
  void run.then(
    () => activeRuns.delete(run),
    () => activeRuns.delete(run),
  );
  return run;
}

export async function waitForActiveSync(): Promise<void> {
  while (activeRuns.size > 0) {
    await Promise.allSettled([...activeRuns]);
  }
}

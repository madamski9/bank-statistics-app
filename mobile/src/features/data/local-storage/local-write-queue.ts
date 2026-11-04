let tail: Promise<unknown> = Promise.resolve();

export function queueLocalWrite<Result>(write: () => Promise<Result>): Promise<Result> {
  const next = tail.catch(() => undefined).then(write);
  tail = next;

  return next;
}

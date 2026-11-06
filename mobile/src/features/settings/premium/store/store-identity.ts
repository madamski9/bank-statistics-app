export interface StoreIdentitySdk {
  configure: (customerId: string) => void;
  logIn: (customerId: string) => Promise<unknown>;
  logOut: () => Promise<unknown>;
}

export interface StoreIdentity {
  identify: (customerId: string) => Promise<void>;
  forget: () => Promise<void>;
}

export function storeIdentity(sdk: StoreIdentitySdk): StoreIdentity {
  let isConfigured = false;
  let customerId: string | null = null;
  let pending: Promise<unknown> = Promise.resolve();

  const enqueue = (change: () => Promise<void>): Promise<void> => {
    const next = pending.catch(() => undefined).then(change);
    pending = next;

    return next;
  };

  return {
    identify: (nextCustomerId) =>
      enqueue(async () => {
        if (customerId === nextCustomerId) {
          return;
        }

        if (isConfigured) {
          await sdk.logIn(nextCustomerId);
        } else {
          sdk.configure(nextCustomerId);
          isConfigured = true;
        }

        customerId = nextCustomerId;
      }),
    forget: () =>
      enqueue(async () => {
        if (customerId === null) {
          return;
        }

        customerId = null;
        await sdk.logOut().catch(() => undefined);
      }),
  };
}

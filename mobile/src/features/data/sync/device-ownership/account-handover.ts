export interface AccountHandover {
  claim: (userId: string) => Promise<boolean>;
  previousOwnerOf: () => Promise<string | null>;
  transferOnboarding: (previousUserId: string, userId: string) => Promise<void>;
  transferDevice: (previousUserId: string, userId: string) => Promise<boolean>;
}

export async function isOwnedAfterHandover(handover: AccountHandover, userId: string): Promise<boolean> {
  if (await handover.claim(userId)) {
    return true;
  }

  const previousUserId = await handover.previousOwnerOf();

  if (previousUserId === null || previousUserId === userId) {
    return false;
  }

  await handover.transferOnboarding(previousUserId, userId);

  return handover.transferDevice(previousUserId, userId);
}

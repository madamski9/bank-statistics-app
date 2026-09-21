interface AccountIdentity {
  username?: string | null;
  fullName?: string | null;
  firstName?: string | null;
  primaryEmailAddress?: { emailAddress?: string | null } | null;
}

export function accountInitial(user: AccountIdentity | null | undefined): string {
  const nickname =
    user?.username ??
    user?.fullName ??
    user?.firstName ??
    user?.primaryEmailAddress?.emailAddress ??
    '';

  return nickname.trim().slice(0, 1).toUpperCase() || '?';
}

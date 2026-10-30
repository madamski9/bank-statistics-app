export function banksKey(userId: string): string {
  return `bankstats.onboarding.banks.v1.${userId}`;
}

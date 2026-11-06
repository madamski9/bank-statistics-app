interface LinkedAccount {
  provider: string;
}

export function signsInWithApple(accounts: readonly LinkedAccount[] | undefined): boolean {
  return (accounts ?? []).some((account) => account.provider === 'apple' || account.provider === 'oauth_apple');
}

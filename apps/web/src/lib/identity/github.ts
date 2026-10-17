export type ClerkExternalAccount = {
  provider: string;
  providerUserId: string;
  username: string | null;
};

export function verifiedGithubIdentity(accounts: readonly ClerkExternalAccount[]) {
  const account = accounts.find((candidate) => candidate.provider === 'github' && candidate.providerUserId.length > 0);
  if (!account) return null;

  return {
    providerUserId: account.providerUserId,
    username: account.username,
  };
}

import { describe, expect, it } from 'vitest';
import { verifiedGithubIdentity } from '../../apps/web/src/lib/identity/github';

describe('verifiedGithubIdentity', () => {
  it('uses the provider ID from Clerk and treats the username as display data', () => {
    expect(
      verifiedGithubIdentity([
        { provider: 'google', providerUserId: 'google-id', username: 'same-name' },
        { provider: 'github', providerUserId: 'gh-12345', username: 'octocat' },
      ]),
    ).toEqual({ providerUserId: 'gh-12345', username: 'octocat' });
  });

  it('does not infer a GitHub identity from a username alone', () => {
    expect(verifiedGithubIdentity([{ provider: 'google', providerUserId: 'google-id', username: 'octocat' }])).toBeNull();
  });
});

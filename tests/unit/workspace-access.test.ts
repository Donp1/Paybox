import { describe, expect, it } from 'vitest';
import { requireWorkspaceMembership, type WorkspaceMembership } from '../../apps/web/src/lib/workspaces/access';

const ownerMembership = {
  userId: 'user_owner',
  workspaceId: 'workspace_a',
  role: 'OWNER' as const,
  status: 'ACTIVE' as const,
};

function reader(membership: WorkspaceMembership | null) {
  return { findMembership: async () => membership };
}

describe('requireWorkspaceMembership', () => {
  it('rejects anonymous requests', async () => {
    await expect(
      requireWorkspaceMembership(reader(ownerMembership), null, 'workspace_a'),
    ).rejects.toMatchObject({ status: 401 });
  });

  it('hides workspaces from nonmembers and deactivated members', async () => {
    await expect(
      requireWorkspaceMembership(reader(null), 'user_other', 'workspace_a'),
    ).rejects.toMatchObject({ status: 404 });

    await expect(
      requireWorkspaceMembership(
        reader({ ...ownerMembership, status: 'DEACTIVATED' }),
        'user_owner',
        'workspace_a',
      ),
    ).rejects.toMatchObject({ status: 404 });

    await expect(
      requireWorkspaceMembership(reader(ownerMembership), 'user_other', 'workspace_a'),
    ).rejects.toMatchObject({ status: 404 });
  });

  it('rejects members without the required role', async () => {
    await expect(
      requireWorkspaceMembership(
        reader({ ...ownerMembership, role: 'CONTRIBUTOR' }),
        'user_owner',
        'workspace_a',
        ['OWNER'],
      ),
    ).rejects.toMatchObject({ status: 403 });
  });

  it('returns an active membership for the matching user and tenant', async () => {
    await expect(
      requireWorkspaceMembership(reader(ownerMembership), 'user_owner', 'workspace_a', ['OWNER']),
    ).resolves.toEqual(ownerMembership);
  });
});

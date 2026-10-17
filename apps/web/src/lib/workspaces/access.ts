export type WorkspaceRole = 'OWNER' | 'CONTRIBUTOR';
export type MembershipStatus = 'ACTIVE' | 'DEACTIVATED';

export type WorkspaceMembership = {
  userId: string;
  workspaceId: string;
  role: WorkspaceRole;
  status: MembershipStatus;
};

export type MembershipReader = {
  findMembership(input: { userId: string; workspaceId: string }): Promise<WorkspaceMembership | null>;
};

export class WorkspaceAccessError extends Error {
  constructor(
    readonly status: 401 | 403 | 404,
    message: string,
  ) {
    super(message);
    this.name = 'WorkspaceAccessError';
  }
}

export async function requireWorkspaceMembership(
  reader: MembershipReader,
  userId: string | null,
  workspaceId: string,
  allowedRoles?: readonly WorkspaceRole[],
): Promise<WorkspaceMembership> {
  if (!userId) throw new WorkspaceAccessError(401, 'Sign in is required');

  const membership = await reader.findMembership({ userId, workspaceId });
  if (
    !membership ||
    membership.userId !== userId ||
    membership.workspaceId !== workspaceId ||
    membership.status !== 'ACTIVE'
  ) {
    throw new WorkspaceAccessError(404, 'Workspace not found');
  }

  if (allowedRoles && !allowedRoles.includes(membership.role)) {
    throw new WorkspaceAccessError(403, 'Workspace role is not permitted');
  }

  return membership;
}

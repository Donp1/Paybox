import { auth } from '@clerk/nextjs/server';
import { prisma } from '@bountydesk/db';
import { requireWorkspaceMembership, type WorkspaceRole } from './access';

export async function requireWorkspaceAccess(workspaceId: string, allowedRoles?: readonly WorkspaceRole[]) {
  const { userId } = await auth();
  return requireWorkspaceMembership(
    {
      async findMembership({ userId: memberUserId, workspaceId: memberWorkspaceId }) {
        const membership = await prisma.workspaceMembership.findUnique({
          where: { workspaceId_userId: { workspaceId: memberWorkspaceId, userId: memberUserId } },
        });
        return membership
          ? {
              userId: membership.userId,
              workspaceId: membership.workspaceId,
              role: membership.role,
              status: membership.status,
            }
          : null;
      },
    },
    userId,
    workspaceId,
    allowedRoles,
  );
}

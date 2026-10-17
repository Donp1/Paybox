import { NextResponse } from 'next/server';
import { prisma } from '@bountydesk/db';
import { requireWorkspaceAccess } from '@/lib/workspaces/access-server';
import { WorkspaceAccessError } from '@/lib/workspaces/access';

export const runtime = 'nodejs';

export async function GET(_request: Request, { params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await params;
  try {
    await requireWorkspaceAccess(workspaceId);
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { id: true, name: true, createdAt: true },
    });
    if (!workspace) return NextResponse.json({ error: 'workspace_not_found' }, { status: 404 });
    return NextResponse.json({ workspace });
  } catch (error) {
    if (error instanceof WorkspaceAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}

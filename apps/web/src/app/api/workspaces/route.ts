import { auth, clerkClient } from '@clerk/nextjs/server';
import { prisma } from '@bountydesk/db';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { verifiedGithubIdentity } from '@/lib/identity/github';

const createWorkspaceSchema = z.object({ name: z.string().trim().min(2).max(100) });

export const runtime = 'nodejs';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'authentication_required' }, { status: 401 });

  const memberships = await prisma.workspaceMembership.findMany({
    where: { userId, status: 'ACTIVE' },
    include: { workspace: { select: { id: true, name: true, createdAt: true } } },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json({ workspaces: memberships.map(({ workspace, role }) => ({ ...workspace, role })) });
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'authentication_required' }, { status: 401 });

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const parsed = createWorkspaceSchema.safeParse(input);
  if (!parsed.success) return NextResponse.json({ error: 'invalid_workspace_name' }, { status: 400 });

  const clerk = await clerkClient();
  const clerkUser = await clerk.users.getUser(userId);
  const github = verifiedGithubIdentity(clerkUser.externalAccounts);
  if (!github) return NextResponse.json({ error: 'verified_github_account_required' }, { status: 409 });

  try {
    const workspace = await prisma.$transaction(async (tx) => {
      await tx.appUser.upsert({
        where: { id: userId },
        create: {
          id: userId,
          githubProviderUserId: github.providerUserId,
          githubUsername: github.username,
        },
        update: {
          githubProviderUserId: github.providerUserId,
          githubUsername: github.username,
        },
      });

      return tx.workspace.create({
        data: {
          name: parsed.data.name,
          memberships: { create: { userId, role: 'OWNER' } },
        },
        select: { id: true, name: true, createdAt: true },
      });
    });
    return NextResponse.json({ workspace, role: 'OWNER' }, { status: 201 });
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ error: 'github_account_already_linked' }, { status: 409 });
    }
    throw error;
  }
}

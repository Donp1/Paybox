import { UserButton } from '@clerk/nextjs';
import { auth } from '@clerk/nextjs/server';
import Link from 'next/link';
import { prisma } from '@bountydesk/db';
import { CreateWorkspaceForm } from '@/components/CreateWorkspaceForm';

export default async function HomePage() {
  const { userId } = await auth();

  if (!userId) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-5xl flex-col justify-center gap-7 px-6 py-14">
        <p className="text-sm font-semibold uppercase tracking-widest text-[var(--primary)]">BountyDesk</p>
        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">Verifiable work. Clear rewards.</h1>
        <p className="max-w-2xl text-lg leading-relaxed text-[var(--muted)]">
          Define the work, agree on the checks, and see exactly why a submission passed. Payment automation remains
          disabled while its provider capability is being proven.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link className="rounded-lg bg-[var(--primary)] px-5 py-3 font-semibold text-white" href="/sign-in">
            Create account
          </Link>
          <Link className="rounded-lg border border-[var(--border)] bg-white px-5 py-3 font-semibold" href="/sign-in">
            Sign in
          </Link>
        </div>
        <p className="w-fit rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm font-medium">
          Demo mode · No live payment available
        </p>
      </main>
    );
  }

  const memberships = await prisma.workspaceMembership.findMany({
    where: { userId, status: 'ACTIVE' },
    include: { workspace: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'asc' },
  });

  return (
    <main className="mx-auto min-h-dvh max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
      <header className="mb-12 flex items-center justify-between border-b border-[var(--border)] pb-5">
        <Link className="text-lg font-bold tracking-tight" href="/">
          BountyDesk
        </Link>
        <UserButton />
      </header>
      <section className="mb-10 max-w-2xl">
        <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-[var(--primary)]">Owner setup</p>
        <h1 className="mb-4 text-3xl font-semibold tracking-tight sm:text-4xl">Start with a workspace</h1>
        <p className="text-[var(--muted)]">
          Workspaces keep your bounties and contributors separate. The signed-in account becomes the first owner.
        </p>
      </section>
      <section className="mb-10 rounded-xl border border-[var(--border)] bg-white p-5 sm:p-7">
        <h2 className="mb-5 text-xl font-semibold">Create a workspace</h2>
        <CreateWorkspaceForm />
      </section>
      <section aria-labelledby="workspaces-heading">
        <h2 className="mb-4 text-xl font-semibold" id="workspaces-heading">
          Your workspaces
        </h2>
        {memberships.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[var(--border)] p-6 text-[var(--muted)]">
            No workspaces yet. Create one to get started.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {memberships.map(({ workspace, role }) => (
              <li className="rounded-xl border border-[var(--border)] bg-white p-5" key={workspace.id}>
                <h3 className="font-semibold">{workspace.name}</h3>
                <p className="mt-1 text-sm text-[var(--muted)]">Your role: {role.toLowerCase()}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
      <p className="mt-12 text-sm text-[var(--muted)]">Demo mode · No live payment available</p>
    </main>
  );
}

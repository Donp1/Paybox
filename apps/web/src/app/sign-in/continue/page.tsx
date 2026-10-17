import Link from 'next/link';

export default function ContinueSignInPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl items-center px-5 py-12">
      <section className="w-full rounded-2xl border border-[var(--border)] bg-white p-7 sm:p-9">
        <p className="mb-8 text-sm font-bold tracking-tight text-[var(--primary)]">BountyDesk</p>
        <h1 className="text-2xl font-semibold tracking-tight">One more account step is required</h1>
        <p className="mt-3 leading-relaxed text-[var(--muted)]">
          Clerk needs additional account information before it can finish sign-in. Review the required fields and
          verification settings in your Clerk dashboard, then continue with GitHub again.
        </p>
        <Link className="mt-7 inline-flex min-h-12 items-center rounded-lg bg-[var(--primary)] px-5 font-semibold text-white" href="/sign-in">
          Continue with GitHub
        </Link>
      </section>
    </main>
  );
}

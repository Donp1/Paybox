'use client';

import { useSignIn } from '@clerk/nextjs';
import { useState } from 'react';

export default function SignInPage() {
  const { signIn, fetchStatus } = useSignIn();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function continueWithGithub() {
    if (!signIn) {
      setError('Sign-in is still connecting. Refresh this page and try again.');
      return;
    }
    setPending(true);
    setError('');
    try {
      const result = await signIn.sso({
        strategy: 'oauth_github',
        redirectCallbackUrl: '/sign-in/sso-callback',
        redirectUrl: '/',
      });
      if (result.error) {
        console.error('Clerk GitHub sign-in could not start:', result.error);
        setError('GitHub sign-in could not start. Check your connection and try again.');
      }
    } catch (cause) {
      console.error('Clerk GitHub sign-in failed:', cause);
      setError('GitHub sign-in could not start. Please try again.');
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-5xl items-center px-5 py-12 sm:px-8">
      <section className="mx-auto w-full max-w-md rounded-2xl border border-[var(--border)] bg-white p-7 shadow-sm sm:p-9">
        <p className="mb-8 text-sm font-bold tracking-tight text-[var(--primary)]">BountyDesk</p>
        <h1 className="text-3xl font-semibold tracking-tight">Welcome to BountyDesk</h1>
        <p className="mt-3 leading-relaxed text-[var(--muted)]">
          Sign in or create an account to set up your workspace and publish verifiable work.
        </p>
        <button
          className="mt-8 flex min-h-12 w-full items-center justify-center gap-3 rounded-lg bg-[var(--primary)] px-5 font-semibold text-white hover:bg-[var(--primary-hover)] disabled:cursor-wait disabled:opacity-60"
          disabled={pending || !signIn}
          onClick={continueWithGithub}
          type="button"
        >
          {pending
            ? 'Connecting to GitHub…'
            : !signIn && fetchStatus === 'fetching'
              ? 'Preparing GitHub sign-in…'
              : 'Continue with GitHub'}
        </button>
        <p aria-live="polite" className="mt-3 min-h-5 text-sm text-[var(--blocked)]">
          {error}
        </p>
        {!signIn && fetchStatus === 'idle' && (
          <p className="text-sm text-[var(--blocked)]" role="status">
            Sign-in could not initialize. Refresh this page and try again.
          </p>
        )}
        <p className="mt-5 text-xs leading-relaxed text-[var(--muted)]">
          Continuing uses GitHub to verify your account. BountyDesk receives your GitHub identity; repository access is
          requested separately when you connect a project.
        </p>
        <p className="mt-8 border-t border-[var(--border)] pt-5 text-xs text-[var(--muted)]">
          Demo mode · No live payment available
        </p>
      </section>
    </main>
  );
}

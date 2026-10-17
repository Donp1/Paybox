'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

export function CreateWorkspaceForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const response = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(
          result.error === 'verified_github_account_required'
            ? 'Connect a verified GitHub account in Clerk before creating a workspace.'
            : result.error === 'github_account_already_linked'
              ? 'This GitHub account is already linked to another BountyDesk user.'
              : 'Could not create the workspace. Check the name and try again.',
        );
        return;
      }
      setName('');
      router.refresh();
    } catch {
      setError('Could not reach BountyDesk. Check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="grid gap-3 sm:grid-cols-[1fr_auto]" onSubmit={submit}>
      <div className="grid gap-2">
        <label className="text-sm font-semibold" htmlFor="workspace-name">
          Workspace name
        </label>
        <input
          id="workspace-name"
          className="min-h-12 rounded-lg border border-[var(--border)] bg-white px-4"
          maxLength={100}
          minLength={2}
          onChange={(event) => setName(event.target.value)}
          required
          value={name}
        />
      </div>
      <button
        className="min-h-12 self-end rounded-lg bg-[var(--primary)] px-5 font-semibold text-white disabled:cursor-wait disabled:opacity-60"
        disabled={submitting}
        type="submit"
      >
        {submitting ? 'Creating…' : 'Create workspace'}
      </button>
      <p aria-live="polite" className="text-sm text-[var(--muted)] sm:col-span-2">
        {error}
      </p>
    </form>
  );
}

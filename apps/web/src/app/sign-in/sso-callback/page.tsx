'use client';

import { HandleSSOCallback } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

export default function SsoCallbackPage() {
  const router = useRouter();

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl items-center justify-center px-5 py-12">
      <p className="sr-only" role="status">
        Completing GitHub sign-in…
      </p>
      <HandleSSOCallback
        navigateToApp={({ session, decorateUrl }) => {
          const target = decorateUrl(session?.currentTask ? '/sign-in/continue' : '/');
          window.location.href = target;
        }}
        navigateToSignIn={() => router.replace('/sign-in')}
        navigateToSignUp={() => router.replace('/sign-in/continue')}
      />
    </main>
  );
}

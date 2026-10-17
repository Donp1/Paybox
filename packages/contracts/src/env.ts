import { z } from 'zod';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const baseSchema = z.object({
  DATABASE_URL: z.url().refine((url) => url.startsWith('postgresql://') || url.startsWith('postgres://')),
  APP_ORIGIN: z.url(),
  PAYMENTS_MODE: z.enum(['mock', 'live']),
  VERIFIER_MODE: z.enum(['fixture', 'sandbox']),
  AUTOMATIC_PAYOUTS_ENABLED: z.enum(['true', 'false']).default('false'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type RuntimeKind = 'web' | 'worker';
export type RuntimeEnv = z.infer<typeof baseSchema>;

/** Load the ignored workspace .env in local monorepo runs; deployed env stays platform-managed. */
export function loadWorkspaceEnv(): void {
  let directory = process.cwd();
  while (true) {
    if (existsSync(resolve(directory, 'pnpm-workspace.yaml'))) {
      const envFile = resolve(directory, '.env');
      if (existsSync(envFile)) process.loadEnvFile(envFile);
      return;
    }
    const parent = dirname(directory);
    if (parent === directory) return;
    directory = parent;
  }
}

export function parseRuntimeEnv(kind: RuntimeKind, input: Record<string, unknown>): RuntimeEnv {
  const parsed = baseSchema.safeParse(input);
  if (!parsed.success) {
    const keys = [...new Set(parsed.error.issues.map((issue) => issue.path.join('.') || 'configuration'))];
    throw new Error(`Invalid ${kind} configuration: ${keys.join(', ')}`);
  }

  const env = parsed.data;
  if (kind === 'web') {
    const missingClerk = [
      'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
      'CLERK_SECRET_KEY',
      'NEXT_PUBLIC_CLERK_SIGN_IN_URL',
    ].filter(
      (key) => typeof input[key] !== 'string' || input[key] === '',
    );
    if (missingClerk.length) throw new Error(`Invalid web configuration: ${missingClerk.join(', ')}`);
  }
  if (env.PAYMENTS_MODE === 'live' && env.VERIFIER_MODE === 'fixture') {
    throw new Error('Unsafe payment and verifier mode combination');
  }
  if (env.AUTOMATIC_PAYOUTS_ENABLED === 'true') {
    throw new Error('Automatic payouts remain disabled until the Task 00 provider gate is proven');
  }
  if (kind === 'worker' && env.VERIFIER_MODE === 'sandbox' && !input.E2B_API_KEY) {
    throw new Error('Invalid worker configuration: E2B_API_KEY');
  }
  if (kind === 'worker' && env.PAYMENTS_MODE === 'live') {
    const needed = ['PAYBOX_API_KEY', 'PAYBOX_SIGNING_KEY', 'CHAIN_RPC_URL', 'USDC_CONTRACT'];
    const missing = needed.filter((key) => typeof input[key] !== 'string' || input[key] === '');
    if (missing.length) throw new Error(`Invalid worker configuration: ${missing.join(', ')}`);
  }
  return env;
}

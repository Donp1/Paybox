import { describe, expect, it } from 'vitest';
import { parseRuntimeEnv } from './env';

const shared = {
  DATABASE_URL: 'postgresql://demo:demo@localhost:5432/bountydesk',
  APP_ORIGIN: 'http://localhost:3000',
  PAYMENTS_MODE: 'mock',
  VERIFIER_MODE: 'fixture',
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_example',
  CLERK_SECRET_KEY: 'sk_test_example',
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: '/sign-in',
};

describe('runtime configuration', () => {
  it('accepts safe local web configuration', () => {
    expect(parseRuntimeEnv('web', shared).PAYMENTS_MODE).toBe('mock');
  });

  it('requires Clerk keys for the web process', () => {
    expect(() => parseRuntimeEnv('web', { ...shared, CLERK_SECRET_KEY: '' })).toThrow(
      'Invalid web configuration: CLERK_SECRET_KEY',
    );
  });

  it('rejects fixture verification with live payments without leaking values', () => {
    expect(() => parseRuntimeEnv('worker', { ...shared, PAYMENTS_MODE: 'live' }))
      .toThrow('Unsafe payment and verifier mode combination');
  });

  it('reports missing keys by name without printing their values', () => {
    expect(() => parseRuntimeEnv('worker', { PAYMENTS_MODE: 'mock' }))
      .toThrow(/DATABASE_URL/);
  });
});

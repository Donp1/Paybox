# BountyDesk

BountyDesk is being implemented one handoff task at a time. The current app includes Clerk GitHub sign-in and database-backed workspace ownership and membership checks. Bounty creation, contributor submission/review, and PayBox payment flows are still being implemented. Automatic payouts are disabled.

## Local setup

1. Install Node.js 24 and enable Corepack. Run `corepack pnpm install --frozen-lockfile`.
2. Copy `.env.example` to `.env` at the repository root. The web and worker load this file in local runs. Keep real credentials private and out of Git.
3. Configure Clerk GitHub as the enabled social sign-in provider. Set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, and `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in` in root `.env`.
4. Set `DATABASE_URL` to PostgreSQL 17 and run `corepack pnpm db:migrate` to apply all migrations. `TEST_DATABASE_URL` is only needed for real database integration tests.
5. Run `corepack pnpm dev`. Visit `http://localhost:3000/sign-in`; the custom GitHub OAuth page handles both new accounts and returning users. Create a workspace after signing in. The signed-in Clerk account becomes its owner. `corepack pnpm worker:dev` starts the separate worker when needed; its health URL is `http://localhost:3101/health`.

Alternatively, set `DATABASE_URL`, `APP_ORIGIN`, `PAYMENTS_MODE`, and `VERIFIER_MODE` in the process environment. Process values take precedence over the root `.env`. Corepack can be invoked directly even when `pnpm.cmd` is not on PATH. WSL users can export the same names in their shell.

## Quality commands

`corepack pnpm lint`, `corepack pnpm typecheck`, `corepack pnpm test:unit`, `corepack pnpm test:integration`, `corepack pnpm test:contracts`, `corepack pnpm build`, and `corepack pnpm test:e2e` are the project commands. Database integration needs `TEST_DATABASE_URL`. Contract and browser suites are placeholders until their corresponding integration/UI tasks and must not be reported as passing coverage.

See [implementation status](docs/implementation-status.md), [PayBox capabilities](docs/paybox-capabilities.md), and [frontend design](docs/frontend-design.md).

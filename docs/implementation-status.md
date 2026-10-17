# Implementation status

## Task 00 — PayBox feasibility

Status: documentation gate completed; live provider and marketplace gates blocked by missing account access and unpublished/undiscovered author requirements. Selected outcome: approval route only for now; automatic payouts disabled.

Changed files: `docs/paybox-capabilities.md`, `docs/marketplace-requirements.md`, `scripts/paybox-capability-check.ts`; earlier frontend design at `docs/frontend-design.md`.

Checks: `npm.cmd view @paybox-sh/sdk version dist.tarball --json --cache .npm-cache` returned version 2.2.0. SDK 2.2.0 types/README inspected; official documentation fetched. `node --experimental-strip-types scripts/paybox-capability-check.ts` exited 0: local ERC-20 encoding fixture PASS; SDK runtime check SKIPPED because the package is not installed. No provider credentials or live transfer used. No application tests or running app exist yet.

Task 01 follow-up: after SDK installation, the same script exited 0, loaded `PayboxClient` and reported `canSign: false`; provider listing still skipped because no client credential is configured.

Task 00 credential follow-up: with the user's PayBox credentials in the ignored root `.env`, `node --experimental-strip-types scripts/paybox-capability-check.ts` exited 0. It reported one granted credential and `canSign: true`; no credential identity or secret was emitted. This proves local authentication and signer configuration only, not permission to transfer, approval behavior, broadcast, or on-chain confirmation.

Temporary research files (`.sdk-inspect`, `.paybox-*.txt`, `.fetch-paybox-docs.mjs`, SDK tarball and `.npm-cache`) remain in the workspace: the sandbox's automatic approval review rejected cleanup commands, including exact-file removal. They are not product dependencies or test evidence.

Next ordered task: Task 01, application and quality commands. Preserve the Task 00 capability limits in all UI text and payment configuration.

## Task 01 — Application foundation

Status: foundation implemented; full gate **not yet met** because local PostgreSQL and service startup checks could not run in this environment.

Changed files: workspace manifests and lockfile, `apps/web`, `apps/worker`, `packages/contracts`, `packages/db`, `packages/integrations`, `compose.yaml`, `.env.example`, `.gitignore`, `README.md`, `docs/dependency-matrix.md`, and database smoke test.

Actual checks:

- `corepack pnpm install --frozen-lockfile --offline --store-dir .pnpm-store`: passed after strict peer override; lockfile current.
- `corepack pnpm test:unit`: 3/3 passed. The environment test failed first because `env.ts` was absent, then passed after implementation.
- `corepack pnpm typecheck`: passed.
- `corepack pnpm lint`: passed with 0 warnings after correcting Next root and PostCSS export.
- `corepack pnpm build` with mock environment values: passed; Next compiled `/` and `/api/health`, worker TypeScript build passed.
- `prisma validate` and `prisma generate` with a local placeholder `DATABASE_URL`: passed.
- Initial `corepack pnpm test:integration`: 1 test skipped because `TEST_DATABASE_URL` was absent. The suite was then changed to fail explicitly when the URL is missing. Fresh run exited 1 with `TEST_DATABASE_URL is required for real PostgreSQL integration tests`. The real database test remains **not run**.
- Direct worker launch without configuration: failed at startup with key names only, as intended.
- Web and worker process startup attempts were rejected by the sandbox automatic approval review; HTTP health requests were not executed. The review stated that sandbox approval was required, while this session's policy cannot request it.
- `docker --version`, `psql`, and `pg_ctl`: unavailable. Migration, demo seed, real PostgreSQL smoke test and readiness against a live database were not run.

Ruling: an initial `BootstrapCheck` model and idempotent seed establish the migration/seed path; Task 03 replaces this minimal database content with product models. Cost if wrong: one extra trivial table/migration to retain or remove later.

## Local startup configuration follow-up

The first `pnpm dev` failed because `next.config.ts` validates runtime configuration during startup, while Next runs from `apps/web` and the root `.env.example` was neither copied nor loaded. Added `loadWorkspaceEnv()` to read an ignored root `.env` from the web and worker, clarified setup instructions, and created the local `.env` by copying safe mock-mode placeholders from `.env.example`.

Verification: direct loader/parser probe printed `mock`; `corepack pnpm typecheck` passed; `corepack pnpm --filter @bountydesk/web build` passed and loaded `next.config.ts` using the root `.env`. This resolves the reported missing-variable error. The worker's HTTP health endpoint still needs PostgreSQL to be ready and was not run here.

Online PostgreSQL setup follow-up: the root `.env` contains `DATABASE_URL` (value intentionally not recorded). `packages/db/prisma.config.ts` now loads the shared workspace `.env` before Prisma resolves configuration. A read-only `pg` `SELECT 1` connection check passed. The sandbox's Prisma CLI failed opening TLS with Windows error `P1011`; the user then ran `pnpm db:migrate` successfully from Git Bash and confirmed the bootstrap migration was applied. `TEST_DATABASE_URL` is still unset, so database integration tests remain unavailable.

## Task 02 — Identity and tenant isolation

Status: implementation added; deployment migration and live Clerk sign-in still need to be run by the user.

Implemented Clerk provider, Next.js 16 `src/proxy.ts`, `/sign-in` and `/sign-up`, GitHub external-account mapping from Clerk's server API, app-owned users/workspaces/memberships, owner-only workspace creation, membership-scoped workspace listing/detail API, and shared role guard. Cross-tenant membership misses return 404; role mismatches return 403. Added migration `20261017000200_identity_tenant`.

Verification: `corepack pnpm --filter @bountydesk/db exec prisma validate` passed; Prisma client generation passed; `corepack pnpm test:unit` passed 10/10; root typecheck passed; full `corepack pnpm build` passed; `corepack pnpm lint` passed. The new online database migration is not yet applied. Clerk keys were present in local `.env` without reading or recording their values; provider login was not exercised in a browser.

Custom auth UI follow-up: replaced Clerk's visible sign-in/sign-up views with a branded GitHub-only OAuth flow using `useSignIn().sso()` and the required SSO callback handler. `/sign-up` redirects to `/sign-in`, which handles new and returning GitHub users. Added `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in` to the example and local `.env`. The Clerk instance remains in development mode; this change removes the prebuilt component UI from the app page. OAuth was not exercised against the user's live Clerk application.

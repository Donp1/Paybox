# Task 01 dependency matrix

Pinned 17 October 2026 after registry checks. Runtime is Node.js 24.15.0 on the implementation machine; `package.json` requires Node 24. Package manager is pnpm 10.18.3 through Corepack. The install lock is `pnpm-lock.yaml`.

| Layer | Pinned package versions | Check |
| --- | --- | --- |
| Web | Next.js 16.4.2, React/React DOM 19.3.1, Clerk Next.js 7.9.17 | Next requires Node >=20.9.0; local production build passed. Clerk is installed for Task 02 and is not yet wired into routes. |
| Styling/forms | Tailwind CSS and PostCSS plugin 4.3.3, radix-ui 1.4.3, lucide-react 1.58.0, React Hook Form 7.90.0, Zod 4.6.7 | Tailwind 4 CSS import and PostCSS plugin used in the web build. |
| Database/jobs | PostgreSQL image 17.6, Prisma/client/adapter-pg 7.10.1, pg 8.23.1, pg-boss 12.38.0 | Prisma schema validation and client generation passed. pg-boss requires Node >=22.12.0. Real PostgreSQL test pending local service. |
| Integrations | PayBox SDK 2.2.0, viem 2.57.7, Octokit App 16.1.4, Octokit REST 22.0.1, E2B 2.56.0 | Installed and locked, not yet initialized. PayBox runtime `PayboxClient` check passed with no signer configured. |
| Quality | TypeScript 5.9.3, ESLint 9.39.2, eslint-config-next 16.4.2, Vitest 5.0.5, Playwright 1.64.1 | Typecheck, lint, unit test and production build passed. ESLint 9 printed a maintenance warning, but no lint findings. |

The E2B dependency chain has `ws@7.5.13`, which peers on `utf-8-validate@^5.0.2`. pnpm initially resolved 6.0.6 and strict peer installation failed. Root `pnpm.overrides` pins 5.0.10; strict peer install then passed. pnpm did not run its optional native build script, so integration performance/compatibility must be tested when E2B is used in Task 05.

Corepack needed a workspace-local `COREPACK_HOME` because the sandbox cannot write to the default user cache. The pnpm store is workspace-local. On a normal machine, `corepack pnpm install --frozen-lockfile` uses the lockfile without those overrides.

# BountyDesk — Coding Agent Implementation Handoff

Prepared 17 October 2026. Product specification, architecture, sequential implementation plan, and acceptance tests.

> **For the implementing agent:** Execute this document task by task, in order. Use `superpowers:executing-plans` if available; otherwise follow the same checklist and verification gates. This document is the specification. Do not start a second product discovery cycle. Inspect the existing repository and its instructions first, preserve unrelated work, and adapt paths to existing conventions. Ask only when a missing decision or permission genuinely blocks progress. Never invent provider functionality or mark an unexecuted test as passed.

**Goal:** Build a working bounty platform that checks objectively verifiable work, explains the result, and pays the assigned contributor through PayBox when the owner’s prior authorization and the provider’s capabilities permit it. Reviews must continue when the owner closes their browser.

**Architecture:** A TypeScript modular monolith with a Next.js web process, a separate durable Node.js worker, PostgreSQL, and isolated verification sandboxes. Both processes use shared application services. PayBox is the payment integration; the language model is never the payment authority.

**Tech stack:** Next.js App Router, React, TypeScript, Tailwind CSS, shadcn/ui, Clerk, PostgreSQL, Prisma ORM, pg-boss, official PayBox Node SDK, viem, GitHub App/Octokit, E2B, Vitest, Playwright, Docker, GitHub Actions, Railway.

**Spec:** Sections 1–9 below. **Execution plan:** Section 10. **Release gates:** Sections 11–13.

## Global constraints

- No real transfers during routine development or CI. A live financial test needs a separately authorized recipient, asset, chain, maximum amount and fee budget.
- Never bypass PayBox approval, signing, client, or plugin restrictions. No internal PayBox endpoints or hidden completion tools.
- Never run contributor code inside the web process, payment worker, or any environment containing credentials.
- Store monetary values as integer atomic units, never floating point. Use decimal strings across JSON boundaries.
- A successful signature is not a completed transfer. Show Paid only after transaction confirmation and recipient/asset/amount verification.
- All state-changing operations require server-side authentication, authorization, input validation and audit records.
- Build one complete vertical slice before optional features. No escrow contract, custom token, bridge, DAO voting, mobile app or generalized autonomous agent framework in the MVP.

## Review focus

Review money movement, duplicate delivery, lost provider responses, concurrency, tenant isolation, trusted verification, credential leakage, owner revocation and accurate payment status. UI polish cannot compensate for a failed release gate.

## 1. Product and example

BountyDesk turns a bounty into an explicit agreement: what to deliver, how it will be tested, who may claim the reward, what the reward is, and when payment is authorized. A background worker evaluates a frozen submission against frozen rules. A passing result creates an eligible award; the payment service separately evaluates authorization and funding before starting payment.

**Demo story:** A project owner offers 5 USDC for repairing a JavaScript function that exports records to CSV. The owner selects a trusted test template, assigns a contributor, verifies the destination wallet, and enables a bounded payment policy. The contributor submits a GitHub commit. The first version fails escaping and missing-value tests; BountyDesk explains the failure. The corrected version passes. If the verified PayBox headless route and grant permit it, the worker signs and broadcasts the fixed reward while the owner is offline. Otherwise, the UI truthfully shows “Review passed — payment needs your approval.” The owner returns to a digest and an evidence receipt.

The reward is illustrative, not authorization to spend. Automated checking establishes compliance with the selected tests, not universal software correctness.

### MVP scope

- One workspace owner, invited/assigned contributors, multiple bounties, one reward winner per bounty.
- GitHub-connected, objective JavaScript function bounties using a controlled template. Allow only the declared solution file; no arbitrary repository builds.
- Immutable accepted terms, immutable commit submissions, feedback and resubmission.
- One EVM chain and one approved USDC contract. Preferred candidate: Base, subject to Task 00 verification. Do not silently substitute chains or assets.
- Deterministic review, bounded policy, durable jobs, payment reconciliation, evidence receipt, owner digest.
- PayBox marketplace/plugin integration only in its verified supported format.

### Differentiators to implement

1. **Acceptance preview:** contributors see precise criteria and sample tests before starting.
2. **Terms lock:** owner cannot silently change the reward or tests after contributor agreement.
3. **Explain and retry:** failures identify the criterion and expected behavior, with a new immutable submission on retry.
4. **Evidence receipt:** one screen links terms, exact commit, check version, outcome and confirmed payment.
5. **Offline continuity:** reviews and reconciliation survive browser closure and worker restarts.
6. **Honest automation indicator:** display Review automatic / Payment automatic eligible / Approval required / Reconnect required separately.

Later: milestone rewards, more verifier templates, contributor reliability statistics based on completed work, optional summaries, independent dispute review. These are not initial release blockers.

## 2. What the PayBox documentation actually establishes

The supplied `https://developer.paybox.sh/` is the hackathon landing page; its documentation link is `https://docs.paybox.sh/`. Findings below were checked against the public documentation on 17 October 2026, including rendered SDK and MCP reference pages. Recheck before coding because integration surfaces can change.

| Finding                                                                                               | Implementation consequence                                                                                                                                       |
| ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Official package: `@paybox-sh/sdk`, exporting `PayboxClient`                                          | Use the official SDK behind one adapter; inspect installed types instead of inventing methods.                                                                   |
| SDK supports in-process signing with a paired `pbxk1.` key when the grant permits it                  | A headless worker is plausible; a browser-based MCP signing window is not the only route. Prove the exact transfer path first.                                   |
| Scoped client grants and approval modes govern operations                                             | App policy is an additional restriction; it cannot expand the provider grant.                                                                                    |
| Plugin money tools require approval even under autonomous grants                                      | Do not advertise unrestricted offline plugin payouts. Verify whether the proposed core signing route is allowed for this integration and competition.            |
| `request_wallet_sign` can return a serialized EVM transaction                                         | Signing and broadcasting are separate concerns. Validate the signed transaction, broadcast using the configured chain RPC, then verify the receipt.              |
| Pending operations must be polled using the original request ID                                       | Never reissue a write simply to complete a pending request.                                                                                                      |
| `request_payment` concerns a merchant-scoped virtual card                                             | Do not use it as an invented contributor crypto-payout API.                                                                                                      |
| OAuth supports PKCE and optional refresh credentials; personal scoped API keys also exist             | Keep auth server-side. An offline token alone does not give signing authority.                                                                                   |
| `pay_x402` and `use_service` pay for resources                                                        | These do not establish a generic contributor disbursement API. Do not introduce fake x402 purchases to evade approval.                                           |
| Plugin discovery exists, but third-party publication requirements were not established by these pages | Verify registration, hosting, contract/manifest and submission requirements in Task 00. MCP compatibility alone is insufficient proof of marketplace acceptance. |

**Payment capability gate:** Enable `AUTOMATIC_PAYOUTS_ENABLED` only after proving bounded authorization, headless signing, token transfer encoding, safe nonce handling, broadcast, reconciliation, restart recovery and revocation behavior. If the route cannot be established, ship automatic review with a real PayBox approval/signing step and clearly label the limitation. This is a supported fallback, not a reason to simulate a successful transfer.

**Important SDK distinction:** The MCP reference describes an interactive signing window; the SDK page additionally documents in-process signing. Neither page alone proves that every plugin or every deployment permits unattended payout. The feasibility report must identify the exact supported route used.

## 3. Stack decisions

These are project choices, not claims that there is one universally best stack.

| Layer             | Choice                                                   | Reason and constraint                                                                                                                                                 |
| ----------------- | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Runtime/workspace | Node.js 24 line, pnpm workspaces, strict TypeScript      | Shared language across UI and jobs. Pin compatible patch versions and the package manager after checking engines.                                                     |
| Web/API           | Next.js 16 App Router with compatible React              | One web application and API boundary. Use Node runtime for provider/database routes.                                                                                  |
| UI                | Tailwind CSS, shadcn/ui, Lucide icons                    | Accessible primitives and consistent visual system with little custom infrastructure.                                                                                 |
| Forms/contracts   | React Hook Form and Zod                                  | Shared input contracts; validate again at server entry.                                                                                                               |
| Authentication    | Clerk with GitHub sign-in                                | Fast account/session setup. App membership and repository access remain separate authorization checks.                                                                |
| Database          | PostgreSQL 17, Prisma ORM 7                              | Relational constraints and transactions. Use the latest supported patches in these major lines; verify package compatibility rather than installing unbounded latest. |
| Durable jobs      | pg-boss and a separate Node worker                       | Uses PostgreSQL; no Redis dependency. Queue delivery does not make external payments exactly once.                                                                    |
| PayBox            | `@paybox-sh/sdk`                                         | Encapsulate provider result mapping, signing and request polling. No credentials in browser bundles.                                                                  |
| EVM               | viem                                                     | Encode a strictly allowed ERC-20 transfer, validate signed transactions, query balances/nonces and verify receipts. No arbitrary contract-call endpoint.              |
| GitHub            | GitHub App and Octokit                                   | Repository-scoped reads, webhooks and installation permissions. Sign-in is not a substitute for installation authorization.                                           |
| Verification      | E2B microVM sandbox; no internet; fixed template         | Execute only constrained solution code, with enforced time/output limits. A container on the payment host is not a sufficient substitute.                             |
| Tests             | Vitest, real PostgreSQL integration tests, Playwright    | Domain tests, concurrency/fault tests and end-to-end user journeys.                                                                                                   |
| Hosting           | Railway: web service, worker service, PostgreSQL         | Keep the worker running independently of HTTP requests. Configure separate service start commands.                                                                    |
| Operations        | Structured JSON logs, health endpoints, error monitoring | Correlate bounty/submission/job/request/transaction IDs without logging credentials.                                                                                  |

Do not add NestJS, Express, Redis, GraphQL, Kubernetes or event-sourcing infrastructure without a demonstrated need. Existing compatible project conventions take precedence over unnecessary migration.

Resolve and lock all dependencies once in Task 01. Record exact versions, Node engine checks and build results in `docs/dependency-matrix.md`. No prerelease packages for core money or auth paths. Tailwind/shadcn and Prisma setup must match the installed major, not remembered tutorial syntax.

**AI layer:** Optional behind `FeedbackExplainer`. Start with deterministic human-readable feedback. If adding an LLM, send sanitized check facts only, enforce a structured output schema, timeout gracefully, and fall back to templates. The model cannot change pass/fail, recipients, amounts, policy, or payout state.

## 4. Architecture and patterns

Use domain-oriented modules and ports/adapters. Routes authenticate and validate; application services own use cases; pure domain functions enforce invariants; adapters talk to PayBox, GitHub, the database and sandbox.

| Pattern                 | Exact application                                                                               |
| ----------------------- | ----------------------------------------------------------------------------------------------- |
| Modular monolith        | Separate bounty, verification, policy, payout and identity modules within one repository.       |
| Explicit state machines | Central transition functions for submissions and payments; illegal transitions fail.            |
| Transactional outbox    | Save domain changes and an outbox event in one database transaction; dispatcher enqueues jobs.  |
| Idempotent consumers    | Deduplicate event/job effects using database uniqueness and current state.                      |
| Atomic reservations     | Reserve reward against workspace budget under transaction locks.                                |
| Ports/adapters          | Provider integration never leaks into UI components or acceptance rules.                        |
| Optimistic concurrency  | Version checks for edit/publish/accept actions; reject stale updates with conflict responses.   |
| Append-only audit       | Record who caused each policy, evidence and payout transition. This is not full event sourcing. |

### Repository map

```text
apps/web/src/app/                  pages, route handlers, loading/error states
apps/web/src/components/           UI and feature components
apps/worker/src/main.ts            process lifecycle and job registration
apps/worker/src/jobs/              verification, payout, reconcile, digest
packages/domain/src/bounties/      immutable terms and claims
packages/domain/src/verification/  deterministic decision rules
packages/domain/src/payments/      payout state machine and policy
packages/application/src/         use cases and port interfaces
packages/contracts/src/           Zod DTOs and error codes
packages/db/prisma/                schema and migrations
packages/db/src/                   repositories, transactions and outbox
packages/integrations/src/paybox/  SDK adapter and result normalization
packages/integrations/src/github/  App client and webhook verification
packages/integrations/src/runner/  sandbox adapter
packages/integrations/src/chain/   viem adapter and transaction verification
tests/unit/                       policy and state-machine cases
tests/integration/                database and provider fault cases
tests/e2e/                        browser journeys
fixtures/                         good, bad and hostile submissions
docs/                             capability report, decisions, runbook, evidence
```

Keep functions focused. Do not make one enormous service or one generic repository abstraction for every model. Database transactions must be short; never hold a SQL lock while waiting for a provider response.

### Internal port contracts (BountyDesk-owned, not provider API names)

```ts
type AtomicAmount = string; // validated positive base-10 integer string
type PaymentSnapshot = {
  requestId?: string;
  state:
    | "approval_required"
    | "signature_required"
    | "signed"
    | "broadcast"
    | "confirmed"
    | "denied"
    | "failed"
    | "unknown";
  signedTransactionRef?: string; // encrypted storage reference, never UI data
  transactionHash?: string;
  reasonCode?: string;
};
interface PaymentPort {
  capabilities(connectionId: string): Promise<PaymentCapabilities>;
  start(intent: AuthorizedPayoutIntent): Promise<PaymentSnapshot>;
  reconcile(intentId: string): Promise<PaymentSnapshot>;
}
interface VerificationPort {
  run(input: ImmutableVerificationInput): Promise<VerificationEvidence>;
}
```

Define the referenced types in shared contracts. `AuthorizedPayoutIntent` must be constructed by the policy service, never directly from a browser or model payload. `start` is one logical initiation; adapter code must not automatically retry a non-idempotent provider write.

## 5. Data model and invariants

Use UUID IDs, UTC timestamps, foreign keys, indexed state/next-run fields, and explicit unique constraints. Store chain atomic amounts in `numeric(78,0)` or equivalent exact decimal storage; convert to bigint in domain logic. Never use SQL floating point or JavaScript Number for value arithmetic.

| Entity                        | Required information / invariant                                                                                                           |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| User / Workspace / Membership | Auth subject, role, active status. Every workspace resource is tenant-scoped.                                                              |
| GitHubConnection              | Installation ID, authorized repo IDs and verified user mapping. No access inferred from username text.                                     |
| PaymentConnection             | Owner, client/credential references, encrypted auth material reference, signing capability, mode, last checked time.                       |
| WalletBinding                 | User, chain, canonical address, nonce challenge, expiry, verification time and version.                                                    |
| Bounty                        | Workspace, owner, status, assigned claimant, active terms version, fixed reward.                                                           |
| BountyTerms                   | Version, criteria, template hash, permitted files, repository ID, deadline, asset/chain/reward, review mode. Immutable after acceptance.   |
| Claim                         | One assigned contributor and accepted terms hash. One active claim per MVP bounty.                                                         |
| Submission                    | Claim, terms ID, repo ID, PR reference, exact commit SHA, solution content hash, submitted time. Immutable.                                |
| VerificationRun / CheckResult | Submission, verifier/template version, input hashes, result, bounded evidence, timing. Infrastructure errors differ from failed criteria.  |
| SpendingPolicy                | Owner, connection, credential, exact chain/token, per-award limit, total limit, recipient restrictions, expiry, revision and revoked time. |
| BudgetReservation             | Award/payout ID, amount, asset, state; no reservation released while outcome is ambiguous.                                                 |
| Award / PayoutIntent          | Unique reward slot per bounty, selected submission, frozen wallet/version, policy revision, amount, chain, token, state.                   |
| PaymentAttempt                | Stable logical intent key, provider request ID, nonce, signed transaction hash/reference, tx hash, normalized/raw-redacted status.         |
| Outbox / WebhookInbox         | Unique event identity and processing state. Dedupe before effects.                                                                         |
| AuditEvent / DigestItem       | Actor, tenant, entity, action, reason, correlation IDs. No secrets or private solution code in logs.                                       |

Critical database constraints: one award per bounty; one logical payout per award; unique provider request ID when present; unique chain/sender/nonce for active managed transactions; unique webhook delivery ID per provider; unique submission identity within the claim; unique outbox effect key.

Rules: accepted terms cannot be edited in place; reward cannot change after acceptance; wallet changes never redirect an existing payout; contributor cannot review their own work; owner can revoke future authorization but cannot undo a broadcast transaction. Revocation before signing/broadcast blocks the next irreversible action, subject to unavoidable provider race boundaries, which must be documented.

### State machines

Submission: `SUBMITTED → QUEUED → VERIFYING → PASSED | NEEDS_CHANGES | NEEDS_REVIEW`.

Infrastructure failures retry within limits, then become `NEEDS_REVIEW` with an infrastructure reason, not “bad work.” A resubmission creates a new row; old results remain. Only the currently selected eligible submission may create the single award. An earlier passing run finishing late cannot create a second reward.

Payout: `ELIGIBLE → RESERVED → INITIATING → APPROVAL_REQUIRED | SIGNATURE_REQUIRED | SIGNED | UNKNOWN | DENIED | FAILED`; `SIGNED → BROADCAST → CONFIRMED`. Ambiguous initiation/broadcast becomes `UNKNOWN` and enters reconciliation. An approval or signature wait is resumable using the same provider request. `CONFIRMED` is monotonic except a separately documented chain-reorganization correction process; never silently reset it to ready.

## 6. Payment correctness and credential boundaries

1. Re-read eligible evidence, frozen terms, claimant wallet, policy, revocation, expiry and amounts server-side.
2. Reserve budget atomically and persist the intent plus outbox event. Accounting reservations are not on-chain escrow and do not guarantee funds remain in the wallet.
3. Claim the intent for processing using a database state transition. Persist `INITIATING` before calling the provider.
4. Use only the selected credential, chain, approved token contract, exact reward and verified destination. Reject zero address and unsupported chains. Bound gas expenditure separately from the USDC reward budget.
5. Coordinate nonce allocation per chain/sender. For the MVP use a dedicated wallet/credential and one active outbound transaction per sender; external wallet spending may still invalidate assumptions. Reconcile pending nonces before allocating another.
6. Construct only ERC-20 `transfer(recipient, amount)` with zero native value to the allowlisted token contract. Simulate where available. Do not allow arbitrary calldata, approvals, permit signatures, raw digest signing, delegation, or unlimited allowances.
7. Ask PayBox to sign through the verified SDK path. Decode the returned signed transaction and compare sender, chain, nonce, destination contract, calldata, value and fee ceilings to the stored intent.
8. Persist the encrypted signed bytes and derived hash before broadcasting. Re-broadcasting the exact same bytes can be recoverable; signing a new transaction is a different action and must not be used blindly to resolve uncertainty.
9. Poll chain/provider state. Confirm receipt success and the exact token transfer event/recipient/amount. Apply the documented confirmation threshold for the chosen chain.
10. Atomically mark confirmed and consume the reservation once. Create the evidence receipt and owner digest entry.

**Lost response:** If a write may have reached PayBox but no request ID was received, do not initiate a second write. Mark UNKNOWN. Use documented request history only if exact correlation is possible; time/amount similarity is insufficient. If no safe recovery is available, require operator reconciliation and keep the budget reserved. A local idempotency key does not prove provider-side deduplication. Task 00 must determine the actual provider contract.

**Tokens and signing keys:** MVP is a single sponsoring workspace connection provisioned by its owner using PayBox’s supported pairing flow. Do not let a different workspace use that connection. Store signing material and auth tokens in the worker’s secret store; never in client components, logs, sandbox, repository, evidence, or public environment variables. The paired SDK signing key is sensitive even though it is not the raw wallet private key. Multi-owner self-service onboarding is a later phase unless the provider’s supported pairing flow is verified and implemented safely.

If using rotating OAuth refresh tokens, serialize refresh per connection and atomically replace credentials. A timeout during refresh may leave a token spent; do not replay indefinitely. Reauthorization is preferable to triggering replay revocation. Never treat a personal API key as an OAuth client secret.

## 7. Trusted verification design

For the first release accept one JavaScript function file with a fixed exported interface, e.g. `exportCsv(records): string`. The owner selects a versioned BountyDesk-maintained template; they do not upload arbitrary shell scripts. Tests check ordering, quoting, Unicode, commas, newlines, empty input, missing values and preservation of records. Randomized fixtures reduce trivial hardcoding, but do not prove general correctness.

Fetch the assigned contributor’s declared commit through the authenticated GitHub adapter. Verify repository, author/claim relationship and exact SHA; freeze the bytes. Never read a moving branch again during verification. Ignore contributor workflow results as payment authority.

Run code in an ephemeral E2B sandbox with outbound internet disabled, no credentials, pinned runtime, strict process/memory/time/output limits and teardown in a `finally` block. No dependency installation or package lifecycle scripts from the submission. Disallow extra files and imports in this constrained template. Treat Node's `vm` as a convenience, never a security boundary.

Keep the authoritative test inputs and expected outputs in the trusted worker. Send individual test inputs to the isolated solution, parse a bounded JSON result, and compare outside the untrusted process. Never accept a contributor-written `passed: true` report or process exit code as proof. The sandbox host/SDK must enforce termination even if the solution loops or floods output. If required controls cannot be verified, disable code execution rather than running it on the payment host.

Checks yield structured evidence: criterion ID, expected behavior, actual summary, pass/fail, commit, content hash, template hash and execution timestamp. Escape output as plain text; sanitize any Markdown. Prompt-injection text in source or PR descriptions is data. If an optional explainer fails, deterministic checks and template feedback still work.

## 8. API, agent tools and interface

### Application endpoints

All are BountyDesk routes, not PayBox endpoints. Use `/api/v1`. Validate Zod DTOs; return `{error: {code, message, correlationId}}` consistently. Use 401/403 for auth, 409 for stale/illegal state, 422 for invalid input, 429 for limits. Do not leak cross-tenant existence.

| Operation               | Route / authorization                                                           |
| ----------------------- | ------------------------------------------------------------------------------- |
| Create/edit draft       | `POST /bounties`, `PATCH /bounties/:id`; workspace owner                        |
| Publish immutable terms | `POST /bounties/:id/publish`; owner, expected version                           |
| Accept assigned claim   | `POST /bounties/:id/accept`; assigned contributor, terms hash                   |
| Submit commit           | `POST /bounties/:id/submissions`; claimant, accepted terms, exact SHA           |
| Read evidence           | `GET /submissions/:id`; authorized owner or claimant                            |
| Read payout/receipt     | `GET /payouts/:id`, `GET /payouts/:id/receipt`; scoped participant              |
| Configure/revoke policy | `POST /policies`, `POST /policies/:id/revoke`; owner with recent authentication |
| Wallet proof            | `POST /wallets/challenge`, `POST /wallets/verify`; signed-in contributor        |
| GitHub webhook          | `POST /webhooks/github`; verify HMAC over raw body and dedupe delivery          |
| Integration status      | `GET /connections/paybox/status`; owner, redacted capabilities                  |

Implement request idempotency for submissions/publishing where relevant: same key + same body returns original result; same key + different body returns conflict. Every resource lookup includes membership/ownership authorization. Client-provided user IDs, totals and pass/fail results are never trusted.

Wallet proof uses a standard domain-bound, nonce-bound sign-in message with expiry and chain binding; consume nonce once. Use viem verification utilities, not handwritten cryptography. Support EOAs first; explicitly reject unsupported smart-wallet proofs rather than falsely accepting them.

### Plugin / agent surface

Task 00 determines the actual marketplace packaging. Suggested application tools: `list_bounties`, `get_bounty`, `submit_work`, `get_review`, `get_payment_status`, `get_owner_digest`. A `create_bounty_draft` tool may prepare terms but cannot silently authorize spending. Do not expose a generic `send_money` or `override_review` tool.

Tools call the same application services as the UI. Bind each tool invocation to an authenticated user/workspace and narrow scopes; a tool argument cannot choose its own identity. Apply rate limits and input size limits. If MCP is the required transport, use the current official TypeScript SDK and verified authentication flow; do not invent a custom protocol or assume PayBox bearer tokens are valid credentials for BountyDesk.

### Screens and design direction

- Owner overview: budgets, eligible awards, approval queue, current jobs and recent receipts.
- Bounty builder: criteria preview, fixed reward, chain/asset, contributor, deadline and explicit payment mode before publishing.
- Contributor workspace: accepted terms, exact commit submission, progress and actionable feedback.
- Review detail: criterion-by-criterion evidence and submission history.
- Payment detail: recipient, asset, amount, state, approval action if required, transaction and receipt.
- Settings: GitHub connection, PayBox capability status, policy expiry and revoke action.

Use a calm light interface: off-white background, dark slate text, teal primary actions, amber pending, red blocked, green confirmed. Prefer readable tables and evidence timelines to decorative charts. Use an 8px spacing rhythm, clear headings, modest corner radii and visible focus states. Responsive at 390px and desktop widths. Status cannot rely on color alone. Include empty, loading, stale, disconnected, denied, unknown and retry states. Make address copying easy and show the full address before confirmation. Never label signed or broadcast as Paid.

## 9. Configuration and operations

Create `.env.example` with placeholders only and validate environment variables on startup. Distinguish vendor-defined keys from BountyDesk configuration.

Required groups: database URL; Clerk public/secret keys; GitHub App ID/private key/webhook secret; PayBox connection configuration and secure signing-key reference; chain RPC URL, chain ID and approved token contract/decimals; sandbox API key/template ID; public app origin; encryption-key reference; log level. Use SDK-documented `PAYBOX_API_KEY`, `PAYBOX_API_URL` or explicit client configuration as supported by installed types. Do not invent a vendor signing-key environment variable: pass the secure key through the documented SDK configuration.

BountyDesk-owned flags: `PAYMENTS_MODE=mock|live`, `AUTOMATIC_PAYOUTS_ENABLED=false`, `VERIFIER_MODE=fixture|sandbox`, and configurable reward/fee/time/output limits. Mock and fixture mode must show persistent Demo labels; production startup rejects fixture verifier with live payments. Web service does not receive signing keys; verification sandboxes receive no application secrets.

Local development: Docker Compose PostgreSQL, web process, worker process and seeded demo fixtures. Provide Windows/WSL-compatible instructions and pnpm scripts. Railway deploys separate web/worker services from one repository with distinct start commands and environment scopes. Apply migrations as a release step, not concurrently from every replica. Configure backups, health/readiness checks, graceful worker shutdown and restart recovery.

Monitor queue age, verification failures, pending/unknown payouts, stale connection state and reconciliation lag. Log correlation IDs and redacted statuses. Do not log OAuth tokens, signing keys, signed transaction bytes, request headers or private source. A runbook must explain pausing new payouts, reconciling uncertain attempts, revoking access, restoring a database backup and resuming workers without duplicate transfers.

## 10. Ordered implementation tasks

Perform each task completely before proceeding to its dependent task. For behavior changes: write a meaningful failing test, implement the smallest correct change, run the targeted tests, review the diff, and record the result. Commit at coherent task boundaries if repository policy allows. Update `docs/implementation-status.md` with changed files, commands, actual outcomes and blockers. A skipped external test is not a pass.

### Task 00 — Prove integration feasibility

**Files:** `docs/paybox-capabilities.md`, `docs/marketplace-requirements.md`, `scripts/paybox-capability-check.ts`.

- [ ] Read the official sources in Section 14 and inspect the current SDK types without exposing credentials.
- [ ] Document auth, pairing, grant, signing, raw transaction output, request polling, provider deduplication/recovery and supported chain/token behavior.
- [ ] Verify headless signing separately from plugin money-tool approval rules; record the supported route and its restrictions.
- [ ] Determine marketplace publishing/manifest requirements and any credential forwarding restrictions. Do not assume a standalone site qualifies.
- [ ] Make read-only checks when credentials exist. Prove transfer encoding/recovery in mocks or supported sandbox/testnet; any real transfer requires the owner's explicit bounded authorization.
- [ ] Record one outcome: automatic route proven / approval route only / provider integration blocked. Gate features accordingly and continue independent work.

**Gate:** No undocumented payment method, hidden endpoint, guessed idempotency behavior or unverified automatic-payment claim. A blocked live capability remains visible in the final report.

### Task 01 — Establish the application and quality commands

**Files:** workspace manifests, `apps/web`, `apps/worker`, shared package manifests, `compose.yaml`, `.env.example`, `docs/dependency-matrix.md`.

- [ ] Inspect existing repository/AGENTS instructions; preserve changes and reuse compatible conventions.
- [ ] Scaffold or extend the selected stack, lock versions, enable strict TypeScript and secret exclusions.
- [ ] Implement startup environment validation and separate web/worker health checks.
- [ ] Add scripts listed in Section 12 and a minimal database integration smoke test.

**Gate:** Fresh install, typecheck, production build and local web/worker startup succeed; missing secrets fail with redacted configuration errors.

### Task 02 — Identity and tenant isolation

**Files:** auth integration, workspace services, membership migrations, `tests/integration/authorization.test.ts`.

- [ ] Add Clerk sessions and explicit owner/contributor membership checks.
- [ ] Implement server-side guards shared by all routes and tools.
- [ ] Verify GitHub identity mapping; do not trust user-entered usernames.
- [ ] Test anonymous, wrong workspace, wrong role and deactivated membership access.

**Gate:** Cross-tenant reads and writes fail, including guessed IDs and direct API calls. Hiding buttons is insufficient.

### Task 03 — Schema, states, budgets and outbox

**Files:** Prisma schema/migrations, domain state machines, budget repository, outbox dispatcher and corresponding unit/integration tests.

- [ ] Implement Section 5 models, uniqueness, state transitions and exact monetary arithmetic.
- [ ] Add atomic reservation/consume/release services with concurrency tests against PostgreSQL.
- [ ] Save events transactionally; dispatch to pg-boss with idempotent consumer effects.
- [ ] Add graceful shutdown and stale-job recovery.

**Gate:** Competing awards cannot exceed the budget or duplicate a reward. Crashes after database commit but before enqueue do not lose work. Duplicate delivery does not duplicate effects.

### Task 04 — Bounty agreement and contributor flow

**Files:** bounty services/DTOs/routes, builder and detail screens, wallet proof service, acceptance tests.

- [ ] Implement create draft, publish, assigned claim, terms acceptance and exact-SHA submission.
- [ ] Add immutable terms hash and template/version binding.
- [ ] Verify and freeze contributor wallet; require fresh agreement for a new terms version.
- [ ] Enforce deadlines and stale-version conflicts; preserve earlier submission history.

**Gate:** Owner cannot change accepted terms in place. Contributor cannot submit against another claim. Wallet edits cannot redirect an existing payout.

### Task 05 — GitHub ingestion and trusted verifier

**Files:** GitHub adapter/webhook route, runner adapter, CSV template, good/bad/hostile fixtures, verifier tests.

- [ ] Fetch immutable solution bytes using installation-scoped GitHub access.
- [ ] Validate raw webhook signatures and replay deduplication; payload alone never authorizes a result.
- [ ] Implement the controlled sandbox and trusted external result comparison from Section 7.
- [ ] Verify network isolation, timeouts, output limits and teardown.
- [ ] Bind every result to SHA, content hash and trusted template hash.

**Gate:** Known-good code passes; incorrect code fails; a fake success report does not pass; malicious/infinite code cannot access credentials or hang the worker. Infrastructure failure becomes Needs review.

### Task 06 — Durable review and useful feedback

**Files:** verification jobs, review decision service, feedback templates, review screens, restart tests.

- [ ] Queue submissions automatically and expose progress without relying on an open browser.
- [ ] Produce criterion-level feedback and allow immutable resubmission.
- [ ] Select one passing submission for the award under an atomic eligibility check.
- [ ] Add optional sanitized AI explanations only after deterministic feedback is complete.

**Gate:** Closing the owner browser does not stop review. Duplicate or out-of-order run completion cannot create duplicate awards. AI failure cannot change eligibility.

### Task 07 — PayBox adapter and payment state mapping

**Files:** PayBox adapter, secure connection service, chain adapter, contract tests with redacted fixtures.

- [ ] Integrate official SDK methods verified in Task 00; keep fake adapter for tests only.
- [ ] Normalize every documented pending, success, denied and error result, preserving request identity.
- [ ] Implement approval/signature continuation through the original request.
- [ ] Implement constrained transfer construction and signed transaction validation.
- [ ] Implement serialized refresh if OAuth is used; test token expiry/revocation.

**Gate:** No browser secret leakage. Signature success is not mapped to confirmed payment. Unknown provider responses fail closed. Unsupported capability disables automatic payment.

### Task 08 — Safe payout orchestration and reconciliation

**Files:** policy evaluation, payout/reconcile jobs, nonce coordinator, reservation transitions, payment fault tests.

- [ ] Implement Section 6 end-to-end with an immutable payout intent.
- [ ] Recheck policy, revocation and exact destination before signing and broadcasting.
- [ ] Persist signed bytes/hash before broadcast, verify receipts and settle budget once.
- [ ] Reconcile dropped connections, process crashes and ambiguous responses without starting duplicate writes.
- [ ] Expose an operator-visible Unknown state and block unsafe retry buttons.

**Gate:** All money-safety tests in Section 11 pass against real database transactions. Live automation remains disabled until its separate provider gate passes.

### Task 09 — Evidence receipt, digest and complete UI

**Files:** receipt service, owner digest, dashboard and payment detail components, Playwright journeys.

- [ ] Link exact terms, submission, criteria, decision, policy revision and confirmed transaction.
- [ ] Add digest entries for passed work, failed checks, approval waits and confirmed payments.
- [ ] Finish responsive/accessibility states and accurate status text.
- [ ] Redact sensitive data in receipts; private evidence remains access-controlled.

**Gate:** A user can explain why a submission passed and whether payment actually completed. Keyboard navigation and narrow-screen layout work.

### Task 10 — Marketplace integration

**Files:** verified plugin manifest/contract or required transport, scoped tool handlers, integration documentation/tests.

- [ ] Implement the exact format established in Task 00 and reuse application services.
- [ ] Test authenticated discovery and one read plus one authorized submission flow from the supported host.
- [ ] Reject cross-tenant tool calls and arbitrary money instructions.
- [ ] Prepare listing assets and required demo information; publication follows existing user authorization and platform rules.

**Gate:** Actual host integration is demonstrated or explicitly marked blocked. Do not call an unregistered site a marketplace plugin.

### Task 11 — Deploy, run the full journey and hand over

**Files:** CI workflow, deployment configuration, runbook, `docs/test-evidence.md`, `docs/release-report.md`, README.

- [ ] Run the complete quality sequence on a clean database and production build.
- [ ] Deploy web and worker with scoped secrets and run migrations safely.
- [ ] Demonstrate failed submission → feedback → corrected submission → passing review → real provider approval/automatic route as actually supported → receipt.
- [ ] Restart worker during processing and prove recovery; close owner browser during review.
- [ ] Run an authorized live payment test only if scope and credentials permit it; otherwise report the live test as not run.
- [ ] Deliver setup commands, env documentation, screenshots, demo script, known limitations and exact verification results.

**Gate:** No fake production success, no silent test skips, no unresolved high-risk payment defect. Report what is complete, what is blocked and what remains manual.

## 11. Mandatory acceptance and fault tests

| ID  | Scenario                                                      | Required outcome                                                                  |
| --- | ------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| A01 | Good CSV implementation / incorrect quoting                   | Good passes; bad gets criterion-specific feedback.                                |
| A02 | Source prints fabricated success JSON                         | Trusted comparisons reject incorrect outputs.                                     |
| A03 | PR modifies workflow/tests or changes branch after submission | Trusted template and frozen SHA remain authoritative.                             |
| A04 | Infinite loop, huge output, network request                   | Bounded termination, no secrets/network, cleanup.                                 |
| A05 | Owner browser closes after submission                         | Worker finishes review independently.                                             |
| A06 | Owner changes reward/test after acceptance                    | Conflict or new terms requiring new agreement; no silent mutation.                |
| A07 | Two workers process same award                                | One payout intent, one reservation, at most one safe initiation.                  |
| A08 | Two awards compete for final budget balance                   | Only affordable reservation succeeds.                                             |
| A09 | API times out after accepting a write                         | UNKNOWN; no blind resubmission; reconciliation retains reserve.                   |
| A10 | Worker dies after signing before broadcast                    | Recover stored transaction; do not create a new reward.                           |
| A11 | Broadcast succeeds but response is lost                       | Reconcile derived tx hash or same signed bytes; never a new nonce by default.     |
| A12 | Pending approval/signature                                    | Original request polled; contributor sees Waiting, not Paid.                      |
| A13 | Grant revoked / policy expired / insufficient funds           | Block new payment, preserve review result, actionable status.                     |
| A14 | Wrong chain/token/recipient/amount in returned artifact       | Reject and alert; no broadcast.                                                   |
| A15 | Successful receipt with missing/wrong transfer event          | Not confirmed paid.                                                               |
| A16 | Contributor changes wallet after verification                 | Frozen payout unchanged; new wallet needs new proof for future awards.            |
| A17 | Duplicate/out-of-order webhook or job                         | One effect; terminal states do not regress.                                       |
| A18 | Rotating token refreshed concurrently                         | Serialized refresh; no old-token replay.                                          |
| A19 | Different workspace probes receipt/submission/policy          | No access or sensitive existence leak.                                            |
| A20 | New resubmission finishes before an older run                 | Only selected eligible submission can win the single reward.                      |
| A21 | Optional model unavailable/injected PR text                   | Deterministic review unaffected; no payment instruction executed.                 |
| A22 | Fixture verifier combined with live payments                  | Startup refuses unsafe configuration.                                             |
| A23 | Owner revokes immediately before send                         | Pre-send check blocks when observable; already broadcast status remains truthful. |
| A24 | Unknown payment and operator presses retry                    | No second write; operator gets reconciliation workflow.                           |

Use fake providers for deterministic failure injection, but use real PostgreSQL for locking/uniqueness tests. Run actual sandbox integration tests separately from fixtures. Keep provider contract tests and live transaction verification distinct in the report.

## 12. Required scripts and definition of done

Implement these project commands (they are requirements for the agent to create, not claims that they exist already):

```bash
pnpm install --frozen-lockfile
pnpm db:migrate
pnpm db:seed:demo
pnpm dev
pnpm worker:dev
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:integration
pnpm test:contracts
pnpm build
pnpm test:e2e
```

CI runs lint/typecheck, unit and real-database integration tests, mocked provider contracts, production build and deterministic browser tests. External sandbox/provider tests use separate opted-in environments. `db:seed:demo` must refuse production/live environments and be repeatable without deleting unrelated data.

Completion requires working pages, APIs, jobs and migrations; actual test output; documented credentials/setup; no browser-dependent background processing; no uncontrolled code execution; no duplicate rewards under the fault tests; accurate payment states; and a clear final report of provider limits. Test evidence records command, commit, environment, timestamp, result and any skipped coverage. Screenshots do not replace payment or database evidence.

## 13. Delivery order under hackathon time pressure

Prioritize Task 00, then one owner/one contributor/one template/one asset vertical slice. Build mocked payment fault coverage early, then replace the adapter with the verified real integration. Do not spend most of the available time on dashboards before proving the payment route.

If time is short, defer AI narration, public search, analytics, multi-owner onboarding and additional templates. Keep authorization, isolation, immutable rules, real integration status, duplicate prevention and truthful receipts. A polished approval-required demo is preferable to a falsely labeled autonomous payment demo.

**Demo script:** Show exact rules and bounded policy; close owner browser; submit failing code; show feedback; submit corrected commit; show automatic review; show actual payment mode and provider request; show confirmed transaction only if executed; open receipt and owner digest. State the automated and manual parts clearly. Competition success cannot be guaranteed.

## 14. Official references and unresolved checks

Sources checked during preparation; the implementing agent must recheck relevant versions and SDK schemas at execution time.

- Hackathon entry: https://developer.paybox.sh/
- PayBox documentation: https://docs.paybox.sh/
- Grants: https://docs.paybox.sh/concepts/model
- Request lifecycle: https://docs.paybox.sh/concepts/requests
- MCP tools/statuses: https://docs.paybox.sh/reference/mcp-tools
- SDK and headless signing: https://docs.paybox.sh/sdk-cli
- OAuth: https://docs.paybox.sh/connect/oauth
- Public endpoint boundary: https://docs.paybox.sh/api-reference
- Next.js installation: https://nextjs.org/docs/app/getting-started/installation
- Node release lifecycle: https://nodejs.org/en/about/previous-releases
- Prisma 7 system requirements: https://www.prisma.io/docs/orm/v7/reference/system-requirements
- Clerk Next.js: https://clerk.com/docs/nextjs/getting-started/quickstart
- pg-boss: https://github.com/timgit/pg-boss
- GitHub pull requests API: https://docs.github.com/en/rest/pulls/pulls
- E2B network controls: https://docs.e2b.dev/network/internet-access
- Railway monorepo deployment: https://docs.railway.com/deployments/monorepo

**Not established by this planning document:** live account grants, a successful headless contributor transfer, provider write-idempotency semantics, supported test network, exact third-party marketplace registration format, hosting credentials, deployed code, or executed application tests. These have explicit tasks/gates above; do not fill them with assumptions.

## Copy-paste instruction for your coding agent

> Implement BountyDesk using this document as the approved specification. Start with Task 00, then execute Tasks 01–11 sequentially, testing each task before moving on. Inspect the repository and applicable instructions first. Keep an implementation-status file and evidence of real test runs. Use the chosen stack unless the existing codebase or a verified provider constraint requires a documented adjustment. Do not silently reduce safety requirements, invent PayBox endpoints, fake successful payments or claim unrun tests passed. Complete all work possible without external credentials, and identify only concrete blockers. For real transfers, use only a separately authorized recipient, asset, chain and spending limit. Finish with a working build, setup/runbook, demo instructions, verification results and an honest list of remaining limitations.

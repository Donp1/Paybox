# BountyDesk frontend design

Status: design direction for the approved handoff; implementation pending. Prepared 17 October 2026.

## Purpose and scope

BountyDesk helps an owner define a testable reward, lets an assigned contributor submit an exact Git commit, explains the review, and reports payment truthfully. The interface must make three separate facts legible: whether review passed, whether payment is authorized, and whether the transfer is confirmed. This design covers the MVP screens in Section 8 of `BountyDesk_Coding_Agent_Handoff.md`. Backend state and authorization remain authoritative.

The ui-ux-pro-max Quick Reference informed accessibility, navigation, form, responsive, and feedback rules. Its local search script could not run because this sandbox cannot access the supplied WindowsApps Python launcher; no search result is claimed.

## Visual system

- Character: calm, precise, operational. Light mode first, with no decorative charts in the MVP.
- Palette tokens (initial design values, subject to contrast verification in the browser): `canvas #F7F8F5`, `surface #FFFFFF`, `text #172B35`, `muted #52616B`, `border #D9E2E2`, `primary #006B67`, `primary-hover #005853`, `primary-on #FFFFFF`, `pending #865400`, `pending-surface #FFF3D8`, `blocked #A22D35`, `blocked-surface #FFF0F0`, `confirmed #176B45`, `confirmed-surface #E8F7ED`.
- Use semantic CSS variables. Status always includes a text label and, where helpful, an icon; color is supplemental.
- Typography: a readable system sans stack for prose and controls; tabular figures for amounts, deadlines and timestamps; monospace only for hashes and addresses. Base body 16px, line height at least 1.5. Keep long reading text near 65–75 characters per line.
- Spacing: 8px rhythm, with 4px for tight label/control relationships; page gutters 16px at 390px and 32px on desktop. Cards use modest 8–12px radius and one restrained border or shadow treatment.
- Controls: visible 2–3px focus indicator; at least 44px touch height for primary web controls; disabled, hover, pressed and busy states are distinct. Respect reduced motion.

## Navigation and screen hierarchy

Use one stable app shell. Desktop has a labeled sidebar with Overview, Bounties, Reviews, Payments and Settings. At narrow widths, use a compact top navigation menu with the same labels and a visible current-page title. Details retain a breadcrumb or back link to their list. Every detail has a stable URL. A persistent Demo badge appears whenever payment or verification uses mock/fixture mode.

| Screen | Primary content | Primary action |
| --- | --- | --- |
| Owner overview | Available and reserved budget, eligible awards, approval queue, active reviews, recent receipts, connection health | Create bounty |
| Bounty builder | Assigned contributor, repository, versioned verifier template, criteria preview, fixed reward, approved chain/asset, deadline, payment mode | Publish terms |
| Bounty detail | Locked terms, terms hash/version, claimant, submissions, review and payment summary | Role/state-specific next action |
| Contributor workspace | Accepted terms, sample checks, verified wallet, exact commit SHA field, review progress and retry guidance | Submit commit |
| Review detail | Submission SHA and time, template version, criterion rows with expected/actual summaries, history | Submit correction when eligible |
| Payment detail | Reward, frozen recipient, asset/chain, policy mode, provider request state, transaction state and receipt | Approve when provider requires it |
| Settings | GitHub and PayBox connections, capability status, policy bounds/expiry, revoke control | Context-specific save/revoke |

The owner and contributor see only actions their role can perform. The server still checks every read and write. A guessed URL must not reveal another workspace's resource existence.

## Core flows

### Owner creates a bounty

Use a single guided builder with four sections: Work and assignee; Acceptance checks; Reward and deadline; Payment authorization. Show a persistent summary on desktop and a collapsible summary on mobile. The criteria preview includes concrete examples and identifies the trusted template/version. Before publishing, a confirmation view shows the exact reward, token, chain, assigned person, deadline, payment mode and terms-lock consequence. Stale version and validation errors stay next to the affected field and are summarized at the top with links to fields.

### Contributor accepts and submits

The agreement screen displays locked terms and sample checks before the Accept action. Show the verified wallet in full before acceptance or submission confirmation; copying is one click and announced accessibly. Submission requires a full commit SHA and shows the connected repository. During review, progress comes from server state and remains available after closing the browser. Failed checks identify a criterion, expected behavior and observed summary. Retry creates a new submission entry; earlier attempts remain visible.

### Payment and evidence

The payment screen separates `Review passed` from the payment timeline. Map backend states to explicit copy: `Approval required`, `Signature required`, `Signed — awaiting broadcast`, `Broadcast — awaiting confirmation`, `Confirmed paid`, `Denied`, `Failed`, and `Status unknown — reconciliation in progress`. Only a verified receipt with the correct transfer can show `Confirmed paid`. For unknown state, show the last known timestamp and a support/reconciliation path, never a generic Retry payment button. When approval is required, name the provider action and show whether it has been requested, completed or expired.

The evidence receipt links the locked terms, exact commit, content hash, template version, criterion outcomes, policy revision, and confirmed transaction when one exists. Use a chronological, readable timeline and an accessible table of criteria. Keep private evidence scoped to authorized viewers; show redacted identifiers only where appropriate.

## States and feedback

Every data view has designed loading, empty, stale, disconnected, permission-denied, failed and unknown states. Loading skeletons reserve layout space. Empty states explain the next useful action. A disconnected PayBox connection distinguishes review availability from payment availability. Destructive revoke actions require confirmation and show the effective result. Toasts supplement, rather than replace, persistent page status and field-level errors.

## Responsive and accessibility checks

- At 390px, cards stack, data tables become labeled rows where necessary, and no address, SHA or long error causes horizontal page scrolling. Copyable identifiers can wrap; a separate copy control retains an accessible name.
- At desktop widths, use a centered max-width content area. Avoid large whitespace around critical status and actions.
- Use semantic headings, labels, fieldsets, buttons, tables and `aria-current` navigation. Provide a skip link and logical keyboard order. Focus moves to the error summary after a failed multi-field submit.
- Announce changed review/payment status as a complete sentence through one polite live region. Do not move focus for passive updates.
- Test contrast for normal text at 4.5:1 and meaningful icons/control boundaries at 3:1. Verify keyboard focus remains visible under sticky UI. Test at 390px and desktop, zoomed text, keyboard-only navigation and reduced motion.

## Implementation placement

Task 01 establishes the Next.js/Tailwind/shadcn foundation and semantic tokens. Task 04 implements the builder, bounty detail and contributor agreement. Task 06 implements review progress and feedback. Task 09 completes overview, payment detail, evidence receipt, digest and responsive/accessibility verification. PayBox capability findings from Task 00 control which payment mode claims and actions are shown. No UI text should promise automatic payment until its capability gate passes.

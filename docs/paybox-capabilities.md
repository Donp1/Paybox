# PayBox capability gate — Task 00

Checked 17 October 2026 against the public documentation and the published `@paybox-sh/sdk` 2.2.0 package types/README. This is a documentation and local encoding check, not a live payment proof.

**Outcome: approval route only for BountyDesk at present.** The SDK exposes a plausible headless core wallet-sign path, but this workspace has no paired PayBox client/grant, recipient test authorization, or confirmed transfer. `AUTOMATIC_PAYOUTS_ENABLED` must remain `false`. A pass in the verifier can lead to an approval-required payment state; it cannot be represented as paid.

## Verified public surface

| Topic | Evidence and implementation consequence |
| --- | --- |
| Authentication | PayBox documents OAuth 2.1/PKCE and personal `pbx_live_*` API keys for scoped clients. SDK constructor accepts `apiKey`, `token`, `signingKey`, `baseUrl`. Keep credentials server-side; a token alone does not establish signing capability. [API reference](https://docs.paybox.sh/api-reference), [SDK](https://docs.paybox.sh/sdk-cli). |
| Pairing | CLI `connect` requires a human to pair a locally held `pbxk1.` signer to that client. SDK README says the API key and signer are a matched pair and re-pairing is needed after client rotation. No CI-time pairing. [SDK](https://docs.paybox.sh/sdk-cli), published SDK README 2.2.0. |
| Grants | Grants are credential-scoped and revocable, with human or autonomous modes. App policy may narrow but cannot expand a provider grant. [Model](https://docs.paybox.sh/concepts/model). |
| Core signing | Installed package types expose `requestWalletSign({ credentialId, intent: { op: 'transaction', transaction } })`, `completeWalletSignRequest(requestId)`, `canSign`, and a `signingKey` option. The SDK docs say an already paired signer can sign in process when the grant allows it. This makes a headless *core wallet-sign* route plausible, not yet proven for this account or competition. [SDK](https://docs.paybox.sh/sdk-cli). |
| Transaction output | MCP reference documents `serializedTransaction` from a transaction signing intent, ready for `eth_sendRawTransaction`. This is a signed artifact, not a confirmed contributor payout. BountyDesk must validate chain, token contract, recipient, amount, nonce and fees; broadcast with viem; then verify receipt and exact ERC-20 Transfer log. [MCP tools](https://docs.paybox.sh/reference/mcp-tools). |
| Lifecycle | Keep the original `request_id`, surface `pending_approval`, poll `get_request`, and never reissue a write to complete it. SDK has `getRequest`, `waitForRequest`, and `resumeRequest`. `pending_signature`, `pending_confirmation`, `success`, `denied`, and `error` require distinct mapping. [Request lifecycle](https://docs.paybox.sh/concepts/requests), SDK 2.2.0 types. |
| Deduplication | No provider write-idempotency key or safe reissue guarantee was established. The SDK README says uncertain invocation without a request ID needs external reconciliation before another call. BountyDesk must persist intent and request identity before further steps and treat ambiguous initiation as Unknown. Published SDK README 2.2.0. |
| Plugin money tools | The MCP reference says plugin money tools always pause for human approval, even with an autonomous grant. Do not claim offline autonomous payouts through `usePlugin`. [MCP tools](https://docs.paybox.sh/reference/mcp-tools). |
| Other money tools | `requestPayment` issues a merchant-scoped one-time card. `payX402`/`useService` pay a resource. None is a documented generic contributor payout API. [MCP tools](https://docs.paybox.sh/reference/mcp-tools). |
| Supported network/asset | SDK types accept an EVM `chainId` in `WireTx` and the docs show Base as an example, but no account-specific Base USDC transfer, token grant, fee policy, or test network was proven. Do not substitute a chain/token silently. [SDK](https://docs.paybox.sh/sdk-cli). |

## Documentation tensions to resolve before live automation

- The [model page](https://docs.paybox.sh/concepts/model) says sensitive signing requires a fresh passkey assertion regardless of grant mode. The [SDK page](https://docs.paybox.sh/sdk-cli) says signing can complete in process under an autonomous grant. Treat unattended signing as **unproven for this integration** until an account-scoped, provider-supported test resolves the exact behavior.
- The SDK 2.2.0 README sample includes a `chain` property in a `requestWalletSign` example that is absent from its published `WalletSignArgs` type. Follow the installed type contract and use `transaction.chainId`; do not copy the unmatched sample property.
- Public docs describe successful on-chain PayBox operations as confirmed, but `request_wallet_sign` specifically returns a serialized signed transaction. BountyDesk must independently broadcast and confirm that transaction.

## Executed checks and gaps

- `npm.cmd view @paybox-sh/sdk version dist.tarball --json --cache .npm-cache` returned `2.2.0`.
- Downloaded and inspected the published `index.d.ts` and README without installing it into the application.
- Fetched the official documentation pages listed above and inspected their rendered article text.
- `node --experimental-strip-types scripts/paybox-capability-check.ts`: after credentials were configured in the ignored root `.env`, local ERC-20 encoding fixture passed, `PayboxClient.fromConfig()` reported `canSign: true`, and a read-only provider credential listing succeeded with one granted credential. Credential identities were redacted. No signing request or transfer was made.
- No PayBox credentials were supplied to this workspace. Credential/grant listing, pairing, signing, request polling, provider deduplication, Base USDC transfer, revocation, broadcast and on-chain receipt verification remain **not run**.

The next live gate needs an authorized PayBox client with a paired signer and wallet grant, a supported network, a verified test recipient, fixed asset/chain, maximum reward and fee budget. It must exercise restart/unknown-response recovery and revocation before enabling unattended payouts. No real transfer is authorized by this document.

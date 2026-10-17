# PayBox marketplace requirements — Task 00

Checked 17 October 2026. **Actual marketplace packaging and publication remain unverified.**

The [Chapter 1 landing page](https://developer.paybox.sh/) requires a live PayBox marketplace plugin working end to end and a short demo video posted to X. It says x402 can be a route into PayBox, but does not specify the third-party registration, manifest/contract format, authentication handoff, hosting review, or credential forwarding rules for BountyDesk.

The [MCP reference](https://docs.paybox.sh/reference/mcp-tools) documents runtime `discover_plugins`, `get_contract`, and `use_plugin`. Users enable plugins in the PayBox app. The published SDK 2.2.0 types include `discoverPlugins`, `getPluginContract`, `usePlugin`, `runPlugin`, and `resumeRequest`. These are **consumer** capabilities; they do not document how to register or publish a new plugin. An MCP server or standalone website is not evidence of marketplace listing.

The [hackathon terms](https://developer.paybox.sh/) say a submission does not entitle its author to marketplace listing and that listing is subject to separate review and agreements. No credential forwarding permission was found in the public pages checked. BountyDesk must keep its own authentication and tenant authorization for every plugin tool; it cannot accept a tool-supplied user/workspace ID as authority or assume a PayBox bearer token authenticates to BountyDesk.

**Task 10 gate:** obtain the current official plugin author/onboarding specification or direct provider confirmation; implement its exact transport/contract; demonstrate discovery and one authorized tool call from the supported host. Until then label marketplace integration blocked, while independent app work can continue.

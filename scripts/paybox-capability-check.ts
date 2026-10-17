/** Task 00: read-only provider preflight and local transfer encoding check. */
import assert from 'node:assert/strict';
import { loadWorkspaceEnv } from '../packages/contracts/src/env.ts';

const ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const ATOMIC = /^(0|[1-9][0-9]*)$/;

export function encodeErc20Transfer(recipient: string, atomicAmount: string): `0x${string}` {
  if (!ADDRESS.test(recipient)) throw new Error('Invalid recipient address');
  if (!ATOMIC.test(atomicAmount) || BigInt(atomicAmount) <= 0n) {
    throw new Error('Amount must be a positive integer in atomic units');
  }
  if (BigInt(atomicAmount) > (1n << 256n) - 1n) throw new Error('Amount exceeds uint256');
  return `0xa9059cbb${recipient.slice(2).toLowerCase().padStart(64, '0')}${BigInt(atomicAmount).toString(16).padStart(64, '0')}`;
}

async function main(): Promise<void> {
  loadWorkspaceEnv();
  const encoded = encodeErc20Transfer('0x0000000000000000000000000000000000000001', '5000000');
  assert.equal(encoded, '0xa9059cbb' + '0'.repeat(63) + '1' + '0'.repeat(58) + '4c4b40');
  assert.throws(() => encodeErc20Transfer('0x123', '1'));
  assert.throws(() => encodeErc20Transfer('0x0000000000000000000000000000000000000001', '1.5'));
  console.log('Local ERC-20 encoding fixture: PASS (no signing or broadcast)');

  const hasClientCredential = Boolean(process.env.PAYBOX_API_KEY || process.env.PAYBOX_ACCESS_TOKEN);
  console.log(`PayBox client credential configured: ${hasClientCredential}`);

  const sdk = await import('@paybox-sh/sdk').catch(() => null);
  if (!sdk) {
    console.log('SDK runtime check: SKIPPED (@paybox-sh/sdk not installed; inspect published 2.2.0 types in Task 00 report)');
    return;
  }
  const client = sdk.PayboxClient.fromConfig();
  console.log(`SDK PayboxClient: available; in-process signer configured: ${client.canSign}`);
  if (!hasClientCredential) {
    console.log('Provider read-only check: SKIPPED (no PayBox client credential configured)');
    return;
  }
  try {
    const listed = await client.listCredentials();
    console.log(`Provider read-only credential listing: PASS (${listed.credentials.length} granted credential(s); identities redacted)`);
  } catch (error) {
    console.error(`Provider read-only credential listing: FAILED (${error instanceof Error ? error.name : 'unknown error'}; details redacted)`);
    process.exitCode = 1;
  }
}

await main();

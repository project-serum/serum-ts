import { PublicKey, SYSVAR_CLOCK_PUBKEY } from '@solana/web3.js';
import * as anchor from '@project-serum/anchor';
import { simulateTransaction } from '@project-serum/common';

export async function vestingSigner(
  programId: PublicKey,
  vesting: PublicKey,
): Promise<{ publicKey: PublicKey; nonce: number }> {
  const [publicKey, nonce] = await anchor.web3.PublicKey.findProgramAddress(
    [vesting.toBuffer()],
    programId,
  );
  return {
    publicKey,
    nonce,
  };
}

// Simulates the `availableForWithdrawal` instruction to funnel out a the
// emitted log data (as a hack to get a return value).
export async function availableForWithdrawal(
  lockupClient: anchor.Program,
  vesting: PublicKey,
): Promise<anchor.BN> {
  let tx = lockupClient.transaction.availableForWithdrawal({
    accounts: {
      vesting,
      clock: SYSVAR_CLOCK_PUBKEY,
    },
  });
  tx.setSigners(...[lockupClient.provider.wallet.publicKey]);
  let resp = await simulateTransaction(
    lockupClient.provider.connection,
    tx,
    'recent',
  );
  if (resp.value.err) {
    throw new Error(`RPC error: ${resp.value.err.toString()}`);
  }
  let log = resp.value.logs![1].slice('Program log: '.length);
  return new anchor.BN(JSON.parse(log).result);
}

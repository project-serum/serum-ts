import BN from 'bn.js';
import { PublicKey } from '@solana/web3.js';

// Serum DEX program id on mainnet-beta.
export const DEX_PID = new PublicKey(
  '9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin',
);

// Swap program id on mainnet-beta.
export const SWAP_PID = new PublicKey(
  '22Y43yTVxuUkoRKdm9thyRhQ3SdgQS7c7kB6UNCiaczD',
);

// USDC mint on mainnet-beta.
export const USDC_PUBKEY = new PublicKey(
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
);

// USDT mint on mainnet-beta.
export const USDT_PUBKEY = new PublicKey(
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
);

// Return the program derived address used by the serum DEX to control token
// vaults.
export async function getVaultOwnerAndNonce(
  marketPublicKey: PublicKey,
  dexProgramId: PublicKey = DEX_PID,
) {
  const nonce = new BN(0);
  while (nonce.toNumber() < 255) {
    try {
      const vaultOwner = await PublicKey.createProgramAddress(
        [marketPublicKey.toBuffer(), nonce.toArrayLike(Buffer, 'le', 8)],
        dexProgramId,
      );
      return [vaultOwner, nonce];
    } catch (e) {
      nonce.iaddn(1);
    }
  }
  throw new Error('Unable to find nonce');
}

// Returns an associated token address for spl tokens.
export async function getAssociatedTokenAddress(
  associatedProgramId: PublicKey,
  programId: PublicKey,
  mint: PublicKey,
  owner: PublicKey,
): Promise<PublicKey> {
  return (
    await PublicKey.findProgramAddress(
      [owner.toBuffer(), programId.toBuffer(), mint.toBuffer()],
      associatedProgramId,
    )
  )[0];
}

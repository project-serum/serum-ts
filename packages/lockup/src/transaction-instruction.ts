import BN from 'bn.js';
import {
  PublicKey,
  SystemProgram,
  TransactionInstruction,
  SYSVAR_RENT_PUBKEY,
  SYSVAR_CLOCK_PUBKEY,
} from '@solana/web3.js';
import { createTokenAccountInstrs, Provider } from '@project-serum/common';
import { TOKEN_PROGRAM_ID } from '@project-serum/serum/lib/token-instructions';
import { SIZE as VESTING_SIZE } from './accounts/vesting';
import * as instruction from './instruction';

export async function createVesting(
  provider: Provider,
  programId: PublicKey,
  safe: PublicKey,
  vesting: PublicKey,
  vault: PublicKey,
  mint: PublicKey,
  depositor: PublicKey,
  depositorAuthorityPubkey: PublicKey,
  beneficiary: PublicKey,
  endTs: BN,
  periodCount: BN,
  depositAmount: BN,
) {
  let { nonce, ixs } = await allocVestingIxs(
    provider,
    programId,
    safe,
    vesting,
    vault,
    mint,
    beneficiary,
  );

  return [
    ...ixs,
    // Create Vesting.
    new TransactionInstruction({
      keys: [
        { pubkey: vesting, isWritable: true, isSigner: false },
        { pubkey: depositor, isWritable: true, isSigner: false },
        {
          pubkey: depositorAuthorityPubkey,
          isWritable: false,
          isSigner: true,
        },
        { pubkey: vault, isWritable: true, isSigner: false },
        { pubkey: safe, isWritable: false, isSigner: false },
        { pubkey: TOKEN_PROGRAM_ID, isWritable: false, isSigner: false },
        { pubkey: SYSVAR_RENT_PUBKEY, isWritable: false, isSigner: false },
        { pubkey: SYSVAR_CLOCK_PUBKEY, isWritable: false, isSigner: false },
      ],
      programId,
      data: instruction.encode({
        createVesting: {
          beneficiary,
          endTs,
          periodCount,
          depositAmount,
          nonce,
        },
      }),
    }),
  ];
}

export async function allocVestingIxs(
  provider: Provider,
  programId: PublicKey,
  safe: PublicKey,
  vesting: PublicKey,
  vault: PublicKey,
  mint: PublicKey,
  beneficiary: PublicKey,
): Promise<{ nonce: number; ixs: TransactionInstruction[] }> {
  const [vaultAuthority, nonce] = await PublicKey.findProgramAddress(
    [safe.toBuffer(), beneficiary.toBuffer()],
    programId,
  );
  const createVaultInstructions = await createTokenAccountInstrs(
    provider,
    vault,
    mint,
    vaultAuthority,
  );
  return {
    nonce,
    ixs: [
      ...createVaultInstructions,
      // Allocate account.
      SystemProgram.createAccount({
        fromPubkey: provider.wallet.publicKey,
        newAccountPubkey: vesting,
        space: VESTING_SIZE,
        lamports: await provider.connection.getMinimumBalanceForRentExemption(
          VESTING_SIZE,
        ),
        programId,
      }),
    ],
  };
}

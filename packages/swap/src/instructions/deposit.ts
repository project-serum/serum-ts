
import { Numberu64 } from '@solana/spl-token-swap';
import { PublicKey, TransactionInstruction, AccountMeta } from '@solana/web3.js';
import { struct, u8 } from 'buffer-layout';
import { uint64 } from './.';
import { getProgramVersion } from '../types';

export { TokenSwap } from '@solana/spl-token-swap';

export const depositInstruction = (
  tokenSwap: PublicKey,
  authority: PublicKey,
  transferAuthority: PublicKey,
  sourceA: PublicKey,
  sourceB: PublicKey,
  intoA: PublicKey,
  intoB: PublicKey,
  poolToken: PublicKey,
  poolAccount: PublicKey,
  swapProgramId: PublicKey,
  tokenProgramId: PublicKey,
  poolTokenAmount: number | Numberu64,
  maximumTokenA: number | Numberu64,
  maximumTokenB: number | Numberu64,
): TransactionInstruction => {
  const dataLayout = struct([
    u8('instruction'),
    uint64('poolTokenAmount'),
    uint64('maximumTokenA'),
    uint64('maximumTokenB'),
  ]);

  const data = Buffer.alloc(dataLayout.span);
  dataLayout.encode(
    {
      instruction: 2, // Deposit instruction
      poolTokenAmount: new Numberu64(poolTokenAmount).toBuffer(),
      maximumTokenA: new Numberu64(maximumTokenA).toBuffer(),
      maximumTokenB: new Numberu64(maximumTokenB).toBuffer(),
    },
    data,
  );

  const keysByVersion: { [keys: number]: Array<AccountMeta> } = {
    1: [
      { pubkey: tokenSwap, isSigner: false, isWritable: false },
      { pubkey: authority, isSigner: false, isWritable: false },
      { pubkey: transferAuthority, isSigner: true, isWritable: false },
      { pubkey: sourceA, isSigner: false, isWritable: true },
      { pubkey: sourceB, isSigner: false, isWritable: true },
      { pubkey: intoA, isSigner: false, isWritable: true },
      { pubkey: intoB, isSigner: false, isWritable: true },
      { pubkey: poolToken, isSigner: false, isWritable: true },
      { pubkey: poolAccount, isSigner: false, isWritable: true },
      { pubkey: tokenProgramId, isSigner: false, isWritable: false },
    ],
    2: [
      { pubkey: tokenSwap, isSigner: false, isWritable: false },
      { pubkey: authority, isSigner: false, isWritable: false },
      { pubkey: sourceA, isSigner: false, isWritable: true },
      { pubkey: sourceB, isSigner: false, isWritable: true },
      { pubkey: intoA, isSigner: false, isWritable: true },
      { pubkey: intoB, isSigner: false, isWritable: true },
      { pubkey: poolToken, isSigner: false, isWritable: true },
      { pubkey: poolAccount, isSigner: false, isWritable: true },
      { pubkey: tokenProgramId, isSigner: false, isWritable: false },
    ],
  };

  const keys = keysByVersion[getProgramVersion(swapProgramId)];

  return new TransactionInstruction({
    keys,
    programId: swapProgramId,
    data,
  });
};

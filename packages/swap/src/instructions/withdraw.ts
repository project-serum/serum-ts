import { Numberu64 } from '@solana/spl-token-swap';
import { PublicKey, TransactionInstruction, AccountMeta } from '@solana/web3.js';
import { struct, u8 } from 'buffer-layout';
import { getProgramVersion } from './../types';
import { uint64 } from './layout';

export { TokenSwap } from '@solana/spl-token-swap';

export const withdrawInstruction = (
  tokenSwap: PublicKey,
  authority: PublicKey,
  transferAuthority: PublicKey,
  poolMint: PublicKey,
  feeAccount: PublicKey | undefined,
  sourcePoolAccount: PublicKey,
  fromA: PublicKey,
  fromB: PublicKey,
  userAccountA: PublicKey,
  userAccountB: PublicKey,
  swapProgramId: PublicKey,
  tokenProgramId: PublicKey,
  poolTokenAmount: number | Numberu64,
  minimumTokenA: number | Numberu64,
  minimumTokenB: number | Numberu64,
): TransactionInstruction => {

  const dataLayout = struct([
    u8('instruction'),
    uint64('poolTokenAmount'),
    uint64('minimumTokenA'),
    uint64('minimumTokenB'),
  ]);

  const data = Buffer.alloc(dataLayout.span);
  dataLayout.encode(
    {
      instruction: 3, // Withdraw instruction
      poolTokenAmount: new Numberu64(poolTokenAmount).toBuffer(),
      minimumTokenA: new Numberu64(minimumTokenA).toBuffer(),
      minimumTokenB: new Numberu64(minimumTokenB).toBuffer(),
    },
    data,
  );

  const keysByVersion: { [keys: number]: Array<AccountMeta> } = {
    1: [
      { pubkey: tokenSwap, isSigner: false, isWritable: false },
      { pubkey: authority, isSigner: false, isWritable: false },
      { pubkey: poolMint, isSigner: false, isWritable: true },
      { pubkey: sourcePoolAccount, isSigner: false, isWritable: true },
      { pubkey: fromA, isSigner: false, isWritable: true },
      { pubkey: fromB, isSigner: false, isWritable: true },
      { pubkey: userAccountA, isSigner: false, isWritable: true },
      { pubkey: userAccountB, isSigner: false, isWritable: true },
    ],
    2: [
      { pubkey: tokenSwap, isSigner: false, isWritable: false },
      { pubkey: authority, isSigner: false, isWritable: false },
      { pubkey: transferAuthority, isSigner: true, isWritable: false },
      { pubkey: poolMint, isSigner: false, isWritable: true },
      { pubkey: sourcePoolAccount, isSigner: false, isWritable: true },
      { pubkey: fromA, isSigner: false, isWritable: true },
      { pubkey: fromB, isSigner: false, isWritable: true },
      { pubkey: userAccountA, isSigner: false, isWritable: true },
      { pubkey: userAccountB, isSigner: false, isWritable: true },
    ]
  }

  const keys = keysByVersion[getProgramVersion(swapProgramId)];

  if (feeAccount) {
    keys.push({ pubkey: feeAccount, isSigner: false, isWritable: true });
  }
  keys.push({ pubkey: tokenProgramId, isSigner: false, isWritable: false });

  return new TransactionInstruction({
    keys,
    programId: swapProgramId,
    data,
  });
};

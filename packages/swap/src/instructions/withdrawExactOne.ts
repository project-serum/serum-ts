import { Numberu64 } from '@solana/spl-token-swap';
import { PublicKey, TransactionInstruction } from '@solana/web3.js';
import { struct, u8 } from 'buffer-layout';
import { uint64 } from './layout';

export { TokenSwap } from '@solana/spl-token-swap';

export const withdrawExactOneInstruction = (
  tokenSwap: PublicKey,
  authority: PublicKey,
  transferAuthority: PublicKey,
  poolMint: PublicKey,
  sourcePoolAccount: PublicKey,
  fromA: PublicKey,
  fromB: PublicKey,
  userAccount: PublicKey,
  feeAccount: PublicKey | undefined,
  swapProgramId: PublicKey,
  tokenProgramId: PublicKey,
  sourceTokenAmount: number | Numberu64,
  maximumTokenAmount: number | Numberu64,
  isLatest: boolean,
): TransactionInstruction => {
  const dataLayout = struct([
    u8("instruction"),
    uint64("sourceTokenAmount"),
    uint64("maximumTokenAmount"),
  ]);

  const data = Buffer.alloc(dataLayout.span);
  dataLayout.encode(
    {
      instruction: 5, // WithdrawExactOne instruction
      sourceTokenAmount: new Numberu64(sourceTokenAmount).toBuffer(),
      maximumTokenAmount: new Numberu64(maximumTokenAmount).toBuffer(),
    },
    data
  );

  const keys = isLatest ? [
    { pubkey: tokenSwap, isSigner: false, isWritable: false },
    { pubkey: authority, isSigner: false, isWritable: false },
    { pubkey: transferAuthority, isSigner: true, isWritable: false },
    { pubkey: poolMint, isSigner: false, isWritable: true },
    { pubkey: sourcePoolAccount, isSigner: false, isWritable: true },
    { pubkey: fromA, isSigner: false, isWritable: true },
    { pubkey: fromB, isSigner: false, isWritable: true },
    { pubkey: userAccount, isSigner: false, isWritable: true },
  ] : [
    { pubkey: tokenSwap, isSigner: false, isWritable: false },
    { pubkey: authority, isSigner: false, isWritable: false },
    { pubkey: poolMint, isSigner: false, isWritable: true },
    { pubkey: sourcePoolAccount, isSigner: false, isWritable: true },
    { pubkey: fromA, isSigner: false, isWritable: true },
    { pubkey: fromB, isSigner: false, isWritable: true },
    { pubkey: userAccount, isSigner: false, isWritable: true },
  ];

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

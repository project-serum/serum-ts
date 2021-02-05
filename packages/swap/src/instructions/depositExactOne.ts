import { Numberu64 } from '@solana/spl-token-swap';
import { PublicKey, TransactionInstruction } from '@solana/web3.js';
import { struct, u8 } from 'buffer-layout';
import { uint64 } from './layout';

export { TokenSwap } from '@solana/spl-token-swap';

export const depositExactOneInstruction = (
  tokenSwap: PublicKey,
  authority: PublicKey,
  transferAuthority: PublicKey,
  source: PublicKey,
  intoA: PublicKey,
  intoB: PublicKey,
  poolToken: PublicKey,
  poolAccount: PublicKey,
  swapProgramId: PublicKey,
  tokenProgramId: PublicKey,
  sourceTokenAmount: number | Numberu64,
  minimumPoolTokenAmount: number | Numberu64,
  isLatest: boolean,
): TransactionInstruction => {
  const dataLayout = struct([
    u8("instruction"),
    uint64("sourceTokenAmount"),
    uint64("minimumPoolTokenAmount"),
  ]);

  const data = Buffer.alloc(dataLayout.span);
  dataLayout.encode(
    {
      instruction: 4, // DepositExactOne instruction
      sourceTokenAmount: new Numberu64(sourceTokenAmount).toBuffer(),
      minimumPoolTokenAmount: new Numberu64(minimumPoolTokenAmount).toBuffer(),
    },
    data
  );

  const keys = isLatest ? [
    { pubkey: tokenSwap, isSigner: false, isWritable: false },
    { pubkey: authority, isSigner: false, isWritable: false },
    { pubkey: transferAuthority, isSigner: true, isWritable: false },
    { pubkey: source, isSigner: false, isWritable: true },
    { pubkey: intoA, isSigner: false, isWritable: true },
    { pubkey: intoB, isSigner: false, isWritable: true },
    { pubkey: poolToken, isSigner: false, isWritable: true },
    { pubkey: poolAccount, isSigner: false, isWritable: true },
    { pubkey: tokenProgramId, isSigner: false, isWritable: false },
  ] : [
    { pubkey: tokenSwap, isSigner: false, isWritable: false },
    { pubkey: authority, isSigner: false, isWritable: false },
    { pubkey: source, isSigner: false, isWritable: true },
    { pubkey: intoA, isSigner: false, isWritable: true },
    { pubkey: intoB, isSigner: false, isWritable: true },
    { pubkey: poolToken, isSigner: false, isWritable: true },
    { pubkey: poolAccount, isSigner: false, isWritable: true },
    { pubkey: tokenProgramId, isSigner: false, isWritable: false },
  ];
  return new TransactionInstruction({
    keys,
    programId: swapProgramId,
    data,
  });
};

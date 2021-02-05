import { Numberu64 } from '@solana/spl-token-swap';
import { PublicKey, TransactionInstruction, AccountMeta } from '@solana/web3.js';
import { struct, u8 } from 'buffer-layout';
import { uint64 } from './layout';
import { getProgramVersion } from '../types';

export { TokenSwap } from '@solana/spl-token-swap';

export const swapInstruction = (
  tokenSwap: PublicKey,
  authority: PublicKey,
  transferAuthority: PublicKey,
  userSource: PublicKey,
  poolSource: PublicKey,
  poolDestination: PublicKey,
  userDestination: PublicKey,
  poolMint: PublicKey,
  feeAccount: PublicKey,
  swapProgramId: PublicKey,
  tokenProgramId: PublicKey,
  amountIn: number | Numberu64,
  minimumAmountOut: number | Numberu64,
  programOwner?: PublicKey,
): TransactionInstruction => {
  const dataLayout = struct([
    u8('instruction'),
    uint64('amountIn'),
    uint64('minimumAmountOut'),
  ]);

  const keysByVersion: { [keys: number]: Array<AccountMeta> } = {
    1: [
      { pubkey: tokenSwap, isSigner: false, isWritable: false },
      { pubkey: authority, isSigner: false, isWritable: false },
      { pubkey: userSource, isSigner: false, isWritable: true },
      { pubkey: poolSource, isSigner: false, isWritable: true },
      { pubkey: poolDestination, isSigner: false, isWritable: true },
      { pubkey: userDestination, isSigner: false, isWritable: true },
      { pubkey: poolMint, isSigner: false, isWritable: true },
      { pubkey: feeAccount, isSigner: false, isWritable: true },
      { pubkey: tokenProgramId, isSigner: false, isWritable: false },
    ],
    2: [
    { pubkey: tokenSwap, isSigner: false, isWritable: false },
    { pubkey: authority, isSigner: false, isWritable: false },
    { pubkey: transferAuthority, isSigner: true, isWritable: false },
    { pubkey: userSource, isSigner: false, isWritable: true },
    { pubkey: poolSource, isSigner: false, isWritable: true },
    { pubkey: poolDestination, isSigner: false, isWritable: true },
    { pubkey: userDestination, isSigner: false, isWritable: true },
    { pubkey: poolMint, isSigner: false, isWritable: true },
    { pubkey: feeAccount, isSigner: false, isWritable: true },
    { pubkey: tokenProgramId, isSigner: false, isWritable: false },
  ],
};

const keys = keysByVersion[getProgramVersion(swapProgramId)];

  // optional depending on the build of token-swap program
  if (programOwner) {
    keys.push({ pubkey: programOwner, isSigner: false, isWritable: true });
  }

  const data = Buffer.alloc(dataLayout.span);
  dataLayout.encode(
    {
      instruction: 1, // Swap instruction
      amountIn: new Numberu64(amountIn).toBuffer(),
      minimumAmountOut: new Numberu64(minimumAmountOut).toBuffer(),
    },
    data,
  );

  return new TransactionInstruction({
    keys,
    programId: swapProgramId,
    data,
  });
};

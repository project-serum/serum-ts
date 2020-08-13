import * as BufferLayout from 'buffer-layout';
import { PublicKey, TransactionInstruction } from '@solana/web3.js';

export const TOKEN_PROGRAM_ID = new PublicKey(
  'TokenSVp5gheXUvJ6jGWGeCsgPKgnE3YgdGKRVCMY9o',
);

export const WRAPPED_SOL_MINT = new PublicKey(
  'So11111111111111111111111111111111111111111',
);

const LAYOUT = BufferLayout.union(BufferLayout.u8('instruction'));
LAYOUT.addVariant(
  0,
  BufferLayout.struct([
    // TODO: does this need to be aligned?
    BufferLayout.nu64('amount'),
    BufferLayout.u8('decimals'),
  ]),
  'initializeMint',
);
LAYOUT.addVariant(1, BufferLayout.struct([]), 'initializeAccount');
LAYOUT.addVariant(
  3,
  BufferLayout.struct([BufferLayout.nu64('amount')]),
  'transfer',
);
LAYOUT.addVariant(
  4,
  BufferLayout.struct([BufferLayout.nu64('amount')]),
  'approve',
);
LAYOUT.addVariant(
  7,
  BufferLayout.struct([BufferLayout.nu64('amount')]),
  'mintTo',
);
LAYOUT.addVariant(
  8,
  BufferLayout.struct([BufferLayout.nu64('amount')]),
  'burn',
);

const instructionMaxSpan = Math.max(
  ...Object.values(LAYOUT.registry).map((r) => r.span),
);

function encodeTokenInstructionData(instruction) {
  const b = Buffer.alloc(instructionMaxSpan);
  const span = LAYOUT.encode(instruction, b);
  return b.slice(0, span);
}

export function initializeMint({
  mint,
  amount = 0,
  decimals,
  initialAccount = null,
  mintOwner = null,
}) {
  const keys = [{ pubkey: mint, isSigner: false, isWritable: true }];
  if (amount) {
    keys.push({ pubkey: initialAccount, isSigner: false, isWritable: true });
  }
  if (mintOwner) {
    keys.push({ pubkey: mintOwner, isSigner: false, isWritable: false });
  }
  return new TransactionInstruction({
    keys,
    data: encodeTokenInstructionData({
      initializeMint: {
        amount,
        decimals,
      },
    }),
    programId: TOKEN_PROGRAM_ID,
  });
}

export function initializeAccount({ account, mint, owner }) {
  const keys = [
    { pubkey: account, isSigner: false, isWritable: true },
    { pubkey: mint, isSigner: false, isWritable: false },
    { pubkey: owner, isSigner: false, isWritable: false },
  ];
  return new TransactionInstruction({
    keys,
    data: encodeTokenInstructionData({
      initializeAccount: {},
    }),
    programId: TOKEN_PROGRAM_ID,
  });
}

export function transfer({ source, destination, amount, owner }) {
  const keys = [
    { pubkey: source, isSigner: false, isWritable: true },
    { pubkey: destination, isSigner: false, isWritable: true },
    { pubkey: owner, isSigner: true, isWritable: false },
  ];
  return new TransactionInstruction({
    keys,
    data: encodeTokenInstructionData({
      transfer: { amount },
    }),
    programId: TOKEN_PROGRAM_ID,
  });
}

export function approve({ source, delegate, amount, owner }) {
  const keys = [
    { pubkey: source, isSigner: false, isWritable: true },
    { pubkey: delegate, isSigner: false, isWritable: false },
    { pubkey: owner, isSigner: true, isWritable: false },
  ];
  return new TransactionInstruction({
    keys,
    data: encodeTokenInstructionData({
      approve: { amount },
    }),
    programId: TOKEN_PROGRAM_ID,
  });
}

export function mintTo({ mint, account, amount, owner }) {
  const keys = [
    { pubkey: mint, isSigner: false, isWritable: true },
    { pubkey: account, isSigner: false, isWritable: true },
    { pubkey: owner, isSigner: true, isWritable: false },
  ];
  return new TransactionInstruction({
    keys,
    data: encodeTokenInstructionData({
      mintTo: { amount },
    }),
    programId: TOKEN_PROGRAM_ID,
  });
}

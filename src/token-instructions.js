import * as BufferLayout from 'buffer-layout';
import {
  PublicKey,
  SYSVAR_RENT_PUBKEY,
  TransactionInstruction,
} from '@solana/web3.js';
import { publicKeyLayout } from './layout';

// NOTE: Update these if the position of arguments for the initializeAccount instruction changes
export const INITIALIZE_ACCOUNT_ACCOUNT_INDEX = 0;
export const INITIALIZE_ACCOUNT_MINT_INDEX = 1;
export const INITIALIZE_ACCOUNT_OWNER_INDEX = 2;

// NOTE: Update these if the position of arguments for the transfer instruction changes
export const TRANSFER_SOURCE_INDEX = 0;
export const TRANSFER_DESTINATION_INDEX = 1;
export const TRANSFER_OWNER_INDEX = 2;

// NOTE: Update these if the position of arguments for the closeAccount instruction changes
export const CLOSE_ACCOUNT_SOURCE_INDEX = 0;
export const CLOSE_ACCOUNT_DESTINATION_INDEX = 1;
export const CLOSE_ACCOUNT_OWNER_INDEX = 2;

export const TOKEN_PROGRAM_ID = new PublicKey(
  'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
);

export const WRAPPED_SOL_MINT = new PublicKey(
  'So11111111111111111111111111111111111111112',
);

export const MSRM_MINT = new PublicKey(
  'MSRMcoVyrFxnSgo5uXwone5SKcGhT1KEJMFEkMEWf9L',
);
export const MSRM_DECIMALS = 0;

export const SRM_MINT = new PublicKey(
  'SRMuApVNdxXokk5GT7XD5cUUgXMBCoAz2LHeuAoKWRt',
);
export const SRM_DECIMALS = 6;

const LAYOUT = BufferLayout.union(BufferLayout.u8('instruction'));
LAYOUT.addVariant(
  0,
  BufferLayout.struct([
    BufferLayout.u8('decimals'),
    publicKeyLayout('mintAuthority'),
    BufferLayout.u8('freezeAuthorityOption'),
    publicKeyLayout('freezeAuthority'),
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
LAYOUT.addVariant(5, BufferLayout.struct([]), 'revoke');
LAYOUT.addVariant(
  6,
  BufferLayout.struct([
    BufferLayout.u8('authorityType'),
    BufferLayout.u8('newAuthorityOption'),
    publicKeyLayout('newAuthority'),
  ]),
  'setAuthority',
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
LAYOUT.addVariant(9, BufferLayout.struct([]), 'closeAccount');

const instructionMaxSpan = Math.max(
  ...Object.values(LAYOUT.registry).map((r) => r.span),
);

function encodeTokenInstructionData(instruction) {
  const b = Buffer.alloc(instructionMaxSpan);
  const span = LAYOUT.encode(instruction, b);
  return b.slice(0, span);
}

export function decodeTokenInstructionData(instruction) {
  return LAYOUT.decode(instruction);
}

export function initializeMint({
  mint,
  decimals,
  mintAuthority,
  freezeAuthority = null,
}) {
  const keys = [
    { pubkey: mint, isSigner: false, isWritable: true },
    { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
  ];
  return new TransactionInstruction({
    keys,
    data: encodeTokenInstructionData({
      initializeMint: {
        decimals,
        mintAuthority,
        freezeAuthorityOption: !!freezeAuthority,
        freezeAuthority: freezeAuthority || new PublicKey(0),
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
    { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
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

export function revoke({ source, owner }) {
  const keys = [
    { pubkey: source, isSigner: false, isWritable: true },
    { pubkey: owner, isSigner: true, isWritable: false },
  ];
  return new TransactionInstruction({
    keys,
    data: encodeTokenInstructionData({
      revoke: {},
    }),
    programId: TOKEN_PROGRAM_ID,
  });
}

export function setAuthority({
  target,
  currentAuthority,
  newAuthority,
  authorityType,
}) {
  const keys = [
    { pubkey: target, isSigner: false, isWritable: true },
    { pubkey: currentAuthority, isSigner: true, isWritable: false },
  ];
  return new TransactionInstruction({
    keys,
    data: encodeTokenInstructionData({
      setAuthority: {
        authorityType,
        newAuthorityOption: !!newAuthority,
        newAuthority,
      },
    }),
    programId: TOKEN_PROGRAM_ID,
  });
}

export function mintTo({ mint, destination, amount, mintAuthority }) {
  const keys = [
    { pubkey: mint, isSigner: false, isWritable: true },
    { pubkey: destination, isSigner: false, isWritable: true },
    { pubkey: mintAuthority, isSigner: true, isWritable: false },
  ];
  return new TransactionInstruction({
    keys,
    data: encodeTokenInstructionData({
      mintTo: { amount },
    }),
    programId: TOKEN_PROGRAM_ID,
  });
}

export function closeAccount({ source, destination, owner }) {
  const keys = [
    { pubkey: source, isSigner: false, isWritable: true },
    { pubkey: destination, isSigner: false, isWritable: true },
    { pubkey: owner, isSigner: true, isWritable: false },
  ];
  return new TransactionInstruction({
    keys,
    data: encodeTokenInstructionData({
      closeAccount: {},
    }),
    programId: TOKEN_PROGRAM_ID,
  });
}

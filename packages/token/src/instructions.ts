import {
  PublicKey,
  SYSVAR_RENT_PUBKEY,
  TransactionInstruction,
} from '@solana/web3.js';
import BN from 'bn.js';
import {
  option,
  publicKey,
  rustEnum,
  u64,
  struct,
  u8,
  EnumLayout,
} from '@project-serum/borsh';

export const TOKEN_PROGRAM_ID = new PublicKey(
  'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
);

export const WRAPPED_SOL_MINT = new PublicKey(
  'So11111111111111111111111111111111111111112',
);

export type TokenInstructionLayout =
  | {
      initializeMint: {
        decimals: number;
        mintAuthority: PublicKey;
        freezeAuthority: PublicKey | null;
      };
    }
  | { initializeAccount: any }
  | { initializeMultisig: { m: number } }
  | { transfer: { amount: BN } }
  | { approve: { amount: BN } }
  | { revoke: any }
  | { setAuthority: { authorityType: number; newAuthority: PublicKey | null } }
  | { mintTo: { amount: BN } }
  | { burn: { amount: BN } }
  | { closeAccount: any }
  | { freezeAccount: any }
  | { thawAccount: any }
  | { transferChecked: { amount: BN; decimals: number } }
  | { approveChecked: { amount: BN; decimals: number } }
  | { mintToChecked: { amount: BN; decimals: number } }
  | { burnChecked: { amount: BN; decimals: number } };

export const TokenInstructionLayout: EnumLayout<TokenInstructionLayout> = rustEnum(
  [
    struct(
      [
        u8('decimals'),
        publicKey('mintAuthority'),
        option(publicKey(), 'freezeAuthority'),
      ],
      'initializeMint',
    ),
    struct([], 'initializeAccount'),
    struct([u8('m')], 'initializeMultisig'),
    struct([u64('amount')], 'transfer'),
    struct([u64('amount')], 'approve'),
    struct([], 'revoke'),
    struct(
      [u8('authorityType'), option(publicKey(), 'newAuthority')],
      'setAuthority',
    ),
    struct([u64('amount')], 'mintTo'),
    struct([u64('amount')], 'burn'),
    struct([], 'closeAccount'),
    struct([], 'freezeAccount'),
    struct([], 'thawAccount'),
    struct([u64('amount'), u8('decimals')], 'transferChecked'),
    struct([u64('amount'), u8('decimals')], 'approveChecked'),
    struct([u64('amount'), u8('decimals')], 'mintToChecked'),
    struct([u64('amount'), u8('decimals')], 'burnChecked'),
  ],
);

const instructionMaxSpan = Math.max(
  ...Object.values(TokenInstructionLayout.registry).map(r => r.span),
);

function encodeTokenInstructionData(instruction: TokenInstructionLayout) {
  const b = Buffer.alloc(instructionMaxSpan);
  const span = TokenInstructionLayout.encode(instruction, b);
  return b.slice(0, span);
}

function decodeTokenInstructionData(data: Buffer) {
  return TokenInstructionLayout.decode(data);
}

export interface InitializeMintParams {
  mint: PublicKey;
  decimals: number;
  mintAuthority: PublicKey;
  freezeAuthority?: PublicKey | null;
}

export interface InitializeAccountParams {
  account: PublicKey;
  mint: PublicKey;
  owner: PublicKey;
}

export interface TransferParams {
  source: PublicKey;
  destination: PublicKey;
  amount: BN;
  owner: PublicKey;
}

export interface ApproveParams {
  source: PublicKey;
  delegate: PublicKey;
  amount: BN;
  owner: PublicKey;
}

export interface RevokeParams {
  source: PublicKey;
  owner: PublicKey;
}

export interface SetAuthorityParams {
  target: PublicKey;
  currentAuthority: PublicKey;
  newAuthority?: PublicKey | null;
  authorityType: number;
}

export interface MintToParams {
  mint: PublicKey;
  destination: PublicKey;
  amount: BN;
  mintAuthority: PublicKey;
}

export interface BurnParams {
  source: PublicKey;
  mint: PublicKey;
  amount: BN;
  owner: PublicKey;
}

export interface CloseAccountParams {
  source: PublicKey;
  destination: PublicKey;
  owner: PublicKey;
}

export class TokenInstructions {
  static initializeMint({
    mint,
    decimals,
    mintAuthority,
    freezeAuthority,
  }: InitializeMintParams): TransactionInstruction {
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
          freezeAuthority: freezeAuthority ?? null,
        },
      }),
      programId: TOKEN_PROGRAM_ID,
    });
  }

  static initializeAccount({
    account,
    mint,
    owner,
  }: InitializeAccountParams): TransactionInstruction {
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

  static transfer({
    source,
    destination,
    amount,
    owner,
  }: TransferParams): TransactionInstruction {
    const keys = [
      { pubkey: source, isSigner: false, isWritable: true },
      { pubkey: destination, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: false },
    ];
    return new TransactionInstruction({
      keys,
      data: encodeTokenInstructionData({
        transfer: {
          amount,
        },
      }),
      programId: TOKEN_PROGRAM_ID,
    });
  }

  static approve({
    source,
    delegate,
    amount,
    owner,
  }: ApproveParams): TransactionInstruction {
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

  static revoke({ source, owner }: RevokeParams): TransactionInstruction {
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

  static setAuthority({
    target,
    currentAuthority,
    newAuthority,
    authorityType,
  }: SetAuthorityParams): TransactionInstruction {
    const keys = [
      { pubkey: target, isSigner: false, isWritable: true },
      { pubkey: currentAuthority, isSigner: true, isWritable: false },
    ];
    return new TransactionInstruction({
      keys,
      data: encodeTokenInstructionData({
        setAuthority: {
          authorityType,
          newAuthority: newAuthority ?? null,
        },
      }),
      programId: TOKEN_PROGRAM_ID,
    });
  }

  static mintTo({
    mint,
    destination,
    amount,
    mintAuthority,
  }: MintToParams): TransactionInstruction {
    const keys = [
      { pubkey: mint, isSigner: false, isWritable: true },
      { pubkey: destination, isSigner: false, isWritable: true },
      { pubkey: mintAuthority, isSigner: true, isWritable: false },
    ];
    return new TransactionInstruction({
      keys,
      data: encodeTokenInstructionData({
        mintTo: {
          amount,
        },
      }),
      programId: TOKEN_PROGRAM_ID,
    });
  }

  static closeAccount({
    source,
    destination,
    owner,
  }: CloseAccountParams): TransactionInstruction {
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
}

export type TokenInstruction =
  | { type: 'initializeMint'; params: InitializeMintParams }
  | { type: 'initializeAccount'; params: InitializeAccountParams }
  | { type: 'transfer'; params: TransferParams }
  | { type: 'approve'; params: ApproveParams }
  | { type: 'revoke'; params: RevokeParams }
  | { type: 'setAuthority'; params: SetAuthorityParams }
  | { type: 'mintTo'; params: MintToParams }
  | { type: 'burn'; params: BurnParams }
  | { type: 'closeAccount'; params: CloseAccountParams };

export function decodeTokenInstruction(
  instruction: TransactionInstruction,
): TokenInstruction {
  const data = decodeTokenInstructionData(instruction.data);
  if ('initializeMint' in data) {
    const type = 'initializeMint';
    const params: InitializeMintParams = {
      decimals: data.initializeMint.decimals,
      mint: instruction.keys[0].pubkey,
      mintAuthority: data.initializeMint.mintAuthority,
      freezeAuthority: data.initializeMint.freezeAuthority,
    };
    return { type, params };
  } else if ('initializeAccount' in data) {
    const type = 'initializeAccount';
    const params: InitializeAccountParams = {
      account: instruction.keys[0].pubkey,
      mint: instruction.keys[1].pubkey,
      owner: instruction.keys[2].pubkey,
    };
    return { type, params };
  } else if ('transfer' in data) {
    const type = 'transfer';
    const params: TransferParams = {
      source: instruction.keys[0].pubkey,
      destination: instruction.keys[1].pubkey,
      owner: instruction.keys[2].pubkey,
      amount: data.transfer.amount,
    };
    return { type, params };
  } else if ('approve' in data) {
    const type = 'approve';
    const params: ApproveParams = {
      source: instruction.keys[0].pubkey,
      delegate: instruction.keys[1].pubkey,
      owner: instruction.keys[2].pubkey,
      amount: data.approve.amount,
    };
    return { type, params };
  } else if ('revoke' in data) {
    const type = 'revoke';
    const params: RevokeParams = {
      source: instruction.keys[0].pubkey,
      owner: instruction.keys[1].pubkey,
    };
    return { type, params };
  } else if ('setAuthority' in data) {
    const type = 'setAuthority';
    const params: SetAuthorityParams = {
      target: instruction.keys[0].pubkey,
      currentAuthority: instruction.keys[1].pubkey,
      newAuthority: data.setAuthority.newAuthority,
      authorityType: data.setAuthority.authorityType,
    };
    return { type, params };
  } else if ('mintTo' in data) {
    const type = 'mintTo';
    const params: MintToParams = {
      mint: instruction.keys[0].pubkey,
      destination: instruction.keys[1].pubkey,
      mintAuthority: instruction.keys[2].pubkey,
      amount: data.mintTo.amount,
    };
    return { type, params };
  } else if ('burn' in data) {
    const type = 'burn';
    const params: BurnParams = {
      source: instruction.keys[0].pubkey,
      mint: instruction.keys[1].pubkey,
      owner: instruction.keys[2].pubkey,
      amount: data.burn.amount,
    };
    return { type, params };
  } else if ('closeAccount' in data) {
    const type = 'closeAccount';
    const params: CloseAccountParams = {
      source: instruction.keys[0].pubkey,
      destination: instruction.keys[1].pubkey,
      owner: instruction.keys[2].pubkey,
    };
    return { type, params };
  } else if ('transferChecked' in data) {
    const type = 'transfer';
    const params: TransferParams = {
      source: instruction.keys[0].pubkey,
      destination: instruction.keys[2].pubkey,
      owner: instruction.keys[3].pubkey,
      amount: data.transferChecked.amount,
    };
    return { type, params };
  } else if ('approveChecked' in data) {
    const type = 'approve';
    const params: ApproveParams = {
      source: instruction.keys[0].pubkey,
      delegate: instruction.keys[2].pubkey,
      owner: instruction.keys[3].pubkey,
      amount: data.approveChecked.amount,
    };
    return { type, params };
  } else if ('mintToChecked' in data) {
    const type = 'mintTo';
    const params: MintToParams = {
      mint: instruction.keys[0].pubkey,
      destination: instruction.keys[1].pubkey,
      mintAuthority: instruction.keys[2].pubkey,
      amount: data.mintToChecked.amount,
    };
    return { type, params };
  } else if ('burnChecked' in data) {
    const type = 'burn';
    const params: BurnParams = {
      source: instruction.keys[0].pubkey,
      mint: instruction.keys[1].pubkey,
      owner: instruction.keys[2].pubkey,
      amount: data.burnChecked.amount,
    };
    return { type, params };
  } else {
    throw new Error('Unsupported token instruction type');
  }
}

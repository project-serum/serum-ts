import { Numberu64 } from '@solana/spl-token-swap';
import { PublicKey, Account, TransactionInstruction } from '@solana/web3.js';
import {
  Layout,
  struct,
  Structure,
  u8,
  nu64,
  blob,
  union,
} from 'buffer-layout';
import {
  AccountInfo,
  AccountLayout,
  MintInfo,
  MintLayout,
  u64,
} from '@solana/spl-token';
import BN from 'bn.js';
import { CurveType, PoolConfig } from './types';
import BufferLayout from 'buffer-layout';

export { TokenSwap } from '@solana/spl-token-swap';

export const PROGRAM_ID_V1 = new PublicKey(
  '9qvG1zUp8xF1Bi4m6UdRNby1BAAuaDrUxSpv4CmRRMjL',
);

export const PROGRAM_ID = new PublicKey(
  'SwaPpA9LAaLfeLi3a68M4DjnLqgtticKg6CnyNwgAC8',
);

export const TOKEN_PROGRAM_ID = new PublicKey(
  'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
);

export const WRAPPED_SOL_MINT = new PublicKey(
  'So11111111111111111111111111111111111111112',
);

export const SWAP_PROGRAM_OWNER_FEE_ADDRESS = new PublicKey(
  'HfoTxFR1Tm6kGmWgYWD6J7YHVy1UwqSULUGVLXkJqaKN',
);

export const DEFAULT_LIQUIDITY_TOKEN_PRECISION = 8;

export const LATEST_VERSION = 2;

export function getProgramVersion(programId: PublicKey): number {
  return PROGRAM_ID.equals(programId) ? LATEST_VERSION : 1;
}

/**
 * Layout for a public key
 */
export const publicKey = (property = 'publicKey'): Layout<PublicKey> => {
  const publicKeyLayout = blob(32, property) as any;

  const _decode = publicKeyLayout.decode.bind(publicKeyLayout);
  const _encode = publicKeyLayout.encode.bind(publicKeyLayout);

  publicKeyLayout.decode = (buffer: Buffer, offset?: number) => {
    const data = _decode(buffer, offset);
    return new PublicKey(data);
  };

  publicKeyLayout.encode = (key: PublicKey, buffer: Buffer, offset: number) => {
    return _encode(key.toBuffer(), buffer, offset);
  };

  return publicKeyLayout;
};

/**
 * Layout for a 64bit unsigned value
 */

export const uint64 = (property = 'uint64') => {
  return blob(8, property);
};

// TODO: add a proper <T> parameter to `TokenSwapLayoutLegacyV0`.
export const TokenSwapLayoutLegacyV0 = struct([
  u8('isInitialized'),
  u8('nonce'),
  publicKey('tokenAccountA'),
  publicKey('tokenAccountB'),
  publicKey('tokenPool'),
  uint64('feesNumerator'),
  uint64('feesDenominator'),
]);

// TODO: add a proper <T> parameter to `TokenSwapLayout`.
export const TokenSwapLayoutV1: Structure = struct([
  u8('isInitialized'),
  u8('nonce'),
  publicKey('tokenProgramId'),
  publicKey('tokenAccountA'),
  publicKey('tokenAccountB'),
  publicKey('tokenPool'),
  publicKey('mintA'),
  publicKey('mintB'),
  publicKey('feeAccount'),
  u8('curveType'),
  uint64('tradeFeeNumerator'),
  uint64('tradeFeeDenominator'),
  uint64('ownerTradeFeeNumerator'),
  uint64('ownerTradeFeeDenominator'),
  uint64('ownerWithdrawFeeNumerator'),
  uint64('ownerWithdrawFeeDenominator'),
  blob(16, 'padding'),
]);

const FEE_LAYOUT = struct(
  [
    nu64('tradeFeeNumerator'),
    nu64('tradeFeeDenominator'),
    nu64('ownerTradeFeeNumerator'),
    nu64('ownerTradeFeeDenominator'),
    nu64('ownerWithdrawFeeNumerator'),
    nu64('ownerWithdrawFeeDenominator'),
    nu64('hostFeeNumerator'),
    nu64('hostFeeDenominator'),
  ],
  'fees',
);

const CURVE_NODE = union(u8(), blob(32), 'curve');
CURVE_NODE.addVariant(0, struct([]), 'constantProduct');
CURVE_NODE.addVariant(1, struct([nu64('token_b_price')]), 'constantPrice');
CURVE_NODE.addVariant(2, struct([]), 'stable');
CURVE_NODE.addVariant(3, struct([nu64('token_b_offset')]), 'offset');

export const TokenSwapLayout: Structure = struct([
  u8('version'),
  u8('isInitialized'),
  u8('nonce'),
  publicKey('tokenProgramId'),
  publicKey('tokenAccountA'),
  publicKey('tokenAccountB'),
  publicKey('tokenPool'),
  publicKey('mintA'),
  publicKey('mintB'),
  publicKey('feeAccount'),
  FEE_LAYOUT,
  CURVE_NODE,
]);

export function getLayoutForProgramId(programId: PublicKey): Structure {
  if (getProgramVersion(programId) == 2) {
    return TokenSwapLayout;
  } else if (getProgramVersion(programId) == 1) {
    return TokenSwapLayoutV1;
  }
  return TokenSwapLayoutLegacyV0;
}

export function getCreateInitSwapInstructionV2Layout(config: PoolConfig): Structure {
    const fields = [
    u8('instruction'),
    u8('nonce'),
    nu64('tradeFeeNumerator'),
    nu64('tradeFeeDenominator'),
    nu64('ownerTradeFeeNumerator'),
    nu64('ownerTradeFeeDenominator'),
    nu64('ownerWithdrawFeeNumerator'),
    nu64('ownerWithdrawFeeDenominator'),
    nu64('hostFeeNumerator'),
    nu64('hostFeeDenominator'),
    u8('curveType'),
  ] as any[];

  if (config.curveType === CurveType.ConstantProductWithOffset) {
    fields.push(nu64('token_b_offset'));
    fields.push(blob(24, 'padding'));
  } else if (config.curveType === CurveType.ConstantPrice) {
    fields.push(nu64('token_b_price'));
    fields.push(blob(24, 'padding'));
  } else {
    fields.push(blob(32, 'padding'));
  }

  return struct(fields);
}

export const createInitSwapInstruction = (
  tokenSwapAccount: PublicKey,
  authority: PublicKey,
  tokenAccountA: PublicKey,
  tokenAccountB: PublicKey,
  tokenPool: PublicKey,
  feeAccount: PublicKey,
  tokenAccountPool: PublicKey,
  tokenProgramId: PublicKey,
  swapProgramId: PublicKey,
  nonce: number,
  config: PoolConfig,
): TransactionInstruction => {
  const keys = [
    { pubkey: tokenSwapAccount, isSigner: false, isWritable: true },
    { pubkey: authority, isSigner: false, isWritable: false },
    { pubkey: tokenAccountA, isSigner: false, isWritable: false },
    { pubkey: tokenAccountB, isSigner: false, isWritable: false },
    { pubkey: tokenPool, isSigner: false, isWritable: true },
    { pubkey: feeAccount, isSigner: false, isWritable: false },
    { pubkey: tokenAccountPool, isSigner: false, isWritable: true },
    { pubkey: tokenProgramId, isSigner: false, isWritable: false },
  ];

  let data = Buffer.alloc(1024);
  if (getProgramVersion(swapProgramId) === LATEST_VERSION) {
    const commandDataLayout = getCreateInitSwapInstructionV2Layout(config);
    const { fees, ...rest } = config;

    const encodeLength = commandDataLayout.encode(
      {
        instruction: 0, // InitializeSwap instruction
        nonce,
        ...fees,
        ...rest,
      },
      data,
    );
    data = data.slice(0, encodeLength);
  } else {
    const commandDataLayout = struct([
      u8('instruction'),
      u8('nonce'),
      u8('curveType'),
      nu64('tradeFeeNumerator'),
      nu64('tradeFeeDenominator'),
      nu64('ownerTradeFeeNumerator'),
      nu64('ownerTradeFeeDenominator'),
      nu64('ownerWithdrawFeeNumerator'),
      nu64('ownerWithdrawFeeDenominator'),
      blob(16, 'padding'),
    ]);

    const encodeLength = commandDataLayout.encode(
      {
        instruction: 0, // InitializeSwap instruction
        nonce,
        curveType: config.curveType,
        tradeFeeNumerator: config.fees.tradeFeeNumerator,
        tradeFeeDenominator: config.fees.tradeFeeDenominator,
        ownerTradeFeeNumerator: config.fees.ownerTradeFeeNumerator,
        ownerTradeFeeDenominator: config.fees.ownerTradeFeeDenominator,
        ownerWithdrawFeeNumerator: config.fees.ownerWithdrawFeeNumerator,
        ownerWithdrawFeeDenominator: config.fees.ownerWithdrawFeeDenominator,
      },
      data,
    );
    data = data.slice(0, encodeLength);
  }

  return new TransactionInstruction({
    keys,
    programId: swapProgramId,
    data,
  });
};

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

  const keysByVersion: { [keys: number]: Array<any> } = {
    1: [
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
    2: [
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
  };

  const keys = keysByVersion[getProgramVersion(swapProgramId)];

  return new TransactionInstruction({
    keys,
    programId: swapProgramId,
    data,
  });
};

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
    u8('instruction'),
    uint64('sourceTokenAmount'),
    uint64('minimumPoolTokenAmount'),
  ]);

  const data = Buffer.alloc(dataLayout.span);
  dataLayout.encode(
    {
      instruction: 4, // DepositExactOne instruction
      sourceTokenAmount: new Numberu64(sourceTokenAmount).toBuffer(),
      minimumPoolTokenAmount: new Numberu64(minimumPoolTokenAmount).toBuffer(),
    },
    data,
  );

  const keys = isLatest
    ? [
        { pubkey: tokenSwap, isSigner: false, isWritable: false },
        { pubkey: authority, isSigner: false, isWritable: false },
        { pubkey: transferAuthority, isSigner: true, isWritable: false },
        { pubkey: source, isSigner: false, isWritable: true },
        { pubkey: intoA, isSigner: false, isWritable: true },
        { pubkey: intoB, isSigner: false, isWritable: true },
        { pubkey: poolToken, isSigner: false, isWritable: true },
        { pubkey: poolAccount, isSigner: false, isWritable: true },
        { pubkey: tokenProgramId, isSigner: false, isWritable: false },
      ]
    : [
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

  const keysByVersion: { [keys: number]: Array<any> } = {
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
    ],
  };

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
    u8('instruction'),
    uint64('sourceTokenAmount'),
    uint64('maximumTokenAmount'),
  ]);

  const data = Buffer.alloc(dataLayout.span);
  dataLayout.encode(
    {
      instruction: 5, // WithdrawExactOne instruction
      sourceTokenAmount: new Numberu64(sourceTokenAmount).toBuffer(),
      maximumTokenAmount: new Numberu64(maximumTokenAmount).toBuffer(),
    },
    data,
  );

  const keys = isLatest
    ? [
        { pubkey: tokenSwap, isSigner: false, isWritable: false },
        { pubkey: authority, isSigner: false, isWritable: false },
        { pubkey: transferAuthority, isSigner: true, isWritable: false },
        { pubkey: poolMint, isSigner: false, isWritable: true },
        { pubkey: sourcePoolAccount, isSigner: false, isWritable: true },
        { pubkey: fromA, isSigner: false, isWritable: true },
        { pubkey: fromB, isSigner: false, isWritable: true },
        { pubkey: userAccount, isSigner: false, isWritable: true },
      ]
    : [
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

  const keysByVersion: { [keys: number]: Array<any> } = {
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

export interface Mint {
  mintAuthority: Buffer;
  supply: Buffer;
  decimals: number;
  isInitialized: number;
  freezeAuthority: Buffer | null;
}

export const MINT_LAYOUT: Layout<Mint> = struct([
  blob(4),
  blob(32, 'mintAuthority'),
  blob(8, 'supply'),
  u8('decimals'),
  u8('isInitialized'),
  blob(4, 'freezeAuthorityOption'),
  blob(32, 'freezeAuthority'),
]);

export const deserializeMint = (data: Buffer): MintInfo => {
  if (data.length !== MintLayout.span) {
    throw new Error('Not a valid Mint');
  }

  const mintInfo = MintLayout.decode(data);

  if (mintInfo.mintAuthorityOption === 0) {
    mintInfo.mintAuthority = null;
  } else {
    mintInfo.mintAuthority = new PublicKey(mintInfo.mintAuthority);
  }

  mintInfo.supply = u64.fromBuffer(mintInfo.supply);
  mintInfo.isInitialized = mintInfo.isInitialized !== 0;

  if (mintInfo.freezeAuthorityOption === 0) {
    mintInfo.freezeAuthority = null;
  } else {
    mintInfo.freezeAuthority = new PublicKey(mintInfo.freezeAuthority);
  }

  return mintInfo as MintInfo;
};

export function parseTokenAccount(data: Buffer): AccountInfo {
  const accountInfo = AccountLayout.decode(data);
  accountInfo.mint = new PublicKey(accountInfo.mint);
  accountInfo.owner = new PublicKey(accountInfo.owner);
  accountInfo.amount = u64.fromBuffer(accountInfo.amount);

  if (accountInfo.delegateOption === 0) {
    accountInfo.delegate = null;
    // eslint-disable-next-line new-cap
    accountInfo.delegatedAmount = new u64(0);
  } else {
    accountInfo.delegate = new PublicKey(accountInfo.delegate);
    accountInfo.delegatedAmount = u64.fromBuffer(accountInfo.delegatedAmount);
  }

  accountInfo.isInitialized = accountInfo.state !== 0;
  accountInfo.isFrozen = accountInfo.state === 2;

  if (accountInfo.isNativeOption === 1) {
    accountInfo.rentExemptReserve = u64.fromBuffer(accountInfo.isNative);
    accountInfo.isNative = true;
  } else {
    accountInfo.rentExemptReserve = null;
    accountInfo.isNative = false;
  }

  if (accountInfo.closeAuthorityOption === 0) {
    accountInfo.closeAuthority = null;
  } else {
    accountInfo.closeAuthority = new PublicKey(accountInfo.closeAuthority);
  }

  return accountInfo;
}

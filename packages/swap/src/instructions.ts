import { Numberu64 } from '@solana/spl-token-swap';
import { PublicKey, Account, TransactionInstruction } from '@solana/web3.js';
import { Layout, struct, Structure, u8, nu64, blob } from 'buffer-layout';
import { AccountInfo, AccountLayout, MintInfo, u64 } from '@solana/spl-token';

export { TokenSwap } from '@solana/spl-token-swap';

export const PROGRAM_ID = new PublicKey(
  '9qvG1zUp8xF1Bi4m6UdRNby1BAAuaDrUxSpv4CmRRMjL',
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

export function getProgramVersion(programId: PublicKey): number {
  return 1;
}

/**
 * Layout for a public key
 */
export const publicKey = (property = 'publicKey') => {
  return blob(32, property);
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
export const TokenSwapLayout: Structure = struct([
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

export const createInitSwapInstruction = (
  tokenSwapAccount: Account,
  authority: PublicKey,
  tokenAccountA: PublicKey,
  tokenAccountB: PublicKey,
  tokenPool: PublicKey,
  feeAccount: PublicKey,
  tokenAccountPool: PublicKey,
  tokenProgramId: PublicKey,
  swapProgramId: PublicKey,
  nonce: number,
  curveType: number,
  tradeFeeNumerator: number,
  tradeFeeDenominator: number,
  ownerTradeFeeNumerator: number,
  ownerTradeFeeDenominator: number,
  ownerWithdrawFeeNumerator: number,
  ownerWithdrawFeeDenominator: number,
): TransactionInstruction => {
  const keys = [
    { pubkey: tokenSwapAccount.publicKey, isSigner: false, isWritable: true },
    { pubkey: authority, isSigner: false, isWritable: false },
    { pubkey: tokenAccountA, isSigner: false, isWritable: false },
    { pubkey: tokenAccountB, isSigner: false, isWritable: false },
    { pubkey: tokenPool, isSigner: false, isWritable: true },
    { pubkey: feeAccount, isSigner: false, isWritable: false },
    { pubkey: tokenAccountPool, isSigner: false, isWritable: true },
    { pubkey: tokenProgramId, isSigner: false, isWritable: false },
  ];

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
  let data = Buffer.alloc(1024);
  {
    const encodeLength = commandDataLayout.encode(
      {
        instruction: 0, // InitializeSwap instruction
        nonce,
        curveType,
        tradeFeeNumerator,
        tradeFeeDenominator,
        ownerTradeFeeNumerator,
        ownerTradeFeeDenominator,
        ownerWithdrawFeeNumerator,
        ownerWithdrawFeeDenominator,
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

  const keys = [
    { pubkey: tokenSwap, isSigner: false, isWritable: false },
    { pubkey: authority, isSigner: false, isWritable: false },
    { pubkey: sourceA, isSigner: false, isWritable: true },
    { pubkey: sourceB, isSigner: false, isWritable: true },
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

  const keys = [
    { pubkey: tokenSwap, isSigner: false, isWritable: false },
    { pubkey: authority, isSigner: false, isWritable: false },
    { pubkey: poolMint, isSigner: false, isWritable: true },
    { pubkey: sourcePoolAccount, isSigner: false, isWritable: true },
    { pubkey: fromA, isSigner: false, isWritable: true },
    { pubkey: fromB, isSigner: false, isWritable: true },
    { pubkey: userAccountA, isSigner: false, isWritable: true },
    { pubkey: userAccountB, isSigner: false, isWritable: true },
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

  const keys = [
    { pubkey: tokenSwap, isSigner: false, isWritable: false },
    { pubkey: authority, isSigner: false, isWritable: false },
    { pubkey: userSource, isSigner: false, isWritable: true },
    { pubkey: poolSource, isSigner: false, isWritable: true },
    { pubkey: poolDestination, isSigner: false, isWritable: true },
    { pubkey: userDestination, isSigner: false, isWritable: true },
    { pubkey: poolMint, isSigner: false, isWritable: true },
    { pubkey: feeAccount, isSigner: false, isWritable: true },
    { pubkey: tokenProgramId, isSigner: false, isWritable: false },
  ];

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
  mintAuthority: PublicKey;
  supply: u64;
  decimals: number;
  isInitialized: boolean;
  freezeAuthority: PublicKey | null;
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

export function parseMintData(data: Buffer): MintInfo {
  return MINT_LAYOUT.decode(data);
}

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

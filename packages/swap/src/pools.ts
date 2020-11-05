import {
  AccountLayout,
  MintInfo,
  MintLayout,
  Token,
  u64,
} from '@solana/spl-token';
import {
  Account,
  Commitment,
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  TransactionSignature,
} from '@solana/web3.js';
import {
  createInitSwapInstruction,
  DEFAULT_LIQUIDITY_TOKEN_PRECISION,
  depositInstruction,
  getProgramVersion,
  parseMintData,
  parseTokenAccount,
  PROGRAM_ID,
  SWAP_PROGRAM_OWNER_FEE_ADDRESS,
  swapInstruction,
  TOKEN_PROGRAM_ID,
  TokenSwapLayout,
  withdrawInstruction,
  WRAPPED_SOL_MINT,
} from './instructions';
import { PoolConfig, PoolOptions, TokenAccount } from './types';
import { timeMs } from './utils';
import assert from 'assert';

export class Pool {
  private _decoded: any;
  private _programId: PublicKey;
  private _poolAccount: PublicKey;
  private _tokenMints: PublicKey[];
  private _holdingAccounts: PublicKey[];
  private _poolTokenMint: PublicKey;
  private _feeAccount: PublicKey;
  private _skipPreflight: boolean;
  private _commitment: Commitment;
  private _mintAccountsCache: {
    [publickKey: string]: { value: MintInfo; ts: number };
  };

  private _tokenAccountsCache: {
    [publickKey: string]: { value: TokenAccount; ts: number };
  };

  constructor(
    decoded: any, // todo: remove any
    poolAccount: PublicKey,
    programId: PublicKey,
    options: PoolOptions = {},
  ) {
    const { skipPreflight = false, commitment = 'recent' } = options;
    this._decoded = decoded;
    this._poolAccount = poolAccount;
    this._programId = programId;
    this._tokenMints = [
      new PublicKey(decoded.mintA),
      new PublicKey(decoded.mintB),
    ];
    this._holdingAccounts = [
      new PublicKey(decoded.tokenAccountA),
      new PublicKey(decoded.tokenAccountB),
    ];
    this._poolTokenMint = new PublicKey(decoded.tokenPool);
    this._feeAccount = new PublicKey(decoded.feeAccount);
    this._skipPreflight = skipPreflight;
    this._commitment = commitment;
    this._mintAccountsCache = {};
    this._tokenAccountsCache = {};
  }

  static async load(
    connection: Connection,
    address: PublicKey,
    programId: PublicKey,
    options: PoolOptions = {},
  ): Promise<Pool> {
    const account = throwIfNull(
      await connection.getAccountInfo(address),
      'Pool not found',
    );
    const decoded = TokenSwapLayout.decode(account.data);
    return new Pool(decoded, address, programId, options);
  }

  get address(): PublicKey {
    return this._poolAccount;
  }

  get publicKey(): PublicKey {
    return this.address;
  }

  get programVersion(): number {
    return getProgramVersion(this._programId);
  }

  async cached<T>(
    callable: () => Promise<T>,
    cache: { [key: string]: { value: T; ts: number } },
    key: string,
    cacheDurationMs: number,
  ): Promise<T> {
    const cachedItem = cache[key];
    const now = timeMs();
    if (cachedItem && now - cachedItem.ts < cacheDurationMs) {
      return cachedItem.value;
    }
    const value = await callable();
    cache[key] = {
      value,
      ts: now,
    };
    return value;
  }

  async getCachedMintAccount(
    connection: Connection,
    pubkey: PublicKey | string,
    cacheDurationMs = 0,
  ): Promise<MintInfo> {
    return this.cached<MintInfo>(
      () => getMintAccount(connection, pubkey),
      this._mintAccountsCache,
      typeof pubkey === 'string' ? pubkey : pubkey.toBase58(),
      cacheDurationMs,
    );
  }

  async getCachedTokenAccount(
    connection: Connection,
    pubkey: PublicKey | string,
    cacheDurationMs = 0,
  ): Promise<TokenAccount> {
    return this.cached<TokenAccount>(
      () => getTokenAccount(connection, pubkey),
      this._tokenAccountsCache,
      typeof pubkey === 'string' ? pubkey : pubkey.toBase58(),
      cacheDurationMs,
    );
  }

  async makeRemoveLiquidityTransaction<T extends PublicKey | Account>(
    connection: Connection,
    owner: T,
    liquidityAmount: number,
    poolAccount: TokenAccount,
    tokenAccounts: TokenAccount[],
  ): Promise<{ transaction: Transaction; signers: Account[]; payer: T }> {
    // @ts-ignore
    const ownerAddress: PublicKey = owner.publicKey ?? owner;

    // TODO get min amounts based on total supply and liquidity
    const minAmount0 = 0;
    const minAmount1 = 0;

    const poolMint = await this.getCachedMintAccount(
      connection,
      this._poolTokenMint,
      3600000,
    );
    const accountA = await this.getCachedTokenAccount(
      connection,
      this._holdingAccounts[0],
      3600000,
    );
    const accountB = await this.getCachedTokenAccount(
      connection,
      this._holdingAccounts[1],
      3600000,
    );
    if (!poolMint.mintAuthority) {
      throw new Error('Mint doesnt have authority');
    }
    const authority = poolMint.mintAuthority;

    const signers: Account[] = [];
    const instructions: TransactionInstruction[] = [];
    const cleanUpInstructions: TransactionInstruction[] = [];

    let tokenAccountA: PublicKey | undefined;
    let tokenAccountB: PublicKey | undefined;
    if (accountA.info.mint.equals(WRAPPED_SOL_MINT)) {
      const accountRentExempt = await connection.getMinimumBalanceForRentExemption(
        AccountLayout.span,
      );
      const { account, instructions, cleanUpInstructions } = createTokenAccount(
        ownerAddress,
        ownerAddress,
        WRAPPED_SOL_MINT,
        accountRentExempt,
      );
      tokenAccountA = account.publicKey;
      signers.push(account);
      instructions.concat(instructions);
      cleanUpInstructions.concat(cleanUpInstructions);
    } else {
      tokenAccountA = tokenAccounts.find(a =>
        a.info.mint.equals(accountA.info.mint),
      )?.pubkey;
    }
    if (accountB.info.mint.equals(WRAPPED_SOL_MINT)) {
      const accountRentExempt = await connection.getMinimumBalanceForRentExemption(
        AccountLayout.span,
      );
      const { account, instructions, cleanUpInstructions } = createTokenAccount(
        ownerAddress,
        ownerAddress,
        WRAPPED_SOL_MINT,
        accountRentExempt,
      );
      tokenAccountB = account.publicKey;
      signers.push(account);
      instructions.concat(instructions);
      cleanUpInstructions.concat(cleanUpInstructions);
    } else {
      tokenAccountB = tokenAccounts.find(a =>
        a.info.mint.equals(accountB.info.mint),
      )?.pubkey;
    }
    assert(
      !!tokenAccountA,
      `Token account for mint ${accountA.info.mint.toBase58()} not provided`,
    );
    assert(
      !!tokenAccountB,
      `Token account for mint ${accountB.info.mint.toBase58()} not provided`,
    );

    instructions.push(
      Token.createApproveInstruction(
        TOKEN_PROGRAM_ID,
        poolAccount.pubkey,
        authority,
        ownerAddress,
        [],
        liquidityAmount,
      ),
    );

    instructions.push(
      withdrawInstruction(
        this._poolAccount,
        authority,
        this._poolTokenMint,
        this._feeAccount,
        poolAccount.pubkey,
        this._holdingAccounts[0],
        this._holdingAccounts[1],
        tokenAccountA,
        tokenAccountB,
        this._programId,
        TOKEN_PROGRAM_ID,
        liquidityAmount,
        minAmount0,
        minAmount1,
      ),
    );
    const transaction = new Transaction();
    transaction.add(...instructions, ...cleanUpInstructions);
    return { transaction, signers, payer: owner };
  }

  async makeAddLiquidityTransaction<T extends PublicKey | Account>(
    connection: Connection,
    owner: T,
    sourceTokenAccounts: {
      mint: PublicKey;
      tokenAccount: PublicKey;
      amount: number; // note this is raw amount, not decimal
    }[],
    poolTokenAccount?: PublicKey,
    slippageTolerance = 0.005, // allow slippage of this much between setting input amounts and on chain transaction
  ): Promise<{ transaction: Transaction; signers: Account[]; payer: T }> {
    // @ts-ignore
    const ownerAddress: PublicKey = owner.publicKey ?? owner;
    const poolMint = await this.getCachedMintAccount(
      connection,
      this._poolTokenMint,
      360000,
    );
    if (!poolMint.mintAuthority) {
      throw new Error('Mint doesnt have authority');
    }

    if (!this._feeAccount) {
      throw new Error('Invald fee account');
    }

    const accountA = await this.getCachedTokenAccount(
      connection,
      this._holdingAccounts[0],
    );
    const accountB = await this.getCachedTokenAccount(
      connection,
      this._holdingAccounts[1],
    );

    const reserve0 = accountA.info.amount.toNumber();
    const reserve1 = accountB.info.amount.toNumber();
    const [fromA, fromB] = accountA.info.mint.equals(
      sourceTokenAccounts[0].mint,
    )
      ? [sourceTokenAccounts[0], sourceTokenAccounts[1]]
      : [sourceTokenAccounts[1], sourceTokenAccounts[0]];

    if (!fromA.tokenAccount || !fromB.tokenAccount) {
      throw new Error('Missing account info.');
    }

    const supply = poolMint.supply.toNumber();
    const authority = poolMint.mintAuthority;

    // Uniswap whitepaper: https://uniswap.org/whitepaper.pdf
    // see: https://uniswap.org/docs/v2/advanced-topics/pricing/
    // as well as native uniswap v2 oracle: https://uniswap.org/docs/v2/core-concepts/oracles/
    const amount0 = fromA.amount;
    const amount1 = fromB.amount;

    const liquidity = Math.min(
      (amount0 * (1 - slippageTolerance) * supply) / reserve0,
      (amount1 * (1 - slippageTolerance) * supply) / reserve1,
    );
    const instructions: TransactionInstruction[] = [];
    const cleanupInstructions: TransactionInstruction[] = [];

    const signers: Account[] = [];

    const accountRentExempt = await connection.getMinimumBalanceForRentExemption(
      AccountLayout.span,
    );

    let fromKeyA: PublicKey;
    if (fromA.mint.equals(WRAPPED_SOL_MINT)) {
      const {
        account,
        instructions: createWrappedSolInstructions,
        cleanUpInstructions: removeWrappedSolInstructions,
      } = createTokenAccount(
        ownerAddress,
        ownerAddress,
        WRAPPED_SOL_MINT,
        fromA.amount + accountRentExempt,
      );
      fromKeyA = account.publicKey;
      signers.push(account);
      instructions.push(...createWrappedSolInstructions);
      cleanupInstructions.push(...removeWrappedSolInstructions);
    } else {
      fromKeyA = fromA.tokenAccount;
    }

    let fromKeyB: PublicKey;
    if (fromB.mint.equals(WRAPPED_SOL_MINT)) {
      const {
        account,
        instructions: createWrappedSolInstructions,
        cleanUpInstructions: removeWrappedSolInstructions,
      } = createTokenAccount(
        ownerAddress,
        ownerAddress,
        WRAPPED_SOL_MINT,
        fromB.amount + accountRentExempt,
      );
      fromKeyB = account.publicKey;
      signers.push(account);
      instructions.push(...createWrappedSolInstructions);
      cleanupInstructions.push(...removeWrappedSolInstructions);
    } else {
      fromKeyB = fromB.tokenAccount;
    }

    let toAccount: PublicKey;
    if (!poolTokenAccount) {
      const {
        account,
        instructions: createToAccountInstructions,
        cleanUpInstructions: cleanupCreateToAccountInstructions,
      } = createTokenAccount(
        ownerAddress,
        ownerAddress,
        this._poolTokenMint,
        accountRentExempt,
      );
      toAccount = account.publicKey;
      signers.push(account);
      instructions.push(...createToAccountInstructions);
      cleanupInstructions.push(...cleanupCreateToAccountInstructions);
    } else {
      toAccount = poolTokenAccount;
    }

    // create approval for transfer transactions
    instructions.push(
      Token.createApproveInstruction(
        TOKEN_PROGRAM_ID,
        fromKeyA,
        authority,
        ownerAddress,
        [],
        amount0,
      ),
    );

    instructions.push(
      Token.createApproveInstruction(
        TOKEN_PROGRAM_ID,
        fromKeyB,
        authority,
        ownerAddress,
        [],
        amount1,
      ),
    );

    instructions.push(
      depositInstruction(
        this._poolAccount,
        authority,
        fromKeyA,
        fromKeyB,
        this._holdingAccounts[0],
        this._holdingAccounts[1],
        this._poolTokenMint,
        toAccount,
        this._programId,
        TOKEN_PROGRAM_ID,
        liquidity,
        amount0,
        amount1,
      ),
    );

    const transaction = new Transaction();
    transaction.add(...instructions);
    transaction.add(...cleanupInstructions);
    return { transaction, signers, payer: owner };
  }

  async makeSwapTransaction<T extends PublicKey | Account>(
    connection: Connection,
    owner: T,
    tokenIn: {
      mint: PublicKey;
      tokenAccount: PublicKey;
      amount: number;
    },
    tokenOut: {
      mint: PublicKey;
      tokenAccount: PublicKey;
      amount: number;
    },
    slippage: number,
    hostFeeAccount?: PublicKey,
  ): Promise<{ transaction: Transaction; signers: Account[]; payer: T }> {
    // @ts-ignore
    const ownerAddress: PublicKey = owner.publicKey ?? owner;
    const [poolMint, inMint, outMint] = await Promise.all([
      this.getCachedMintAccount(connection, this._poolTokenMint, 3600_000),
      this.getCachedMintAccount(connection, tokenIn.mint, 3600_000),
      this.getCachedMintAccount(connection, tokenOut.mint, 3600_000),
    ]);
    const amountIn = Math.floor(tokenIn.amount * Math.pow(10, inMint.decimals));
    const minAmountOut = Math.floor(
      tokenOut.amount * Math.pow(10, outMint.decimals) * (1 - slippage),
    );
    const holdingA =
      this._tokenMints[0].toBase58() === tokenIn.mint.toBase58()
        ? this._holdingAccounts[0]
        : this._holdingAccounts[1];
    const holdingB = holdingA.equals(this._holdingAccounts[0])
      ? this._holdingAccounts[1]
      : this._holdingAccounts[0];

    if (!poolMint.mintAuthority || !this._feeAccount) {
      throw new Error('Mint doesnt have authority');
    }
    const authority = poolMint.mintAuthority;

    const instructions: TransactionInstruction[] = [];
    const cleanupInstructions: TransactionInstruction[] = [];
    const signers: Account[] = [];

    const accountRentExempt = await connection.getMinimumBalanceForRentExemption(
      AccountLayout.span,
    );

    let fromAccount: PublicKey;
    if (tokenIn.mint.equals(WRAPPED_SOL_MINT)) {
      const {
        account,
        instructions: createWrappedSolInstructions,
        cleanUpInstructions: removeWrappedSolInstructions,
      } = createTokenAccount(
        ownerAddress,
        ownerAddress,
        WRAPPED_SOL_MINT,
        amountIn + accountRentExempt,
      );
      fromAccount = account.publicKey;
      signers.push(account);
      instructions.push(...createWrappedSolInstructions);
      cleanupInstructions.push(...removeWrappedSolInstructions);
    } else {
      fromAccount = tokenIn.tokenAccount;
    }

    let toAccount: PublicKey;
    if (tokenOut.mint.equals(WRAPPED_SOL_MINT)) {
      const {
        account,
        instructions: createWrappedSolInstructions,
        cleanUpInstructions: removeWrappedSolInstructions,
      } = createTokenAccount(
        ownerAddress,
        ownerAddress,
        WRAPPED_SOL_MINT,
        accountRentExempt,
      );
      toAccount = account.publicKey;
      signers.push(account);
      instructions.push(...createWrappedSolInstructions);
      cleanupInstructions.push(...removeWrappedSolInstructions);
    } else {
      toAccount = tokenOut.tokenAccount;
    }

    // create approval for transfer transactions
    const approveInstruction = Token.createApproveInstruction(
      TOKEN_PROGRAM_ID,
      fromAccount,
      authority,
      ownerAddress,
      [],
      amountIn,
    );
    instructions.push(approveInstruction);

    // swap
    instructions.push(
      swapInstruction(
        this._poolAccount,
        authority,
        fromAccount,
        holdingA,
        holdingB,
        toAccount,
        this._poolTokenMint,
        this._feeAccount,
        PROGRAM_ID,
        TOKEN_PROGRAM_ID,
        amountIn,
        minAmountOut,
        hostFeeAccount,
      ),
    );

    instructions.push(...cleanupInstructions);
    const transaction = new Transaction();
    transaction.add(...instructions);
    return { transaction, signers, payer: owner };
  }

  async swap(
    connection: Connection,
    owner: Account,
    tokenIn: {
      mint: PublicKey;
      tokenAccount: PublicKey;
      amount: number;
    },
    tokenOut: {
      mint: PublicKey;
      tokenAccount: PublicKey;
      amount: number;
    },
    slippage: number,
    hostFeeAccount?: PublicKey,
    skipPreflight = true,
    commitment: Commitment = 'single',
  ): Promise<string> {
    const {transaction, signers, payer} = await this.makeSwapTransaction(connection, owner, tokenIn, tokenOut, slippage, hostFeeAccount);
    return await sendTransaction(
      connection,
      transaction,
      [payer, ...signers],
      skipPreflight,
      commitment
    )
  }

  static async makeInitializePoolTransaction<T extends PublicKey | Account>(
    connection: Connection,
    owner: T,
    componentMints: PublicKey[],
    sourceTokenAccounts: {
      mint: PublicKey;
      tokenAccount: PublicKey;
      amount: number; // note this is raw amount, not decimal
    }[],
    options: PoolConfig,
    liquidityTokenPrecision = DEFAULT_LIQUIDITY_TOKEN_PRECISION,
  ): Promise<{
    initializeAccountsTransaction: Transaction;
    initializeAccountsSigners: Account[];
    initializePoolTransaction: Transaction;
    initializePoolSigners: Account[];
  }> {
    // @ts-ignore
    const ownerAddress: PublicKey = owner.publicKey ?? owner;
    const initializeAccountsInstructions: TransactionInstruction[] = [];
    const initializeAccountsSigners: Account[] = [];

    const liquidityTokenMintAccount = new Account();
    initializeAccountsInstructions.push(
      SystemProgram.createAccount({
        fromPubkey: ownerAddress,
        newAccountPubkey: liquidityTokenMintAccount.publicKey,
        lamports: await connection.getMinimumBalanceForRentExemption(
          MintLayout.span,
        ),
        space: MintLayout.span,
        programId: TOKEN_PROGRAM_ID,
      }),
    );
    initializeAccountsSigners.push(liquidityTokenMintAccount);

    const tokenSwapAccount = new Account();
    const [authority, nonce] = await PublicKey.findProgramAddress(
      [tokenSwapAccount.publicKey.toBuffer()],
      PROGRAM_ID,
    );

    // create mint for pool liquidity token
    initializeAccountsInstructions.push(
      Token.createInitMintInstruction(
        TOKEN_PROGRAM_ID,
        liquidityTokenMintAccount.publicKey,
        liquidityTokenPrecision,
        // pass control of liquidity mint to swap program
        authority,
        // swap program can freeze liquidity token mint
        null,
      ),
    );
    const accountRentExempt = await connection.getMinimumBalanceForRentExemption(
      AccountLayout.span,
    );
    const holdingAccounts: { [mint: string]: Account } = {};
    componentMints.forEach(mint => {
      const {
        account,
        instructions: createHoldingTokenAccountInstructions,
      } = createTokenAccount(authority, ownerAddress, mint, accountRentExempt);
      initializeAccountsInstructions.push(
        ...createHoldingTokenAccountInstructions,
      );
      initializeAccountsSigners.push(account);
      holdingAccounts[mint.toBase58()] = account;
    });

    const {
      account: depositorAccount,
      instructions: createLPTokenAccountInstructions,
    } = createTokenAccount(
      ownerAddress,
      ownerAddress,
      liquidityTokenMintAccount.publicKey,
      accountRentExempt,
    );
    initializeAccountsSigners.push(depositorAccount);
    initializeAccountsInstructions.push(...createLPTokenAccountInstructions);

    const {
      account: feeAccount,
      instructions: createFeeAccountInstructions,
    } = createTokenAccount(
      SWAP_PROGRAM_OWNER_FEE_ADDRESS,
      ownerAddress,
      liquidityTokenMintAccount.publicKey,
      accountRentExempt,
    );
    initializeAccountsSigners.push(feeAccount);
    initializeAccountsInstructions.push(...createFeeAccountInstructions);
    const initializeAccountsTransaction = new Transaction();
    initializeAccountsTransaction.add(...initializeAccountsInstructions);

    // break up these into two transactions because it does not fit in a single transaction
    const initializePoolSigners: Account[] = [];
    const initializePoolInstructions: TransactionInstruction[] = [];
    const cleanupInstructions: TransactionInstruction[] = [];

    initializePoolInstructions.push(
      SystemProgram.createAccount({
        fromPubkey: ownerAddress,
        newAccountPubkey: tokenSwapAccount.publicKey,
        lamports: await connection.getMinimumBalanceForRentExemption(
          TokenSwapLayout.span,
        ),
        space: TokenSwapLayout.span,
        programId: PROGRAM_ID,
      }),
    );

    sourceTokenAccounts.forEach(({ mint, tokenAccount, amount }) => {
      let wrappedAccount: PublicKey;
      if (mint.equals(WRAPPED_SOL_MINT)) {
        const {
          account,
          instructions: createWrappedSolInstructions,
          cleanUpInstructions: removeWrappedSolInstructions,
        } = createTokenAccount(
          ownerAddress,
          ownerAddress,
          WRAPPED_SOL_MINT,
          amount + accountRentExempt,
        );
        wrappedAccount = account.publicKey;
        initializePoolSigners.push(account);
        initializePoolInstructions.push(...createWrappedSolInstructions);
        cleanupInstructions.push(...removeWrappedSolInstructions);
      } else {
        wrappedAccount = tokenAccount;
      }

      initializePoolInstructions.push(
        Token.createTransferInstruction(
          TOKEN_PROGRAM_ID,
          wrappedAccount,
          holdingAccounts[mint.toBase58()].publicKey,
          ownerAddress,
          [],
          amount,
        ),
      );
    });

    initializePoolInstructions.push(
      createInitSwapInstruction(
        tokenSwapAccount,
        authority,
        holdingAccounts[sourceTokenAccounts[0].mint.toBase58()].publicKey,
        holdingAccounts[sourceTokenAccounts[1].mint.toBase58()].publicKey,
        liquidityTokenMintAccount.publicKey,
        feeAccount.publicKey,
        depositorAccount.publicKey,
        TOKEN_PROGRAM_ID,
        PROGRAM_ID,
        nonce,
        options.curveType,
        options.tradeFeeNumerator,
        options.tradeFeeDenominator,
        options.ownerTradeFeeNumerator,
        options.ownerTradeFeeDenominator,
        options.ownerWithdrawFeeNumerator,
        options.ownerWithdrawFeeDenominator,
      ),
    );
    initializePoolSigners.push(tokenSwapAccount);
    const initializePoolTransaction = new Transaction();
    initializePoolTransaction.add(
      ...initializePoolInstructions,
      ...cleanupInstructions,
    );
    return {
      initializeAccountsTransaction,
      initializeAccountsSigners,
      initializePoolTransaction,
      initializePoolSigners,
    };
  }

  static async initializePool(
    connection: Connection,
    owner: Account,
    componentMints: PublicKey[],
    sourceTokenAccounts: {
      mint: PublicKey;
      tokenAccount: PublicKey;
      amount: number;
    }[],
    options: PoolConfig,
    liquidityTokenPrecision = DEFAULT_LIQUIDITY_TOKEN_PRECISION,
    skipPreflight = true,
    commitment: Commitment = 'single',
  ): Promise<string> {
    const {
      initializeAccountsTransaction,
      initializeAccountsSigners,
      initializePoolTransaction,
      initializePoolSigners,
    } = await Pool.makeInitializePoolTransaction(
      connection,
      owner,
      componentMints,
      sourceTokenAccounts,
      options,
      liquidityTokenPrecision,
    );
    const createAccountsTxid = await sendTransaction(
      connection,
      initializeAccountsTransaction,
      [owner, ...initializeAccountsSigners],
      skipPreflight,
      commitment,
    );
    const status = (await connection.confirmTransaction(createAccountsTxid))
      .value;
    assert(
      !status.err,
      `Received error awaiting create accounts transaction ${createAccountsTxid}`,
    );
    return await sendTransaction(
      connection,
      initializePoolTransaction,
      [owner, ...initializePoolSigners],
      skipPreflight,
      commitment,
    );
  }

  async getHoldings(
    connection: Connection,
  ): Promise<{ account: PublicKey; mint: PublicKey; holding: u64 }[]> {
    const accounts = await Promise.all([
      this.getCachedTokenAccount(connection, this._holdingAccounts[0]),
      this.getCachedTokenAccount(connection, this._holdingAccounts[1]),
    ]);
    return accounts.map(account => {
      return {
        account: account.pubkey,
        mint: account.info.mint,
        holding: account.info.amount,
      };
    });
  }
}

async function sendTransaction(
  connection: Connection,
  transaction: Transaction,
  signers: Array<Account>,
  skipPreflight = true,
  commitment: Commitment = 'single',
): Promise<TransactionSignature> {
  const signature = await connection.sendTransaction(transaction, signers, {
    skipPreflight: skipPreflight,
  });
  const { value } = await connection.confirmTransaction(signature, commitment);
  if (value?.err) {
    throw new Error(JSON.stringify(value.err));
  }
  return signature;
}

export const getMintAccount = async (
  connection: Connection,
  pubKey: PublicKey | string,
): Promise<MintInfo> => {
  const address = typeof pubKey === 'string' ? new PublicKey(pubKey) : pubKey;
  const info = await connection.getAccountInfo(address);
  if (info === null) {
    throw new Error('Failed to find mint account');
  }
  return parseMintData(info.data);
};

export const getTokenAccount = async (
  connection: Connection,
  pubKey: PublicKey | string,
): Promise<TokenAccount> => {
  const address = typeof pubKey === 'string' ? new PublicKey(pubKey) : pubKey;
  const info = await connection.getAccountInfo(address);
  if (info === null) {
    throw new Error('Failed to find token account');
  }
  const accountInfo = parseTokenAccount(info.data);
  return {
    pubkey: address,
    account: info,
    info: accountInfo,
  };
};

export const createTokenAccount = (
  owner: PublicKey,
  payer: PublicKey,
  mint: PublicKey,
  lamports: number,
) => {
  const account = new Account();
  const instructions: TransactionInstruction[] = [];
  const cleanUpInstructions: TransactionInstruction[] = [];
  const space = AccountLayout.span as number;
  instructions.push(
    SystemProgram.createAccount({
      fromPubkey: payer,
      newAccountPubkey: account.publicKey,
      lamports,
      space,
      programId: TOKEN_PROGRAM_ID,
    }),
  );

  instructions.push(
    Token.createInitAccountInstruction(
      TOKEN_PROGRAM_ID,
      mint,
      account.publicKey,
      owner,
    ),
  );
  if (mint.equals(WRAPPED_SOL_MINT)) {
    cleanUpInstructions.push(
      Token.createCloseAccountInstruction(
        TOKEN_PROGRAM_ID,
        account.publicKey,
        payer,
        owner,
        [],
      ),
    );
  }
  return { account, instructions, cleanUpInstructions };
};

function throwIfNull<T>(value: T | null, message = 'account not found'): T {
  if (value === null) {
    throw new Error(message);
  }
  return value;
}

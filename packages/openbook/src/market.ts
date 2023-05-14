import {
  Account,
  AccountInfo,
  Commitment,
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  TransactionSignature,
} from '@solana/web3.js';
import BN from 'bn.js';
import { Buffer } from 'buffer';
import { blob, seq, struct, u8 } from 'buffer-layout';
import { getFeeTier, supportsSrmFeeDiscounts } from './fees';
import { DexInstructions } from './instructions';
import { accountFlagsLayout, publicKeyLayout, u128, u64 } from './layout';
import { decodeEventQueue, decodeRequestQueue } from './queue';
import { Slab, SLAB_LAYOUT } from './slab';
import {
  closeAccount,
  initializeAccount,
  MSRM_DECIMALS,
  MSRM_MINT,
  SRM_DECIMALS,
  SRM_MINT,
  TOKEN_PROGRAM_ID,
  WRAPPED_SOL_MINT,
} from './token-instructions';
import { getLayoutVersion } from './tokens_and_markets';

export const _MARKET_STAT_LAYOUT_V1 = struct([
  blob(5),

  accountFlagsLayout('accountFlags'),

  publicKeyLayout('ownAddress'),

  u64('vaultSignerNonce'),

  publicKeyLayout('baseMint'),
  publicKeyLayout('quoteMint'),

  publicKeyLayout('baseVault'),
  u64('baseDepositsTotal'),
  u64('baseFeesAccrued'),

  publicKeyLayout('quoteVault'),
  u64('quoteDepositsTotal'),
  u64('quoteFeesAccrued'),

  u64('quoteDustThreshold'),

  publicKeyLayout('requestQueue'),
  publicKeyLayout('eventQueue'),

  publicKeyLayout('bids'),
  publicKeyLayout('asks'),

  u64('baseLotSize'),
  u64('quoteLotSize'),

  u64('feeRateBps'),

  blob(7),
]);

export const MARKET_STATE_LAYOUT_V2 = struct([
  blob(5),

  accountFlagsLayout('accountFlags'),

  publicKeyLayout('ownAddress'),

  u64('vaultSignerNonce'),

  publicKeyLayout('baseMint'),
  publicKeyLayout('quoteMint'),

  publicKeyLayout('baseVault'),
  u64('baseDepositsTotal'),
  u64('baseFeesAccrued'),

  publicKeyLayout('quoteVault'),
  u64('quoteDepositsTotal'),
  u64('quoteFeesAccrued'),

  u64('quoteDustThreshold'),

  publicKeyLayout('requestQueue'),
  publicKeyLayout('eventQueue'),

  publicKeyLayout('bids'),
  publicKeyLayout('asks'),

  u64('baseLotSize'),
  u64('quoteLotSize'),

  u64('feeRateBps'),

  u64('referrerRebatesAccrued'),

  blob(7),
]);

export const MARKET_STATE_LAYOUT_V3 = struct([
  blob(5),

  accountFlagsLayout('accountFlags'),

  publicKeyLayout('ownAddress'),

  u64('vaultSignerNonce'),

  publicKeyLayout('baseMint'),
  publicKeyLayout('quoteMint'),

  publicKeyLayout('baseVault'),
  u64('baseDepositsTotal'),
  u64('baseFeesAccrued'),

  publicKeyLayout('quoteVault'),
  u64('quoteDepositsTotal'),
  u64('quoteFeesAccrued'),

  u64('quoteDustThreshold'),

  publicKeyLayout('requestQueue'),
  publicKeyLayout('eventQueue'),

  publicKeyLayout('bids'),
  publicKeyLayout('asks'),

  u64('baseLotSize'),
  u64('quoteLotSize'),

  u64('feeRateBps'),

  u64('referrerRebatesAccrued'),

  publicKeyLayout('authority'),
  publicKeyLayout('pruneAuthority'),
  publicKeyLayout('consumeEventsAuthority'),

  blob(992),

  blob(7),
]);

export class Market {
  private _decoded: any;
  private _baseSplTokenDecimals: number;
  private _quoteSplTokenDecimals: number;
  private _skipPreflight: boolean;
  private _commitment: Commitment;
  private _programId: PublicKey;
  private _openOrdersAccountsCache: {
    [publickKey: string]: { accounts: OpenOrders[]; ts: number };
  };
  private _layoutOverride?: any;

  private _feeDiscountKeysCache: {
    [publicKey: string]: {
      accounts: Array<{
        balance: number;
        mint: PublicKey;
        pubkey: PublicKey;
        feeTier: number;
      }>;
      ts: number;
    };
  };

  constructor(
    decoded,
    baseMintDecimals: number,
    quoteMintDecimals: number,
    options: MarketOptions = {},
    programId: PublicKey,
    layoutOverride?: any,
  ) {
    const { skipPreflight = false, commitment = 'recent' } = options;
    if (!decoded.accountFlags.initialized || !decoded.accountFlags.market) {
      throw new Error('Invalid market state');
    }
    this._decoded = decoded;
    this._baseSplTokenDecimals = baseMintDecimals;
    this._quoteSplTokenDecimals = quoteMintDecimals;
    this._skipPreflight = skipPreflight;
    this._commitment = commitment;
    this._programId = programId;
    this._openOrdersAccountsCache = {};
    this._feeDiscountKeysCache = {};
    this._layoutOverride = layoutOverride;
  }

  static getLayout(programId: PublicKey) {
    if (getLayoutVersion(programId) === 1) {
      return _MARKET_STAT_LAYOUT_V1;
    }
    return MARKET_STATE_LAYOUT_V2;
  }

  static async findAccountsByMints(
    connection: Connection,
    baseMintAddress: PublicKey,
    quoteMintAddress: PublicKey,
    programId: PublicKey,
  ) {
    const filters = [
      {
        memcmp: {
          offset: this.getLayout(programId).offsetOf('baseMint'),
          bytes: baseMintAddress.toBase58(),
        },
      },
      {
        memcmp: {
          offset: Market.getLayout(programId).offsetOf('quoteMint'),
          bytes: quoteMintAddress.toBase58(),
        },
      },
    ];
    return getFilteredProgramAccounts(connection, programId, filters);
  }

  static async load(
    connection: Connection,
    address: PublicKey,
    options: MarketOptions = {},
    programId: PublicKey,
    layoutOverride?: any,
  ) {
    const { owner, data } = throwIfNull(
      await connection.getAccountInfo(address),
      'Market not found',
    );
    if (!owner.equals(programId)) {
      throw new Error('Address not owned by program: ' + owner.toBase58());
    }
    const decoded = (layoutOverride ?? this.getLayout(programId)).decode(data);
    if (
      !decoded.accountFlags.initialized ||
      !decoded.accountFlags.market ||
      !decoded.ownAddress.equals(address)
    ) {
      throw new Error('Invalid market');
    }
    const [baseMintDecimals, quoteMintDecimals] = await Promise.all([
      getMintDecimals(connection, decoded.baseMint),
      getMintDecimals(connection, decoded.quoteMint),
    ]);
    return new Market(
      decoded,
      baseMintDecimals,
      quoteMintDecimals,
      options,
      programId,
      layoutOverride,
    );
  }

  get programId(): PublicKey {
    return this._programId;
  }

  get address(): PublicKey {
    return this._decoded.ownAddress;
  }

  get publicKey(): PublicKey {
    return this.address;
  }

  get baseMintAddress(): PublicKey {
    return this._decoded.baseMint;
  }

  get quoteMintAddress(): PublicKey {
    return this._decoded.quoteMint;
  }

  get bidsAddress(): PublicKey {
    return this._decoded.bids;
  }

  get asksAddress(): PublicKey {
    return this._decoded.asks;
  }

  get decoded(): any {
    return this._decoded;
  }

  async loadBids(connection: Connection): Promise<Orderbook> {
    const { data } = throwIfNull(
      await connection.getAccountInfo(this._decoded.bids),
    );
    return Orderbook.decode(this, data);
  }

  async loadAsks(connection: Connection): Promise<Orderbook> {
    const { data } = throwIfNull(
      await connection.getAccountInfo(this._decoded.asks),
    );
    return Orderbook.decode(this, data);
  }

  async loadOrdersForOwner(
    connection: Connection,
    ownerAddress: PublicKey,
    cacheDurationMs = 0,
  ): Promise<Order[]> {
    const [bids, asks, openOrdersAccounts] = await Promise.all([
      this.loadBids(connection),
      this.loadAsks(connection),
      this.findOpenOrdersAccountsForOwner(
        connection,
        ownerAddress,
        cacheDurationMs,
      ),
    ]);
    return this.filterForOpenOrders(bids, asks, openOrdersAccounts);
  }

  filterForOpenOrders(
    bids: Orderbook,
    asks: Orderbook,
    openOrdersAccounts: OpenOrders[],
  ): Order[] {
    return [...bids, ...asks].filter((order) =>
      openOrdersAccounts.some((openOrders) =>
        order.openOrdersAddress.equals(openOrders.address),
      ),
    );
  }

  async findBaseTokenAccountsForOwner(
    connection: Connection,
    ownerAddress: PublicKey,
    includeUnwrappedSol = false,
  ): Promise<Array<{ pubkey: PublicKey; account: AccountInfo<Buffer> }>> {
    if (this.baseMintAddress.equals(WRAPPED_SOL_MINT) && includeUnwrappedSol) {
      const [wrapped, unwrapped] = await Promise.all([
        this.findBaseTokenAccountsForOwner(connection, ownerAddress, false),
        connection.getAccountInfo(ownerAddress),
      ]);
      if (unwrapped !== null) {
        return [{ pubkey: ownerAddress, account: unwrapped }, ...wrapped];
      }
      return wrapped;
    }
    return await this.getTokenAccountsByOwnerForMint(
      connection,
      ownerAddress,
      this.baseMintAddress,
    );
  }

  async getTokenAccountsByOwnerForMint(
    connection: Connection,
    ownerAddress: PublicKey,
    mintAddress: PublicKey,
  ): Promise<Array<{ pubkey: PublicKey; account: AccountInfo<Buffer> }>> {
    return (
      await connection.getTokenAccountsByOwner(ownerAddress, {
        mint: mintAddress,
      })
    ).value;
  }

  async findQuoteTokenAccountsForOwner(
    connection: Connection,
    ownerAddress: PublicKey,
    includeUnwrappedSol = false,
  ): Promise<{ pubkey: PublicKey; account: AccountInfo<Buffer> }[]> {
    if (this.quoteMintAddress.equals(WRAPPED_SOL_MINT) && includeUnwrappedSol) {
      const [wrapped, unwrapped] = await Promise.all([
        this.findQuoteTokenAccountsForOwner(connection, ownerAddress, false),
        connection.getAccountInfo(ownerAddress),
      ]);
      if (unwrapped !== null) {
        return [{ pubkey: ownerAddress, account: unwrapped }, ...wrapped];
      }
      return wrapped;
    }
    return await this.getTokenAccountsByOwnerForMint(
      connection,
      ownerAddress,
      this.quoteMintAddress,
    );
  }

  async findOpenOrdersAccountsForOwner(
    connection: Connection,
    ownerAddress: PublicKey,
    cacheDurationMs = 0,
    forceSeedAccount: boolean = false,
  ): Promise<OpenOrders[]> {
    const strOwner = ownerAddress.toBase58();
    const now = new Date().getTime();
    if (
      strOwner in this._openOrdersAccountsCache &&
      now - this._openOrdersAccountsCache[strOwner].ts < cacheDurationMs
    ) {
      return this._openOrdersAccountsCache[strOwner].accounts;
    }
    const openOrdersAccountsForOwner = await OpenOrders.findForMarketAndOwner(
      connection,
      this.address,
      ownerAddress,
      this._programId,
      forceSeedAccount,
    );
    this._openOrdersAccountsCache[strOwner] = {
      accounts: openOrdersAccountsForOwner,
      ts: now,
    };
    return openOrdersAccountsForOwner;
  }

  async replaceOrders(
    connection: Connection,
    accounts: OrderParamsAccounts,
    orders: OrderParamsBase[],
    cacheDurationMs = 0,
  ) {
    if (!accounts.openOrdersAccount && !accounts.openOrdersAddressKey) {
      const ownerAddress: PublicKey =
        accounts.owner.publicKey ?? accounts.owner;
      const openOrdersAccounts = await this.findOpenOrdersAccountsForOwner(
        connection,
        ownerAddress,
        cacheDurationMs,
      );
      accounts.openOrdersAddressKey = openOrdersAccounts[0].address;
    }

    const transaction = new Transaction();
    transaction.add(
      this.makeReplaceOrdersByClientIdsInstruction(accounts, orders),
    );
    return await this._sendTransaction(connection, transaction, [
      accounts.owner,
    ]);
  }

  async placeOrder(
    connection: Connection,
    {
      owner,
      payer,
      side,
      price,
      size,
      orderType = 'limit',
      clientId,
      openOrdersAddressKey,
      openOrdersAccount,
      feeDiscountPubkey,
      maxTs,
      replaceIfExists = false,
    }: OrderParams,
  ) {
    const { transaction, signers } =
      await this.makePlaceOrderTransaction<Account>(connection, {
        owner,
        payer,
        side,
        price,
        size,
        orderType,
        clientId,
        openOrdersAddressKey,
        openOrdersAccount,
        feeDiscountPubkey,
        maxTs,
        replaceIfExists,
      });
    return await this._sendTransaction(connection, transaction, [
      owner,
      ...signers,
    ]);
  }

  async sendTake(
    connection: Connection,
    {
      owner,
      baseWallet,
      quoteWallet,
      side,
      price,
      maxBaseSize,
      maxQuoteSize,
      minBaseSize,
      minQuoteSize,
      limit = 65535,
      programId = undefined,
      feeDiscountPubkey = undefined,
    }: SendTakeParams,
  ) {
    const { transaction, signers } =
      await this.makeSendTakeTransaction<Account>(connection, {
        owner,
        baseWallet,
        quoteWallet,
        side,
        price,
        maxBaseSize,
        maxQuoteSize,
        minBaseSize,
        minQuoteSize,
        limit,
        programId,
        feeDiscountPubkey,
      });
    return await this._sendTransaction(connection, transaction, [
      owner,
      ...signers,
    ]);
  }

  getSplTokenBalanceFromAccountInfo(
    accountInfo: AccountInfo<Buffer>,
    decimals: number,
  ): number {
    return divideBnToNumber(
      new BN(accountInfo.data.slice(64, 72), 10, 'le'),
      new BN(10).pow(new BN(decimals)),
    );
  }

  get supportsSrmFeeDiscounts() {
    return supportsSrmFeeDiscounts(this._programId);
  }

  get supportsReferralFees() {
    return getLayoutVersion(this._programId) > 1;
  }

  get usesRequestQueue() {
    return getLayoutVersion(this._programId) <= 2;
  }

  async findFeeDiscountKeys(
    connection: Connection,
    ownerAddress: PublicKey,
    cacheDurationMs = 0,
  ): Promise<
    Array<{
      pubkey: PublicKey;
      feeTier: number;
      balance: number;
      mint: PublicKey;
    }>
  > {
    let sortedAccounts: Array<{
      balance: number;
      mint: PublicKey;
      pubkey: PublicKey;
      feeTier: number;
    }> = [];
    const now = new Date().getTime();
    const strOwner = ownerAddress.toBase58();
    if (
      strOwner in this._feeDiscountKeysCache &&
      now - this._feeDiscountKeysCache[strOwner].ts < cacheDurationMs
    ) {
      return this._feeDiscountKeysCache[strOwner].accounts;
    }

    if (this.supportsSrmFeeDiscounts) {
      // Fee discounts based on (M)SRM holdings supported in newer versions
      const msrmAccounts = (
        await this.getTokenAccountsByOwnerForMint(
          connection,
          ownerAddress,
          MSRM_MINT,
        )
      ).map(({ pubkey, account }) => {
        const balance = this.getSplTokenBalanceFromAccountInfo(
          account,
          MSRM_DECIMALS,
        );
        return {
          pubkey,
          mint: MSRM_MINT,
          balance,
          feeTier: getFeeTier(balance, 0),
        };
      });
      const srmAccounts = (
        await this.getTokenAccountsByOwnerForMint(
          connection,
          ownerAddress,
          SRM_MINT,
        )
      ).map(({ pubkey, account }) => {
        const balance = this.getSplTokenBalanceFromAccountInfo(
          account,
          SRM_DECIMALS,
        );
        return {
          pubkey,
          mint: SRM_MINT,
          balance,
          feeTier: getFeeTier(0, balance),
        };
      });
      sortedAccounts = msrmAccounts.concat(srmAccounts).sort((a, b) => {
        if (a.feeTier > b.feeTier) {
          return -1;
        } else if (a.feeTier < b.feeTier) {
          return 1;
        } else {
          if (a.balance > b.balance) {
            return -1;
          } else if (a.balance < b.balance) {
            return 1;
          } else {
            return 0;
          }
        }
      });
    }
    this._feeDiscountKeysCache[strOwner] = {
      accounts: sortedAccounts,
      ts: now,
    };
    return sortedAccounts;
  }

  async findBestFeeDiscountKey(
    connection: Connection,
    ownerAddress: PublicKey,
    cacheDurationMs = 30000,
  ): Promise<{ pubkey: PublicKey | null; feeTier: number }> {
    const accounts = await this.findFeeDiscountKeys(
      connection,
      ownerAddress,
      cacheDurationMs,
    );
    if (accounts.length > 0) {
      return {
        pubkey: accounts[0].pubkey,
        feeTier: accounts[0].feeTier,
      };
    }
    return {
      pubkey: null,
      feeTier: 0,
    };
  }

  async makePlaceOrderTransaction<T extends PublicKey | Account>(
    connection: Connection,
    {
      owner,
      payer,
      side,
      price,
      size,
      orderType = 'limit',
      clientId,
      openOrdersAddressKey,
      openOrdersAccount,
      feeDiscountPubkey = undefined,
      selfTradeBehavior = 'decrementTake',
      maxTs,
      replaceIfExists = false,
    }: OrderParams<T>,
    cacheDurationMs = 0,
    feeDiscountPubkeyCacheDurationMs = 0,
  ) {
    // @ts-ignore
    const ownerAddress: PublicKey = owner.publicKey ?? owner;
    const openOrdersAccounts = await this.findOpenOrdersAccountsForOwner(
      connection,
      ownerAddress,
      cacheDurationMs,
    );
    const transaction = new Transaction();
    const signers: Account[] = [];

    // Fetch an SRM fee discount key if the market supports discounts and it is not supplied
    let useFeeDiscountPubkey: PublicKey | null;
    if (feeDiscountPubkey) {
      useFeeDiscountPubkey = feeDiscountPubkey;
    } else if (
      feeDiscountPubkey === undefined &&
      this.supportsSrmFeeDiscounts
    ) {
      useFeeDiscountPubkey = (
        await this.findBestFeeDiscountKey(
          connection,
          ownerAddress,
          feeDiscountPubkeyCacheDurationMs,
        )
      ).pubkey;
    } else {
      useFeeDiscountPubkey = null;
    }

    let openOrdersAddress: PublicKey;
    if (openOrdersAccounts.length === 0) {
      let account;

      if (openOrdersAccount) {
        account = openOrdersAccount;
      } else {
        account = await OpenOrders.getDerivedOOAccountPubkey(
          ownerAddress,
          this.address,
          this.programId,
        );
      }
      transaction.add(
        await OpenOrders.makeCreateAccountTransaction(
          connection,
          this.address,
          ownerAddress,
          account.publicKey,
          this._programId,
          account.seed,
        ),
      );
      openOrdersAddress = account.publicKey;
      // refresh the cache of open order accounts on next fetch
      this._openOrdersAccountsCache[ownerAddress.toBase58()].ts = 0;
    } else if (openOrdersAccount) {
      openOrdersAddress = openOrdersAccount.publicKey;
    } else if (openOrdersAddressKey) {
      openOrdersAddress = openOrdersAddressKey;
    } else {
      openOrdersAddress = openOrdersAccounts[0].address;
    }

    let wrappedSolAccount: Account | null = null;
    if (payer.equals(ownerAddress)) {
      if (
        (side === 'buy' && this.quoteMintAddress.equals(WRAPPED_SOL_MINT)) ||
        (side === 'sell' && this.baseMintAddress.equals(WRAPPED_SOL_MINT))
      ) {
        wrappedSolAccount = new Account();
        let lamports;
        if (side === 'buy') {
          lamports = Math.round(price * size * 1.01 * LAMPORTS_PER_SOL);
          if (openOrdersAccounts.length > 0) {
            lamports -= openOrdersAccounts[0].quoteTokenFree.toNumber();
          }
        } else {
          lamports = Math.round(size * LAMPORTS_PER_SOL);
          if (openOrdersAccounts.length > 0) {
            lamports -= openOrdersAccounts[0].baseTokenFree.toNumber();
          }
        }
        lamports = Math.max(lamports, 0) + 1e7;
        transaction.add(
          SystemProgram.createAccount({
            fromPubkey: ownerAddress,
            newAccountPubkey: wrappedSolAccount.publicKey,
            lamports,
            space: 165,
            programId: TOKEN_PROGRAM_ID,
          }),
        );
        transaction.add(
          initializeAccount({
            account: wrappedSolAccount.publicKey,
            mint: WRAPPED_SOL_MINT,
            owner: ownerAddress,
          }),
        );
        signers.push(wrappedSolAccount);
      }
    } else {
      throw new Error('Invalid payer account');
    }

    const placeOrderInstruction = this.makePlaceOrderInstruction(connection, {
      owner,
      payer: wrappedSolAccount?.publicKey ?? payer,
      side,
      price,
      size,
      orderType,
      clientId,
      openOrdersAddressKey: openOrdersAddress,
      feeDiscountPubkey: useFeeDiscountPubkey,
      selfTradeBehavior,
      maxTs,
      replaceIfExists,
    });
    transaction.add(placeOrderInstruction);

    if (wrappedSolAccount) {
      transaction.add(
        closeAccount({
          source: wrappedSolAccount.publicKey,
          destination: ownerAddress,
          owner: ownerAddress,
        }),
      );
    }

    return { transaction, signers, payer: owner };
  }

  makePlaceOrderInstruction<T extends PublicKey | Account>(
    connection: Connection,
    params: OrderParams<T>,
  ): TransactionInstruction {
    const {
      owner,
      payer,
      side,
      price,
      size,
      orderType = 'limit',
      clientId,
      openOrdersAddressKey,
      openOrdersAccount,
      feeDiscountPubkey = null,
    } = params;
    // @ts-ignore
    const ownerAddress: PublicKey = owner.publicKey ?? owner;
    if (this.baseSizeNumberToLots(size).lte(new BN(0))) {
      throw new Error('size too small');
    }
    if (this.priceNumberToLots(price).lte(new BN(0))) {
      throw new Error('invalid price');
    }
    if (this.usesRequestQueue) {
      return DexInstructions.newOrder({
        market: this.address,
        requestQueue: this._decoded.requestQueue,
        baseVault: this._decoded.baseVault,
        quoteVault: this._decoded.quoteVault,
        openOrders: openOrdersAccount
          ? openOrdersAccount.publicKey
          : openOrdersAddressKey,
        owner: ownerAddress,
        payer,
        side,
        limitPrice: this.priceNumberToLots(price),
        maxQuantity: this.baseSizeNumberToLots(size),
        orderType,
        clientId,
        programId: this._programId,
        // @ts-ignore
        feeDiscountPubkey: this.supportsSrmFeeDiscounts
          ? feeDiscountPubkey
          : null,
      });
    } else {
      return this.makeNewOrderV3Instruction(params);
    }
  }

  makeNewOrderV3Instruction<T extends PublicKey | Account>(
    params: OrderParams<T>,
  ): TransactionInstruction {
    const {
      owner,
      payer,
      side,
      price,
      size,
      orderType = 'limit',
      clientId,
      openOrdersAddressKey,
      openOrdersAccount,
      feeDiscountPubkey = null,
      selfTradeBehavior = 'decrementTake',
      programId,
      maxTs,
      replaceIfExists,
    } = params;
    // @ts-ignore
    const ownerAddress: PublicKey = owner.publicKey ?? owner;
    return DexInstructions.newOrderV3({
      market: this.address,
      bids: this._decoded.bids,
      asks: this._decoded.asks,
      requestQueue: this._decoded.requestQueue,
      eventQueue: this._decoded.eventQueue,
      baseVault: this._decoded.baseVault,
      quoteVault: this._decoded.quoteVault,
      openOrders: openOrdersAccount
        ? openOrdersAccount.publicKey
        : openOrdersAddressKey,
      owner: ownerAddress,
      payer,
      side,
      limitPrice: this.priceNumberToLots(price),
      maxBaseQuantity: this.baseSizeNumberToLots(size),
      maxQuoteQuantity: new BN(this._decoded.quoteLotSize.toNumber()).mul(
        this.baseSizeNumberToLots(size).mul(this.priceNumberToLots(price)),
      ),
      orderType,
      clientId,
      programId: programId ?? this._programId,
      selfTradeBehavior,
      // @ts-ignore
      feeDiscountPubkey: this.supportsSrmFeeDiscounts
        ? feeDiscountPubkey
        : null,
      // @ts-ignore
      maxTs,
      replaceIfExists,
    });
  }

  async makeSendTakeTransaction<T extends PublicKey | Account>(
    connection: Connection,
    {
      owner,
      baseWallet,
      quoteWallet,
      side,
      price,
      maxBaseSize,
      maxQuoteSize,
      minBaseSize,
      minQuoteSize,
      limit = 65535,
      programId = undefined,
      feeDiscountPubkey = undefined,
    }: SendTakeParams<T>,
    feeDiscountPubkeyCacheDurationMs = 0,
  ) {
    // @ts-ignore
    const ownerAddress: PublicKey = owner.publicKey ?? owner;
    const transaction = new Transaction();
    const signers: Account[] = [];

    // @ts-ignore
    const vaultSigner = await PublicKey.createProgramAddress(
      [
        this.address.toBuffer(),
        this._decoded.vaultSignerNonce.toArrayLike(Buffer, 'le', 8),
      ],
      this._programId,
    );

    // Fetch an SRM fee discount key if the market supports discounts and it is not supplied
    let useFeeDiscountPubkey: PublicKey | null;
    if (feeDiscountPubkey) {
      useFeeDiscountPubkey = feeDiscountPubkey;
    } else if (
      feeDiscountPubkey === undefined &&
      this.supportsSrmFeeDiscounts
    ) {
      useFeeDiscountPubkey = (
        await this.findBestFeeDiscountKey(
          connection,
          ownerAddress,
          feeDiscountPubkeyCacheDurationMs,
        )
      ).pubkey;
    } else {
      useFeeDiscountPubkey = null;
    }

    const sendTakeInstruction = this.makeSendTakeInstruction({
      owner,
      baseWallet,
      quoteWallet,
      vaultSigner,
      side,
      price,
      maxBaseSize,
      maxQuoteSize,
      minBaseSize,
      minQuoteSize,
      limit,
      programId,
      feeDiscountPubkey: useFeeDiscountPubkey,
    });
    transaction.add(sendTakeInstruction);

    return { transaction, signers, payer: owner };
  }

  makeSendTakeInstruction<T extends PublicKey | Account>(
    params: SendTakeParams<T>,
  ): TransactionInstruction {
    const {
      owner,
      baseWallet,
      quoteWallet,
      vaultSigner,
      side,
      price,
      maxBaseSize,
      maxQuoteSize,
      minBaseSize,
      minQuoteSize,
      limit = 65535,
      programId,
      feeDiscountPubkey = null,
    } = params;
    // @ts-ignore
    const ownerAddress: PublicKey = owner.publicKey ?? owner;

    if (this.baseSizeNumberToLots(maxBaseSize).lte(new BN(0))) {
      throw new Error('size too small');
    }
    if (this.quoteSizeNumberToSplSize(maxQuoteSize).lte(new BN(0))) {
      throw new Error('size too small');
    }
    if (this.priceNumberToLots(price).lte(new BN(0))) {
      throw new Error('invalid price');
    }
    return DexInstructions.sendTake({
      market: this.address,
      requestQueue: this._decoded.requestQueue,
      eventQueue: this._decoded.eventQueue,
      bids: this._decoded.bids,
      asks: this._decoded.asks,
      baseWallet,
      quoteWallet,
      owner: ownerAddress,
      baseVault: this._decoded.baseVault,
      quoteVault: this._decoded.quoteVault,
      vaultSigner,
      side,
      limitPrice: this.priceNumberToLots(price),
      maxBaseQuantity: this.baseSizeNumberToLots(maxBaseSize),
      maxQuoteQuantity: this.quoteSizeNumberToSplSize(maxQuoteSize),
      minBaseQuantity: this.baseSizeNumberToLots(minBaseSize),
      minQuoteQuantity: this.quoteSizeNumberToSplSize(minQuoteSize),
      limit,
      programId: programId ? programId : this._programId,
      // @ts-ignore
      feeDiscountPubkey: this.supportsSrmFeeDiscounts
        ? feeDiscountPubkey
        : null,
    });
  }

  makeReplaceOrdersByClientIdsInstruction<T extends PublicKey | Account>(
    accounts: OrderParamsAccounts<T>,
    orders: OrderParamsBase<T>[],
  ): TransactionInstruction {
    // @ts-ignore
    const ownerAddress: PublicKey = accounts.owner.publicKey ?? accounts.owner;
    return DexInstructions.replaceOrdersByClientIds({
      market: this.address,
      bids: this._decoded.bids,
      asks: this._decoded.asks,
      requestQueue: this._decoded.requestQueue,
      eventQueue: this._decoded.eventQueue,
      baseVault: this._decoded.baseVault,
      quoteVault: this._decoded.quoteVault,
      openOrders: accounts.openOrdersAccount
        ? accounts.openOrdersAccount.publicKey
        : accounts.openOrdersAddressKey,
      owner: ownerAddress,
      payer: accounts.payer,
      programId: accounts.programId ?? this._programId,
      // @ts-ignore
      feeDiscountPubkey: this.supportsSrmFeeDiscounts
        ? accounts.feeDiscountPubkey
        : null,
      orders: orders.map((order) => ({
        side: order.side,
        limitPrice: this.priceNumberToLots(order.price),
        maxBaseQuantity: this.baseSizeNumberToLots(order.size),
        maxQuoteQuantity: new BN(this._decoded.quoteLotSize.toNumber()).mul(
          this.baseSizeNumberToLots(order.size).mul(
            this.priceNumberToLots(order.price),
          ),
        ),
        orderType: order.orderType,
        clientId: order.clientId,
        programId: accounts.programId ?? this._programId,
        selfTradeBehavior: order.selfTradeBehavior,
        // @ts-ignore
        maxTs: order.maxTs,
      })),
    });
  }

  private async _sendTransaction(
    connection: Connection,
    transaction: Transaction,
    signers: Array<Account>,
  ): Promise<TransactionSignature> {
    const signature = await connection.sendTransaction(transaction, signers, {
      skipPreflight: this._skipPreflight,
    });
    const { value } = await connection.confirmTransaction(
      signature,
      this._commitment,
    );
    if (value?.err) {
      throw new Error(JSON.stringify(value.err));
    }
    return signature;
  }

  async cancelOrderByClientId(
    connection: Connection,
    owner: Account,
    openOrders: PublicKey,
    clientId: BN,
  ) {
    const transaction = await this.makeCancelOrderByClientIdTransaction(
      connection,
      owner.publicKey,
      openOrders,
      clientId,
    );
    return await this._sendTransaction(connection, transaction, [owner]);
  }

  async cancelOrdersByClientIds(
    connection: Connection,
    owner: Account,
    openOrders: PublicKey,
    clientIds: BN[],
  ) {
    const transaction = await this.makeCancelOrdersByClientIdsTransaction(
      connection,
      owner.publicKey,
      openOrders,
      clientIds,
    );
    return await this._sendTransaction(connection, transaction, [owner]);
  }

  async makeCancelOrderByClientIdTransaction(
    connection: Connection,
    owner: PublicKey,
    openOrders: PublicKey,
    clientId: BN,
  ) {
    const transaction = new Transaction();
    if (this.usesRequestQueue) {
      transaction.add(
        DexInstructions.cancelOrderByClientId({
          market: this.address,
          owner,
          openOrders,
          requestQueue: this._decoded.requestQueue,
          clientId,
          programId: this._programId,
        }),
      );
    } else {
      transaction.add(
        DexInstructions.cancelOrderByClientIdV2({
          market: this.address,
          openOrders,
          owner,
          bids: this._decoded.bids,
          asks: this._decoded.asks,
          eventQueue: this._decoded.eventQueue,
          clientId,
          programId: this._programId,
        }),
      );
    }
    return transaction;
  }

  async makeCancelOrdersByClientIdsTransaction(
    connection: Connection,
    owner: PublicKey,
    openOrders: PublicKey,
    clientIds: BN[],
  ) {
    const transaction = new Transaction();
    transaction.add(
      DexInstructions.cancelOrdersByClientIds({
        market: this.address,
        openOrders,
        owner,
        bids: this._decoded.bids,
        asks: this._decoded.asks,
        eventQueue: this._decoded.eventQueue,
        clientIds,
        programId: this._programId,
      }),
    );
    return transaction;
  }

  async cancelOrder(connection: Connection, owner: Account, order: Order) {
    const transaction = await this.makeCancelOrderTransaction(
      connection,
      owner.publicKey,
      order,
    );
    return await this._sendTransaction(connection, transaction, [owner]);
  }

  async makeCancelOrderTransaction(
    connection: Connection,
    owner: PublicKey,
    order: Order,
  ) {
    const transaction = new Transaction();
    transaction.add(this.makeCancelOrderInstruction(connection, owner, order));
    return transaction;
  }

  makeCancelOrderInstruction(
    connection: Connection,
    owner: PublicKey,
    order: Order,
  ) {
    if (this.usesRequestQueue) {
      return DexInstructions.cancelOrder({
        market: this.address,
        owner,
        openOrders: order.openOrdersAddress,
        requestQueue: this._decoded.requestQueue,
        side: order.side,
        orderId: order.orderId,
        openOrdersSlot: order.openOrdersSlot,
        programId: this._programId,
      });
    } else {
      return DexInstructions.cancelOrderV2({
        market: this.address,
        owner,
        openOrders: order.openOrdersAddress,
        bids: this._decoded.bids,
        asks: this._decoded.asks,
        eventQueue: this._decoded.eventQueue,
        side: order.side,
        orderId: order.orderId,
        openOrdersSlot: order.openOrdersSlot,
        programId: this._programId,
      });
    }
  }

  public makeConsumeEventsInstruction(
    openOrdersAccounts: Array<PublicKey>,
    limit: number,
  ): TransactionInstruction {
    return DexInstructions.consumeEvents({
      market: this.address,
      eventQueue: this._decoded.eventQueue,
      coinFee: this._decoded.eventQueue,
      pcFee: this._decoded.eventQueue,
      openOrdersAccounts,
      limit,
      programId: this._programId,
    });
  }

  public makeConsumeEventsPermissionedInstruction(
    openOrdersAccounts: Array<PublicKey>,
    limit: number,
  ): TransactionInstruction {
    return DexInstructions.consumeEventsPermissioned({
      market: this.address,
      eventQueue: this._decoded.eventQueue,
      crankAuthority: this._decoded.consumeEventsAuthority,
      openOrdersAccounts,
      limit,
      programId: this._programId,
    });
  }

  async settleFunds(
    connection: Connection,
    owner: Account,
    openOrders: OpenOrders,
    baseWallet: PublicKey,
    quoteWallet: PublicKey,
    referrerQuoteWallet: PublicKey | null = null,
  ) {
    if (!openOrders.owner.equals(owner.publicKey)) {
      throw new Error('Invalid open orders account');
    }
    if (referrerQuoteWallet && !this.supportsReferralFees) {
      throw new Error('This program ID does not support referrerQuoteWallet');
    }
    const { transaction, signers } = await this.makeSettleFundsTransaction(
      connection,
      openOrders,
      baseWallet,
      quoteWallet,
      referrerQuoteWallet,
    );
    return await this._sendTransaction(connection, transaction, [
      owner,
      ...signers,
    ]);
  }

  async makeSettleFundsTransaction(
    connection: Connection,
    openOrders: OpenOrders,
    baseWallet: PublicKey,
    quoteWallet: PublicKey,
    referrerQuoteWallet: PublicKey | null = null,
  ) {
    // @ts-ignore
    const vaultSigner = await PublicKey.createProgramAddress(
      [
        this.address.toBuffer(),
        this._decoded.vaultSignerNonce.toArrayLike(Buffer, 'le', 8),
      ],
      this._programId,
    );

    const transaction = new Transaction();
    const signers: Account[] = [];

    let wrappedSolAccount: Account | null = null;
    if (
      (this.baseMintAddress.equals(WRAPPED_SOL_MINT) &&
        baseWallet.equals(openOrders.owner)) ||
      (this.quoteMintAddress.equals(WRAPPED_SOL_MINT) &&
        quoteWallet.equals(openOrders.owner))
    ) {
      wrappedSolAccount = new Account();
      transaction.add(
        SystemProgram.createAccount({
          fromPubkey: openOrders.owner,
          newAccountPubkey: wrappedSolAccount.publicKey,
          lamports: await connection.getMinimumBalanceForRentExemption(165),
          space: 165,
          programId: TOKEN_PROGRAM_ID,
        }),
      );
      transaction.add(
        initializeAccount({
          account: wrappedSolAccount.publicKey,
          mint: WRAPPED_SOL_MINT,
          owner: openOrders.owner,
        }),
      );
      signers.push(wrappedSolAccount);
    }

    transaction.add(
      DexInstructions.settleFunds({
        market: this.address,
        openOrders: openOrders.address,
        owner: openOrders.owner,
        baseVault: this._decoded.baseVault,
        quoteVault: this._decoded.quoteVault,
        baseWallet:
          baseWallet.equals(openOrders.owner) && wrappedSolAccount
            ? wrappedSolAccount.publicKey
            : baseWallet,
        quoteWallet:
          quoteWallet.equals(openOrders.owner) && wrappedSolAccount
            ? wrappedSolAccount.publicKey
            : quoteWallet,
        vaultSigner,
        programId: this._programId,
        // @ts-ignore
        referrerQuoteWallet,
      }),
    );

    if (wrappedSolAccount) {
      transaction.add(
        closeAccount({
          source: wrappedSolAccount.publicKey,
          destination: openOrders.owner,
          owner: openOrders.owner,
        }),
      );
    }

    return { transaction, signers, payer: openOrders.owner };
  }

  async matchOrders(connection: Connection, feePayer: Account, limit: number) {
    const tx = this.makeMatchOrdersTransaction(limit);
    return await this._sendTransaction(connection, tx, [feePayer]);
  }

  makeMatchOrdersTransaction(limit: number): Transaction {
    const tx = new Transaction();
    tx.add(
      DexInstructions.matchOrders({
        market: this.address,
        requestQueue: this._decoded.requestQueue,
        eventQueue: this._decoded.eventQueue,
        bids: this._decoded.bids,
        asks: this._decoded.asks,
        baseVault: this._decoded.baseVault,
        quoteVault: this._decoded.quoteVault,
        limit,
        programId: this._programId,
      }),
    );
    return tx;
  }

  async loadRequestQueue(connection: Connection) {
    const { data } = throwIfNull(
      await connection.getAccountInfo(this._decoded.requestQueue),
    );
    return decodeRequestQueue(data);
  }

  async loadEventQueue(connection: Connection) {
    const { data } = throwIfNull(
      await connection.getAccountInfo(this._decoded.eventQueue),
    );
    return decodeEventQueue(data);
  }

  async loadFills(connection: Connection, limit = 100) {
    // TODO: once there's a separate source of fills use that instead
    const { data } = throwIfNull(
      await connection.getAccountInfo(this._decoded.eventQueue),
    );
    const events = decodeEventQueue(data, limit);
    return events
      .filter(
        (event) => event.eventFlags.fill && event.nativeQuantityPaid.gtn(0),
      )
      .map(this.parseFillEvent.bind(this));
  }

  parseFillEvent(event) {
    let size, price, side, priceBeforeFees;
    if (event.eventFlags.bid) {
      side = 'buy';
      priceBeforeFees = event.eventFlags.maker
        ? event.nativeQuantityPaid.add(event.nativeFeeOrRebate)
        : event.nativeQuantityPaid.sub(event.nativeFeeOrRebate);
      price = divideBnToNumber(
        priceBeforeFees.mul(this._baseSplTokenMultiplier),
        this._quoteSplTokenMultiplier.mul(event.nativeQuantityReleased),
      );
      size = divideBnToNumber(
        event.nativeQuantityReleased,
        this._baseSplTokenMultiplier,
      );
    } else {
      side = 'sell';
      priceBeforeFees = event.eventFlags.maker
        ? event.nativeQuantityReleased.sub(event.nativeFeeOrRebate)
        : event.nativeQuantityReleased.add(event.nativeFeeOrRebate);
      price = divideBnToNumber(
        priceBeforeFees.mul(this._baseSplTokenMultiplier),
        this._quoteSplTokenMultiplier.mul(event.nativeQuantityPaid),
      );
      size = divideBnToNumber(
        event.nativeQuantityPaid,
        this._baseSplTokenMultiplier,
      );
    }
    return {
      ...event,
      side,
      price,
      feeCost:
        this.quoteSplSizeToNumber(event.nativeFeeOrRebate) *
        (event.eventFlags.maker ? -1 : 1),
      size,
    };
  }

  private get _baseSplTokenMultiplier() {
    return new BN(10).pow(new BN(this._baseSplTokenDecimals));
  }

  private get _quoteSplTokenMultiplier() {
    return new BN(10).pow(new BN(this._quoteSplTokenDecimals));
  }

  priceLotsToNumber(price: BN) {
    return divideBnToNumber(
      price.mul(this._decoded.quoteLotSize).mul(this._baseSplTokenMultiplier),
      this._decoded.baseLotSize.mul(this._quoteSplTokenMultiplier),
    );
  }

  priceNumberToLots(price: number): BN {
    return new BN(
      Math.round(
        (price *
          Math.pow(10, this._quoteSplTokenDecimals) *
          this._decoded.baseLotSize.toNumber()) /
          (Math.pow(10, this._baseSplTokenDecimals) *
            this._decoded.quoteLotSize.toNumber()),
      ),
    );
  }

  baseSplSizeToNumber(size: BN) {
    return divideBnToNumber(size, this._baseSplTokenMultiplier);
  }

  quoteSplSizeToNumber(size: BN) {
    return divideBnToNumber(size, this._quoteSplTokenMultiplier);
  }

  baseSizeNumberToSplSize(size: number) {
    return new BN(Math.round(size * Math.pow(10, this._baseSplTokenDecimals)));
  }

  quoteSizeNumberToSplSize(size: number) {
    return new BN(Math.round(size * Math.pow(10, this._quoteSplTokenDecimals)));
  }

  baseSizeLotsToNumber(size: BN) {
    return divideBnToNumber(
      size.mul(this._decoded.baseLotSize),
      this._baseSplTokenMultiplier,
    );
  }

  baseSizeNumberToLots(size: number): BN {
    const native = new BN(
      Math.round(size * Math.pow(10, this._baseSplTokenDecimals)),
    );
    // rounds down to the nearest lot size
    return native.div(this._decoded.baseLotSize);
  }

  quoteSizeLotsToNumber(size: BN) {
    return divideBnToNumber(
      size.mul(this._decoded.quoteLotSize),
      this._quoteSplTokenMultiplier,
    );
  }

  quoteSizeNumberToLots(size: number): BN {
    const native = new BN(
      Math.round(size * Math.pow(10, this._quoteSplTokenDecimals)),
    );
    // roudns down to the nearest lot size
    return native.div(this._decoded.quoteLotSize);
  }

  get minOrderSize() {
    return this.baseSizeLotsToNumber(new BN(1));
  }

  get tickSize() {
    return this.priceLotsToNumber(new BN(1));
  }
}

export interface MarketOptions {
  skipPreflight?: boolean;
  commitment?: Commitment;
}

export interface OrderParamsBase<T = Account> {
  side: 'buy' | 'sell';
  price: number;
  size: number;
  orderType?: 'limit' | 'ioc' | 'postOnly';
  clientId?: BN;
  selfTradeBehavior?:
    | 'decrementTake'
    | 'cancelProvide'
    | 'abortTransaction'
    | undefined;
  maxTs?: number | null;
}

export interface OrderParamsAccounts<T = Account> {
  owner: T;
  payer: PublicKey;
  openOrdersAddressKey?: PublicKey;
  openOrdersAccount?: Account;
  feeDiscountPubkey?: PublicKey | null;
  programId?: PublicKey;
}

export interface OrderParams<T = Account>
  extends OrderParamsBase<T>,
    OrderParamsAccounts<T> {
  replaceIfExists?: boolean;
}

export interface SendTakeParamsBase<T = Account> {
  side: 'buy' | 'sell';
  price: number;
  maxBaseSize: number;
  maxQuoteSize: number;
  minBaseSize: number;
  minQuoteSize: number;
  limit?: number;
}

export interface SendTakeParamsAccounts<T = Account> {
  owner: T;
  baseWallet: PublicKey;
  quoteWallet: PublicKey;
  vaultSigner?: PublicKey;
  feeDiscountPubkey?: PublicKey | null;
  programId?: PublicKey;
}

export interface SendTakeParams<T = Account>
  extends SendTakeParamsBase<T>,
    SendTakeParamsAccounts<T> {}

export const _OPEN_ORDERS_LAYOUT_V1 = struct([
  blob(5),

  accountFlagsLayout('accountFlags'),

  publicKeyLayout('market'),
  publicKeyLayout('owner'),

  // These are in spl-token (i.e. not lot) units
  u64('baseTokenFree'),
  u64('baseTokenTotal'),
  u64('quoteTokenFree'),
  u64('quoteTokenTotal'),

  u128('freeSlotBits'),
  u128('isBidBits'),

  seq(u128(), 128, 'orders'),
  seq(u64(), 128, 'clientIds'),

  blob(7),
]);

export const _OPEN_ORDERS_LAYOUT_V2 = struct([
  blob(5),

  accountFlagsLayout('accountFlags'),

  publicKeyLayout('market'),
  publicKeyLayout('owner'),

  // These are in spl-token (i.e. not lot) units
  u64('baseTokenFree'),
  u64('baseTokenTotal'),
  u64('quoteTokenFree'),
  u64('quoteTokenTotal'),

  u128('freeSlotBits'),
  u128('isBidBits'),

  seq(u128(), 128, 'orders'),
  seq(u64(), 128, 'clientIds'),

  u64('referrerRebatesAccrued'),

  blob(7),
]);

export class OpenOrders {
  private _programId: PublicKey;

  address: PublicKey;
  market!: PublicKey;
  owner!: PublicKey;

  baseTokenFree!: BN;
  baseTokenTotal!: BN;
  quoteTokenFree!: BN;
  quoteTokenTotal!: BN;

  freeSlotBits!: BN;
  isBidBits!: BN;

  orders!: BN[];
  clientIds!: BN[];

  constructor(address: PublicKey, decoded, programId: PublicKey) {
    this.address = address;
    this._programId = programId;
    Object.assign(this, decoded);
  }

  static getLayout(programId: PublicKey) {
    if (getLayoutVersion(programId) === 1) {
      return _OPEN_ORDERS_LAYOUT_V1;
    }
    return _OPEN_ORDERS_LAYOUT_V2;
  }

  static async getDerivedOOAccountPubkey(
    ownerAddress: PublicKey,
    marketAddress: PublicKey,
    programId: PublicKey,
  ) {
    const seed = marketAddress.toBase58().slice(0, 32);
    const publicKey = await PublicKey.createWithSeed(
      ownerAddress,
      seed,
      programId,
    );
    return { publicKey, seed };
  }

  static async findForOwner(
    connection: Connection,
    ownerAddress: PublicKey,
    programId: PublicKey,
  ) {
    const filters = [
      {
        memcmp: {
          offset: this.getLayout(programId).offsetOf('owner'),
          bytes: ownerAddress.toBase58(),
        },
      },
      {
        dataSize: this.getLayout(programId).span,
      },
    ];
    const accounts = await getFilteredProgramAccounts(
      connection,
      programId,
      filters,
    );
    return accounts.map(({ publicKey, accountInfo }) =>
      OpenOrders.fromAccountInfo(publicKey, accountInfo, programId),
    );
  }

  static async findForMarketAndOwner(
    connection: Connection,
    marketAddress: PublicKey,
    ownerAddress: PublicKey,
    programId: PublicKey,
    forceSeedAccount: boolean = false,
  ): Promise<OpenOrders[]> {
    // Try loading seed based accounts
    const account = await this.getDerivedOOAccountPubkey(
      ownerAddress,
      marketAddress,
      programId,
    );
    const ooAccountInfo = await connection.getAccountInfo(account.publicKey);
    if (ooAccountInfo) {
      return [
        OpenOrders.fromAccountInfo(account.publicKey, ooAccountInfo, programId),
      ];
    }

    if (forceSeedAccount) {
      return [];
    }

    // Fallback to legacy gPA loading
    const filters = [
      {
        memcmp: {
          offset: this.getLayout(programId).offsetOf('market'),
          bytes: marketAddress.toBase58(),
        },
      },
      {
        memcmp: {
          offset: this.getLayout(programId).offsetOf('owner'),
          bytes: ownerAddress.toBase58(),
        },
      },
      {
        dataSize: this.getLayout(programId).span,
      },
    ];
    const accounts = await getFilteredProgramAccounts(
      connection,
      programId,
      filters,
    );
    return accounts.map(({ publicKey, accountInfo }) =>
      OpenOrders.fromAccountInfo(publicKey, accountInfo, programId),
    );
  }

  static async load(
    connection: Connection,
    address: PublicKey,
    programId: PublicKey,
  ) {
    const accountInfo = await connection.getAccountInfo(address);
    if (accountInfo === null) {
      throw new Error('Open orders account not found');
    }
    return OpenOrders.fromAccountInfo(address, accountInfo, programId);
  }

  static fromAccountInfo(
    address: PublicKey,
    accountInfo: AccountInfo<Buffer>,
    programId: PublicKey,
  ) {
    const { owner, data } = accountInfo;
    if (!owner.equals(programId)) {
      throw new Error('Address not owned by program');
    }
    const decoded = this.getLayout(programId).decode(data);
    if (!decoded.accountFlags.initialized || !decoded.accountFlags.openOrders) {
      throw new Error('Invalid open orders account');
    }
    return new OpenOrders(address, decoded, programId);
  }

  static async makeCreateAccountTransaction(
    connection: Connection,
    marketAddress: PublicKey,
    ownerAddress: PublicKey,
    newAccountAddress: PublicKey,
    programId: PublicKey,
    seed: string,
  ) {
    return SystemProgram.createAccountWithSeed({
      fromPubkey: ownerAddress,
      basePubkey: ownerAddress,
      newAccountPubkey: newAccountAddress,
      seed: seed,
      lamports: await connection.getMinimumBalanceForRentExemption(
        this.getLayout(programId).span,
      ),
      space: this.getLayout(programId).span,
      programId,
    });
  }

  get publicKey() {
    return this.address;
  }
}

export const ORDERBOOK_LAYOUT = struct([
  blob(5),
  accountFlagsLayout('accountFlags'),
  SLAB_LAYOUT.replicate('slab'),
  blob(7),
]);

export class Orderbook {
  market: Market;
  isBids: boolean;
  slab: Slab;

  constructor(market: Market, accountFlags, slab: Slab) {
    if (!accountFlags.initialized || !(accountFlags.bids ^ accountFlags.asks)) {
      throw new Error('Invalid orderbook');
    }
    this.market = market;
    this.isBids = accountFlags.bids;
    this.slab = slab;
  }

  static get LAYOUT() {
    return ORDERBOOK_LAYOUT;
  }

  static decode(market: Market, buffer: Buffer) {
    const { accountFlags, slab } = ORDERBOOK_LAYOUT.decode(buffer);
    return new Orderbook(market, accountFlags, slab);
  }

  getL2(depth: number): [number, number, BN, BN][] {
    const descending = this.isBids;
    const levels: [BN, BN][] = []; // (price, size)
    for (const { key, quantity } of this.slab.items(descending)) {
      const price = getPriceFromKey(key);
      if (levels.length > 0 && levels[levels.length - 1][0].eq(price)) {
        levels[levels.length - 1][1] =
          levels[levels.length - 1][1].add(quantity);
      } else if (levels.length === depth) {
        break;
      } else {
        levels.push([price, quantity]);
      }
    }
    return levels.map(([priceLots, sizeLots]) => [
      this.market.priceLotsToNumber(priceLots),
      this.market.baseSizeLotsToNumber(sizeLots),
      priceLots,
      sizeLots,
    ]);
  }

  [Symbol.iterator]() {
    return this.items(false);
  }

  *items(descending = false): Generator<Order> {
    for (const {
      key,
      ownerSlot,
      owner,
      quantity,
      feeTier,
      clientOrderId,
    } of this.slab.items(descending)) {
      const price = getPriceFromKey(key);
      yield {
        orderId: key,
        clientId: clientOrderId,
        openOrdersAddress: owner,
        openOrdersSlot: ownerSlot,
        feeTier,
        price: this.market.priceLotsToNumber(price),
        priceLots: price,
        size: this.market.baseSizeLotsToNumber(quantity),
        sizeLots: quantity,
        side: (this.isBids ? 'buy' : 'sell') as 'buy' | 'sell',
      };
    }
  }
}

export interface Order {
  orderId: BN;
  openOrdersAddress: PublicKey;
  openOrdersSlot: number;
  price: number;
  priceLots: BN;
  size: number;
  feeTier: number;
  sizeLots: BN;
  side: 'buy' | 'sell';
  clientId?: BN;
}

function getPriceFromKey(key) {
  return key.ushrn(64);
}


function divideBnToNumber(numerator: BN, denominator: BN): number {
  if (numerator.bitLength() <= 53 && denominator.bitLength() <= 53)
    return numerator.toNumber() / denominator.toNumber();

  // we can try to shorten this fraction with the gcd, most likely
  // these have a large power of 10 as common factor
  const gcd_nd = numerator.gcd(denominator);

  // don't update these two yet inplace as they are passed by ref
  numerator = numerator.div(gcd_nd);
  denominator = denominator.div(gcd_nd);

  if (numerator.bitLength() <= 53 && denominator.bitLength() <= 53)
    return numerator.toNumber() / denominator.toNumber();

  // only one of them can be still even at this point as we did already eliminate gcds
  // but if we are lucky there's still room left to pull out a power of 2 factor on
  // either side which we can multiply back in possibly saving some precision bc.
  // we only need to modify the exponent
  const numerator_shift = numerator.zeroBits();
  if (numerator_shift > 0) {
    numerator.ishrn(numerator_shift);
  }
  const denominator_shift = denominator.zeroBits();
  if (denominator_shift > 0) {
    denominator.ishrn(denominator_shift);
  }
  const exponent_bias = Math.pow(2, numerator_shift - denominator_shift);

  if (numerator.bitLength() <= 53 && denominator.bitLength() <= 53)
    // brackets are important to retain precision
    return exponent_bias * (numerator.toNumber() / denominator.toNumber());

  // now we are looking add at least one giant odd number, can't do a lot
  // but convert to strings and let JS figure out a solution
  const string_math =
    (numerator.toString() as any) / (denominator.toString() as any);
  return exponent_bias * string_math;
}

const MINT_LAYOUT = struct([blob(44), u8('decimals'), blob(37)]);

export async function getMintDecimals(
  connection: Connection,
  mint: PublicKey,
): Promise<number> {
  if (mint.equals(WRAPPED_SOL_MINT)) {
    return 9;
  }
  const { data } = throwIfNull(
    await connection.getAccountInfo(mint),
    'mint not found',
  );
  const { decimals } = MINT_LAYOUT.decode(data);
  return decimals;
}

async function getFilteredProgramAccounts(
  connection: Connection,
  programId: PublicKey,
  filters,
): Promise<{ publicKey: PublicKey; accountInfo: AccountInfo<Buffer> }[]> {
  // @ts-ignore
  const resp = await connection._rpcRequest('getProgramAccounts', [
    programId.toBase58(),
    {
      commitment: connection.commitment,
      filters,
      encoding: 'base64',
    },
  ]);
  if (resp.error) {
    throw new Error(resp.error.message);
  }
  return resp.result.map(
    ({ pubkey, account: { data, executable, owner, lamports } }) => ({
      publicKey: new PublicKey(pubkey),
      accountInfo: {
        data: Buffer.from(data[0], 'base64'),
        executable,
        owner: new PublicKey(owner),
        lamports,
      },
    }),
  );
}

function throwIfNull<T>(value: T | null, message = 'account not found'): T {
  if (value === null) {
    throw new Error(message);
  }
  return value;
}

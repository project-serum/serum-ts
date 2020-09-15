import { blob, seq, struct, u8 } from 'buffer-layout';
import { accountFlagsLayout, publicKeyLayout, u128, u64 } from './layout';
import { Slab, SLAB_LAYOUT } from './slab';
import { DexInstructions } from './instructions';
import BN from 'bn.js';
import {
  Account,
  AccountInfo,
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  TransactionSignature,
} from '@solana/web3.js';
import { decodeEventQueue, decodeRequestQueue } from './queue';
import { Buffer } from 'buffer';
import {
  closeAccount,
  initializeAccount,
  TOKEN_PROGRAM_ID,
  WRAPPED_SOL_MINT,
} from './token-instructions';

export const MARKET_STATE_LAYOUT = struct([
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

export class Market {
  private _decoded: any;
  private _baseSplTokenDecimals: number;
  private _quoteSplTokenDecimals: number;
  private _skipPreflight: boolean;
  private _confirmations: number;
  private _programId: PublicKey;
  private _openOrdersAccountsCache: {
    [publickKey: string]: { accounts: OpenOrders[]; ts: number };
  };

  constructor(
    decoded,
    baseMintDecimals: number,
    quoteMintDecimals: number,
    options: MarketOptions = {},
    programId: PublicKey,
  ) {
    const { skipPreflight = false, confirmations = 0 } = options;
    if (!decoded.accountFlags.initialized || !decoded.accountFlags.market) {
      throw new Error('Invalid market state');
    }
    this._decoded = decoded;
    this._baseSplTokenDecimals = baseMintDecimals;
    this._quoteSplTokenDecimals = quoteMintDecimals;
    this._skipPreflight = skipPreflight;
    this._confirmations = confirmations;
    this._programId = programId;
    this._openOrdersAccountsCache = {};
  }

  static get LAYOUT() {
    return MARKET_STATE_LAYOUT;
  }

  static async load(
    connection: Connection,
    address: PublicKey,
    options: MarketOptions = {},
    programId: PublicKey,
  ) {
    const { owner, data } = throwIfNull(
      await connection.getAccountInfo(address),
      'Market not found',
    );
    if (!owner.equals(programId)) {
      throw new Error('Address not owned by program: ' + owner.toBase58());
    }
    const decoded = MARKET_STATE_LAYOUT.decode(data);
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
    );
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
    return (
      await connection.getTokenAccountsByOwner(ownerAddress, {
        mint: this.baseMintAddress,
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
    return (
      await connection.getTokenAccountsByOwner(ownerAddress, {
        mint: this.quoteMintAddress,
      })
    ).value;
  }

  async findOpenOrdersAccountsForOwner(
    connection: Connection,
    ownerAddress: PublicKey,
    cacheDurationMs = 0,
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
    );
    this._openOrdersAccountsCache[strOwner] = {
      accounts: openOrdersAccountsForOwner,
      ts: now,
    };
    return openOrdersAccountsForOwner;
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
    }: OrderParams,
  ) {
    const { transaction, signers } = await this.makePlaceOrderTransaction(
      connection,
      {
        owner,
        payer,
        side,
        price,
        size,
        orderType,
        clientId,
        openOrdersAddressKey,
      },
    );
    return await this._sendTransaction(connection, transaction, signers);
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
    }: OrderParams<T>,
    cacheDurationMs = 0,
  ) {
    // @ts-ignore
    const ownerAddress: PublicKey = owner.publicKey ?? owner;
    const openOrdersAccounts = await this.findOpenOrdersAccountsForOwner(
      connection,
      ownerAddress,
      cacheDurationMs,
    ); // TODO: cache this
    const transaction = new Transaction();
    const signers: (T | Account)[] = [owner];

    let openOrdersAddress;
    if (openOrdersAccounts.length === 0) {
      const newOpenOrdersAccount = new Account();
      transaction.add(
        await OpenOrders.makeCreateAccountTransaction(
          connection,
          this.address,
          ownerAddress,
          newOpenOrdersAccount.publicKey,
          this._programId,
        ),
      );
      openOrdersAddress = newOpenOrdersAccount.publicKey;
      signers.push(newOpenOrdersAccount);
      // refresh the cache of open order accounts on next fetch
      this._openOrdersAccountsCache[ownerAddress.toBase58()].ts = 0;
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
      } else {
        throw new Error('Invalid payer account');
      }
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

    return { transaction, signers };
  }

  makePlaceOrderInstruction<T extends PublicKey | Account>(
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
    }: OrderParams<T>,
  ): TransactionInstruction {
    // @ts-ignore
    const ownerAddress: PublicKey = owner.publicKey ?? owner;
    if (this.baseSizeNumberToLots(size).lte(new BN(0))) {
      throw new Error('size too small');
    }
    if (this.priceNumberToLots(price).lte(new BN(0))) {
      throw new Error('invalid price');
    }
    return DexInstructions.newOrder({
      market: this.address,
      requestQueue: this._decoded.requestQueue,
      baseVault: this._decoded.baseVault,
      quoteVault: this._decoded.quoteVault,
      openOrders: openOrdersAddressKey,
      owner: ownerAddress,
      payer,
      side,
      limitPrice: this.priceNumberToLots(price),
      maxQuantity: this.baseSizeNumberToLots(size),
      orderType,
      clientId,
      programId: this._programId,
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
    if (this._confirmations > 0) {
      const { value } = await connection.confirmTransaction(
        signature,
        this._confirmations,
      );
      if (value?.err) {
        throw new Error(JSON.stringify(value.err));
      }
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

  async makeCancelOrderByClientIdTransaction(
    connection: Connection,
    owner: PublicKey,
    openOrders: PublicKey,
    clientId: BN,
  ) {
    const transaction = new Transaction();
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
  }

  async settleFunds(
    connection: Connection,
    owner: Account,
    openOrders: OpenOrders,
    baseWallet: PublicKey,
    quoteWallet: PublicKey,
  ) {
    if (!openOrders.owner.equals(owner.publicKey)) {
      throw new Error('Invalid open orders account');
    }
    const { transaction, signers } = await this.makeSettleFundsTransaction(
      connection,
      openOrders,
      baseWallet,
      quoteWallet,
    );
    signers[0] = owner;
    // @ts-ignore
    return await this._sendTransaction(connection, transaction, signers);
  }

  async makeSettleFundsTransaction(
    connection: Connection,
    openOrders: OpenOrders,
    baseWallet: PublicKey,
    quoteWallet: PublicKey,
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
    const signers: [Account | PublicKey] = [openOrders.owner];

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

    return { transaction, signers };
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
    // rounds down to the nearest lot size
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
  confirmations?: number;
}

export interface OrderParams<T = Account> {
  owner: T;
  payer: PublicKey;
  side: 'buy' | 'sell';
  price: number;
  size: number;
  orderType?: 'limit' | 'ioc' | 'postOnly';
  clientId?: BN;
  openOrdersAddressKey?: PublicKey;
}

export const OPEN_ORDERS_LAYOUT = struct([
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

export class OpenOrders {
  private _programId: PublicKey;

  address: PublicKey;
  market!: PublicKey;
  owner!: PublicKey;

  baseTokenFree!: BN;
  baseTokenTotal!: BN;
  quoteTokenFree!: BN;
  quoteTokenTotal!: BN;

  orders!: BN[];
  clientIds!: BN[];

  constructor(address: PublicKey, decoded, programId: PublicKey) {
    this.address = address;
    this._programId = programId;
    Object.assign(this, decoded);
  }

  static get LAYOUT() {
    return OPEN_ORDERS_LAYOUT;
  }

  static async findForOwner(
    connection: Connection,
    ownerAddress: PublicKey,
    programId: PublicKey,
  ) {
    const filters = [
      {
        memcmp: {
          offset: OPEN_ORDERS_LAYOUT.offsetOf('owner'),
          bytes: ownerAddress.toBase58(),
        },
      },
      {
        dataSize: OPEN_ORDERS_LAYOUT.span,
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
  ) {
    const filters = [
      {
        memcmp: {
          offset: OPEN_ORDERS_LAYOUT.offsetOf('market'),
          bytes: marketAddress.toBase58(),
        },
      },
      {
        memcmp: {
          offset: OPEN_ORDERS_LAYOUT.offsetOf('owner'),
          bytes: ownerAddress.toBase58(),
        },
      },
      {
        dataSize: OPEN_ORDERS_LAYOUT.span,
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
    const decoded = OPEN_ORDERS_LAYOUT.decode(data);
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
  ) {
    return SystemProgram.createAccount({
      fromPubkey: ownerAddress,
      newAccountPubkey: newAccountAddress,
      lamports: await connection.getMinimumBalanceForRentExemption(
        OPEN_ORDERS_LAYOUT.span,
      ),
      space: OPEN_ORDERS_LAYOUT.span,
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
        levels[levels.length - 1][1].iadd(quantity);
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

  *[Symbol.iterator](): Generator<Order> {
    for (const {
      key,
      ownerSlot,
      owner,
      quantity,
      feeTier,
      clientOrderId,
    } of this.slab) {
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
  const quotient = numerator.div(denominator).toNumber();
  const rem = numerator.umod(denominator);
  const gcd = rem.gcd(denominator);
  return quotient + rem.div(gcd).toNumber() / denominator.div(gcd).toNumber();
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

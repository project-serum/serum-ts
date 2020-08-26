import { blob, seq, struct, u8 } from 'buffer-layout';
import { accountFlagsLayout, publicKeyLayout, u128, u64 } from './layout';
import { Slab, SLAB_LAYOUT } from './slab';
import { DEX_PROGRAM_ID, DexInstructions } from './instructions';
import BN from 'bn.js';
import {
  Account,
  AccountInfo,
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  TransactionSignature,
} from '@solana/web3.js';
import { decodeEventQueue, decodeRequestQueue } from './queue';
import { Buffer } from 'buffer';

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

  constructor(
    decoded,
    baseMintDecimals: number,
    quoteMintDecimals: number,
    options: MarketOptions = {},
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
  }

  static get LAYOUT() {
    return MARKET_STATE_LAYOUT;
  }

  static async load(
    connection: Connection,
    address: PublicKey,
    options: MarketOptions = {},
  ) {
    const { owner, data } = throwIfNull(
      await connection.getAccountInfo(address),
      'Market not found',
    );
    if (!owner.equals(DEX_PROGRAM_ID)) {
      throw new Error('Address not owned by program');
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
    return new Market(decoded, baseMintDecimals, quoteMintDecimals, options);
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
  ): Promise<Order[]> {
    const [bids, asks, openOrdersAccounts] = await Promise.all([
      this.loadBids(connection),
      this.loadAsks(connection),
      this.findOpenOrdersAccountsForOwner(connection, ownerAddress),
    ]);
    return this.filterForOpenOrders(bids, asks, openOrdersAccounts);
  }

  filterForOpenOrders(
    bids: Orderbook,
    asks: Orderbook,
    openOrdersAccounts: OpenOrders[],
  ): Order[] {
    const orders = [...bids, ...asks].filter((order) =>
      openOrdersAccounts.some((openOrders) =>
        order.openOrdersAddress.equals(openOrders.address),
      ),
    );
    return orders.map((order) => ({
      ...order,
      clientId: openOrdersAccounts.find((openOrders) =>
        order.openOrdersAddress.equals(openOrders.address),
      )?.clientIds[order.openOrdersSlot],
    }));
  }

  async findBaseTokenAccountsForOwner(
    connection: Connection,
    ownerAddress: PublicKey,
  ): Promise<Array<{ pubkey: PublicKey; account: AccountInfo<Buffer> }>> {
    return (
      await connection.getTokenAccountsByOwner(ownerAddress, {
        mint: this.baseMintAddress,
      })
    ).value;
  }

  async findQuoteTokenAccountsForOwner(
    connection: Connection,
    ownerAddress: PublicKey,
  ): Promise<{ pubkey: PublicKey; account: AccountInfo<Buffer> }[]> {
    return (
      await connection.getTokenAccountsByOwner(ownerAddress, {
        mint: this.quoteMintAddress,
      })
    ).value;
  }

  async findOpenOrdersAccountsForOwner(
    connection: Connection,
    ownerAddress: PublicKey,
  ): Promise<OpenOrders[]> {
    return OpenOrders.findForMarketAndOwner(
      connection,
      this.address,
      ownerAddress,
    );
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
    }: OrderParams<T>,
  ) {
    // @ts-ignore
    const ownerAddress: PublicKey = owner.publicKey ?? owner;
    const openOrdersAccounts = await this.findOpenOrdersAccountsForOwner(
      connection,
      ownerAddress,
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
        ),
      );
      openOrdersAddress = newOpenOrdersAccount.publicKey;
      signers.push(newOpenOrdersAccount);
    } else {
      openOrdersAddress = openOrdersAccounts[0].address;
    }
    const placeOrderInstruction = this.makePlaceOrderInstruction(
      connection,
      {
        owner,
        payer,
        side,
        price,
        size,
        orderType,
        clientId,
      },
      openOrdersAddress,
    );
    transaction.add(placeOrderInstruction);
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
    }: OrderParams<T>,
    openOrdersAddress,
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
      openOrders: openOrdersAddress,
      owner: ownerAddress,
      payer,
      side,
      limitPrice: this.priceNumberToLots(price),
      maxQuantity: this.baseSizeNumberToLots(size),
      orderType,
      clientId,
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
    transaction.add(this.makeCanceOrderInstruction(connection, owner, order));
    return transaction;
  }

  makeCanceOrderInstruction(
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
    const transaction = await this.makeSettleFundsTransaction(
      connection,
      openOrders,
      baseWallet,
      quoteWallet,
    );
    return await this._sendTransaction(connection, transaction, [owner]);
  }

  async makeSettleFundsTransaction(
    connection: Connection,
    openOrders: OpenOrders,
    baseWallet: PublicKey,
    quoteWallet: PublicKey,
  ) {
    const tx = new Transaction();
    // @ts-ignore
    const vaultSigner = await PublicKey.createProgramAddress(
      [
        this.address.toBuffer(),
        this._decoded.vaultSignerNonce.toArrayLike(Buffer, 'le', 8),
      ],
      DEX_PROGRAM_ID,
    );
    const settleInstruction = this.makeSettleInstruction(openOrders, baseWallet, quoteWallet, vaultSigner)
    tx.add(settleInstruction);
    return tx;
  }

  makeSettleInstruction(
    openOrders: OpenOrders,
    baseWallet: PublicKey,
    quoteWallet: PublicKey,
    vaultSigner: any,
  ): TransactionInstruction {
    return DexInstructions.settleFunds({
      market: this.address,
      openOrders: openOrders.address,
      owner: openOrders.owner,
      baseVault: this._decoded.baseVault,
      quoteVault: this._decoded.quoteVault,
      baseWallet,
      quoteWallet,
      vaultSigner,
    });
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

  makeMatchOrdersInstruction(limit: number): TransactionInstruction {
    return DexInstructions.matchOrders({
      market: this.address,
      requestQueue: this._decoded.requestQueue,
      eventQueue: this._decoded.eventQueue,
      bids: this._decoded.bids,
      asks: this._decoded.asks,
      baseVault: this._decoded.baseVault,
      quoteVault: this._decoded.quoteVault,
      limit,
    });
  }

  async matchOrders(connection: Connection, feePayer: Account, limit: number) {
    const tx = new Transaction();
    tx.add(this.makeMatchOrdersInstruction(limit));
    return await this._sendTransaction(connection, tx, [feePayer]);
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
  address: PublicKey;
  market!: PublicKey;
  owner!: PublicKey;

  baseTokenFree!: BN;
  baseTokenTotal!: BN;
  quoteTokenFree!: BN;
  quoteTokenTotal!: BN;

  orders!: BN[];
  clientIds!: BN[];

  constructor(address: PublicKey, decoded) {
    this.address = address;
    Object.assign(this, decoded);
  }

  static get LAYOUT() {
    return OPEN_ORDERS_LAYOUT;
  }

  static async findForMarketAndOwner(
    connection: Connection,
    marketAddress: PublicKey,
    ownerAddress: PublicKey,
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
      DEX_PROGRAM_ID,
      filters,
    );
    return accounts.map(({ publicKey, accountInfo }) =>
      OpenOrders.fromAccountInfo(publicKey, accountInfo),
    );
  }

  static async load(connection: Connection, address: PublicKey) {
    const accountInfo = await connection.getAccountInfo(address);
    if (accountInfo === null) {
      throw new Error('Open orders account not found');
    }
    return OpenOrders.fromAccountInfo(address, accountInfo);
  }

  static fromAccountInfo(address: PublicKey, accountInfo: AccountInfo<Buffer>) {
    const { owner, data } = accountInfo;
    if (!owner.equals(DEX_PROGRAM_ID)) {
      throw new Error('Address not owned by program');
    }
    const decoded = OPEN_ORDERS_LAYOUT.decode(data);
    if (!decoded.accountFlags.initialized || !decoded.accountFlags.openOrders) {
      throw new Error('Invalid open orders account');
    }
    return new OpenOrders(address, decoded);
  }

  static async makeCreateAccountTransaction(
    connection: Connection,
    marketAddress: PublicKey,
    ownerAddress: PublicKey,
    newAccountAddress: PublicKey,
  ) {
    return SystemProgram.createAccount({
      fromPubkey: ownerAddress,
      newAccountPubkey: newAccountAddress,
      lamports: await connection.getMinimumBalanceForRentExemption(
        OPEN_ORDERS_LAYOUT.span,
      ),
      space: OPEN_ORDERS_LAYOUT.span,
      programId: DEX_PROGRAM_ID,
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
    for (const { key, ownerSlot, owner, quantity, feeTier } of this.slab) {
      const price = getPriceFromKey(key);
      yield {
        orderId: key,
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

const MINT_LAYOUT = struct([blob(36), u8('decimals'), blob(3)]);

export async function getMintDecimals(
  connection: Connection,
  mint: PublicKey,
): Promise<number> {
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

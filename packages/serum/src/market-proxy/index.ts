import BN from 'bn.js';
import { Connection, PublicKey, TransactionInstruction } from '@solana/web3.js';
import { utils } from '@project-serum/anchor';
import {
  Market,
  MarketOptions,
  OrderParams,
  MARKET_STATE_LAYOUT_V3,
  Order,
} from '../market';
import { DexInstructions } from '../instructions';
import { Middleware } from './middleware';

// MarketProxy provides an API for constructing transactions to an on-chain
// DEX proxy, which relays all instructions to the orderbook. Minimally, this
// requires two modifications for DEX instructions.
//
// 1. Transasctions are sent to the proxy program--not the DEX.
// 2. The DEX program ID must be inserted as the first account in instructions
//    using the proxy relay, so that the proxy can use the account for CPI.
//    The program is responsible for removing this account before relaying to
//    the dex.
//
// Additionally, a middleware abstraction is provided so that one can configure
// both the client and the smart contract with the ability to send and processs
// arbitrary accounts and instruction data *in addition* to what the Serum DEX
// expects.
//
// Similar to the layers of an onion, each middleware wraps a transaction
// request with additional accounts and instruction data before sending it to
// the program. Upon receiving the request, the program--with its own set of
// middleware-- unwraps and processes each layer. The process ends with all
// layers being unwrapped and the proxy relaying the transaction to the DEX.
//
// As a result, the order of the middleware matters and the client should
// process middleware in the *reverse* order of the proxy smart contract.
export class MarketProxy {
  // DEX market being proxied.
  get market(): Market {
    return this._market;
  }
  private _market: Market;

  // Instruction namespace.
  get instruction(): MarketProxyInstruction {
    return this._instruction;
  }
  private _instruction: MarketProxyInstruction;

  // Serum DEX program ID.
  get dexProgramId(): PublicKey {
    return this._market.programId;
  }

  // Proxy program ID.
  get proxyProgramId(): PublicKey {
    return this._instruction.proxyProgramId;
  }

  // Ctor.
  constructor(market: Market, instruction: MarketProxyInstruction) {
    this._market = market;
    this._instruction = instruction;
  }
}

// Instruction builder for the market proxy.
export class MarketProxyInstruction {
  // Program ID of the permissioning proxy program.
  get proxyProgramId(): PublicKey {
    return this._proxyProgramId;
  }
  private _proxyProgramId: PublicKey;

  // Dex program ID.
  private _dexProgramId: PublicKey;

  // Underlying DEX market.
  private _market: Market;

  // Middlewares for processing the creation of transactions.
  private _middlewares: Middleware[];

  constructor(
    proxyProgramId: PublicKey,
    dexProgramId: PublicKey,
    market: Market,
    middlewares: Middleware[],
  ) {
    this._proxyProgramId = proxyProgramId;
    this._dexProgramId = dexProgramId;
    this._market = market;
    this._middlewares = middlewares;
  }

  public newOrderV3(params: OrderParams<PublicKey>): TransactionInstruction {
    const tradeIx = this._market.makeNewOrderV3Instruction({
      ...params,
      programId: this._proxyProgramId,
    });
    this._middlewares.forEach((mw) => mw.newOrderV3(tradeIx));
    return this.proxy(tradeIx);
  }

  public initOpenOrders(
    owner: PublicKey,
    market: PublicKey,
    openOrders: PublicKey,
    marketAuthority: PublicKey,
  ): TransactionInstruction {
    const ix = DexInstructions.initOpenOrders({
      market,
      openOrders,
      owner,
      programId: this._proxyProgramId,
      marketAuthority,
    });
    this._middlewares.forEach((mw) => mw.initOpenOrders(ix));
    return this.proxy(ix);
  }

  public cancelOrder(owner: PublicKey, order: Order): TransactionInstruction {
    const ix = DexInstructions.cancelOrderV2({
      market: this._market.address,
      owner,
      openOrders: order.openOrdersAddress,
      bids: this._market.decoded.bids,
      asks: this._market.decoded.asks,
      eventQueue: this._market.decoded.eventQueue,
      side: order.side,
      orderId: order.orderId,
      openOrdersSlot: order.openOrdersSlot,
      programId: this._proxyProgramId,
    });
    this._middlewares.forEach((mw) => mw.cancelOrderV2(ix));
    return this.proxy(ix);
  }

  public cancelOrderByClientId(
    owner: PublicKey,
    openOrders: PublicKey,
    clientId: BN,
  ): TransactionInstruction {
    const ix = DexInstructions.cancelOrderByClientIdV2({
      market: this._market.address,
      openOrders,
      owner,
      bids: this._market.decoded.bids,
      asks: this._market.decoded.asks,
      eventQueue: this._market.decoded.eventQueue,
      clientId,
      programId: this._proxyProgramId,
    });
    this._middlewares.forEach((mw) => mw.cancelOrderByClientIdV2(ix));
    return this.proxy(ix);
  }

  public settleFunds(
    openOrders: PublicKey,
    owner: PublicKey,
    baseWallet: PublicKey,
    quoteWallet: PublicKey,
    referrerQuoteWallet: PublicKey,
  ): TransactionInstruction {
    const ix = DexInstructions.settleFunds({
      market: this._market.address,
      openOrders,
      owner,
      baseVault: this._market.decoded.baseVault,
      quoteVault: this._market.decoded.quoteVault,
      baseWallet,
      quoteWallet,
      vaultSigner: utils.publicKey.createProgramAddressSync(
        [
          this._market.address.toBuffer(),
          this._market.decoded.vaultSignerNonce.toArrayLike(Buffer, 'le', 8),
        ],
        this._dexProgramId,
      ),
      programId: this._proxyProgramId,
      referrerQuoteWallet,
    });
    this._middlewares.forEach((mw) => mw.settleFunds(ix));
    return this.proxy(ix);
  }

  public closeOpenOrders(
    openOrders: PublicKey,
    owner: PublicKey,
    solWallet: PublicKey,
  ): TransactionInstruction {
    const ix = DexInstructions.closeOpenOrders({
      market: this._market.address,
      openOrders,
      owner,
      solWallet,
      programId: this._proxyProgramId,
    });
    this._middlewares.forEach((mw) => mw.closeOpenOrders(ix));
    return this.proxy(ix);
  }

  public prune(
    openOrders: PublicKey,
    openOrdersOwner: PublicKey,
    limit?: number,
  ): TransactionInstruction {
    if (!limit) {
      limit = 65535;
    }
    const ix = DexInstructions.prune({
      market: this._market.address,
      bids: this._market.decoded.bids,
      asks: this._market.decoded.asks,
      eventQueue: this._market.decoded.eventQueue,
      pruneAuthority: this._market.decoded.pruneAuthority,
      openOrders,
      openOrdersOwner,
      programId: this._proxyProgramId,
      limit,
    });
    this._middlewares.forEach((mw) => mw.prune(ix));
    return this.proxy(ix);
  }

  public consumeEvents(
    openOrdersAccounts: Array<PublicKey>,
    limit: number,
  ): TransactionInstruction {
    const ix = DexInstructions.consumeEvents({
      market: this._market.address,
      eventQueue: this._market.decoded.eventQueue,
      coinFee: this._market.decoded.eventQueue,
      pcFee: this._market.decoded.eventQueue,
      openOrdersAccounts,
      limit,
      programId: this._proxyProgramId,
    });
    this._middlewares.forEach((mw) => mw.consumeEvents(ix));
    return this.proxy(ix);
  }

  public consumeEventsPermissioned(
    openOrdersAccounts: Array<PublicKey>,
    limit: number,
  ): TransactionInstruction {
    const ix = DexInstructions.consumeEventsPermissioned({
      market: this._market.address,
      eventQueue: this._market.decoded.eventQueue,
      crankAuthority: this._market.decoded.consumeEventsAuthority,
      openOrdersAccounts,
      limit,
      programId: this._proxyProgramId,
    });
    this._middlewares.forEach((mw) => mw.consumeEventsPermissioned(ix));
    return this.proxy(ix);
  }

  // Adds the serum dex account to the instruction so that proxies can
  // relay (CPI requires the executable account).
  private proxy(ix: TransactionInstruction) {
    ix.keys = [
      { pubkey: this._dexProgramId, isWritable: false, isSigner: false },
      ...ix.keys,
    ];

    return ix;
  }
}

export class MarketProxyBuilder {
  private _middlewares: Middleware[];

  constructor() {
    this._middlewares = [];
  }

  public middleware(mw: Middleware): MarketProxyBuilder {
    this._middlewares.push(mw);
    return this;
  }

  public async load({
    connection,
    market,
    options = {},
    dexProgramId,
    proxyProgramId,
  }: {
    connection: Connection;
    market: PublicKey;
    options: MarketOptions;
    dexProgramId: PublicKey;
    proxyProgramId: PublicKey;
  }): Promise<MarketProxy> {
    const marketClient = await Market.load(
      connection,
      market,
      options,
      dexProgramId,
      MARKET_STATE_LAYOUT_V3,
    );
    const instruction = new MarketProxyInstruction(
      proxyProgramId,
      dexProgramId,
      marketClient,
      this._middlewares,
    );
    return new MarketProxy(marketClient, instruction);
  }
}

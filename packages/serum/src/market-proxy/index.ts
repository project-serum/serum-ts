import { blob, struct } from 'buffer-layout';
import BN from 'bn.js';
import {
  Connection,
  PublicKey,
  Account,
  TransactionInstruction,
} from '@solana/web3.js';
import { utils } from '@project-serum/anchor';
import { Token, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { accountFlagsLayout, publicKeyLayout, u64 } from '../layout';
import { Market, MarketOptions, OrderParams } from '../market';
import { DexInstructions } from '../instructions';
import { Middleware } from './middleware';

////////////////////////////////////////////////////////////////////////////////
//
// This API is experimental. It may be subject to imminent breaking changes.
//
////////////////////////////////////////////////////////////////////////////////

// MarketProxy overrides Market since it requires a frontend, on-chain
// proxy program, which relays all instructions to the orderbook. This requires
// two modifications for most instructions.
//
// 1. The dex program ID must be changed to the proxy program.
// 2. The canonical dex program ID must be inserted as the first account
//    in instructions using the proxy relay. The program is responsible for
//    removing this account before relaying to the dex.
//
// Otherwise, the client should function the same as a regular Market client.
export class MarketProxy extends Market {
  // Program ID of the permissioning proxy program.
  private _proxyProgramId: PublicKey;

  // Dex program ID.
  private _dexProgramId: PublicKey;

  // Account metas that are loaded as the first account to *all* transactions
  // to the proxy.
  private _middlewares: Middleware[];

  constructor(
    decoded: any,
    baseMintDecimals: number,
    quoteMintDecimals: number,
    options: MarketOptions = {},
    dexProgramId: PublicKey,
    proxyProgramId: PublicKey,
    middlewares: Middleware[],
  ) {
    super(
      decoded,
      baseMintDecimals,
      quoteMintDecimals,
      options,
      proxyProgramId,
    );
    this._proxyProgramId = proxyProgramId;
    this._dexProgramId = dexProgramId;
    this._middlewares = middlewares;
  }

  public static async openOrdersAddress(
    market: PublicKey,
    owner: PublicKey,
    dexProgramId: PublicKey,
    proxyProgramId: PublicKey,
  ): Promise<PublicKey> {
    // b"open-orders".
    const openOrdersStr = Buffer.from([
      111,
      112,
      101,
      110,
      45,
      111,
      114,
      100,
      101,
      114,
      115,
    ]);
    const [addr] = await PublicKey.findProgramAddress(
      [
        openOrdersStr,
        dexProgramId.toBuffer(),
        market.toBuffer(),
        owner.toBuffer(),
      ],
      proxyProgramId,
    );
    return addr;
  }

  public makePlaceOrderInstructionPermissioned(
    connection: Connection,
    params: OrderParams<PublicKey>,
  ): Array<TransactionInstruction> {
    // The amount of USDC transferred into the dex for the trade.
    let amount;
    if (params.side === 'buy') {
      // @ts-ignore
      amount = new BN(this._decoded.quoteLotSize.toNumber()).mul(
        this.baseSizeNumberToLots(params.size).mul(
          this.priceNumberToLots(params.price),
        ),
      );
    } else {
      amount = this.baseSizeNumberToLots(params.size);
    }

    // TODO: approve ix probably be injected by the middleware.
    //       Can probably just have another method similar to the runtime
    //       instruction method.
    const approveIx = Token.createApproveInstruction(
      TOKEN_PROGRAM_ID,
      params.payer,
      params.openOrdersAddressKey!,
      params.owner,
      [],
      amount.toNumber(),
    );
    const tradeIx = super.makePlaceOrderInstruction(connection, params);
    this._middlewares.forEach((mw) => mw.newOrderV3(tradeIx));

    return [approveIx, this.proxy(tradeIx)];
  }

  /**
   * @override
   */
  static async load(
    connection: Connection,
    address: PublicKey,
    options: MarketOptions = {},
    dexProgramId: PublicKey,
    proxyProgramId?: PublicKey,
    middlewares?: Middleware[],
  ): Promise<MarketProxy> {
    const market = await Market.load(
      connection,
      address,
      options,
      dexProgramId,
    );
    return new MarketProxy(
      market.decoded,
      // @ts-ignore
      market._baseSplTokenDecimals,
      // @ts-ignore
      market._quoteSplTokenDecimals,
      options,
      dexProgramId,
      proxyProgramId!,
      middlewares!,
    );
  }

  /**
   * @override
   */
  public static getLayout(_programId: PublicKey) {
    return _MARKET_STATE_LAYOUT_V3;
  }

  /**
   * @override
   */
  public makeInitOpenOrdersInstruction(
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

  /**
   * @override
   */
  public makePlaceOrderInstruction<T extends PublicKey | Account>(
    connection: Connection,
    params: OrderParams<T>,
  ): TransactionInstruction {
    const ix = super.makePlaceOrderInstruction(connection, params);
    return this.proxy(ix);
  }

  /**
   * @override
   */
  public makeCancelOrderByClientIdInstruction(
    owner: PublicKey,
    openOrders: PublicKey,
    clientId: BN,
  ): TransactionInstruction {
    const ix = DexInstructions.cancelOrderByClientIdV2({
      market: this.address,
      openOrders,
      owner,
      bids: this.decoded.bids,
      asks: this.decoded.asks,
      eventQueue: this.decoded.eventQueue,
      clientId,
      programId: this._proxyProgramId,
    });
    this._middlewares.forEach((mw) => mw.cancelOrderByClientIdV2(ix));
    return this.proxy(ix);
  }

  /**
   * @override
   */
  public makeSettleFundsInstruction(
    openOrders: PublicKey,
    owner: PublicKey,
    baseWallet: PublicKey,
    quoteWallet: PublicKey,
    referrerQuoteWallet: PublicKey,
  ): TransactionInstruction {
    const ix = DexInstructions.settleFunds({
      market: this.address,
      openOrders,
      owner,
      baseVault: this.decoded.baseVault,
      quoteVault: this.decoded.quoteVault,
      baseWallet,
      quoteWallet,
      vaultSigner: utils.publicKey.createProgramAddressSync(
        [
          this.address.toBuffer(),
          this.decoded.vaultSignerNonce.toArrayLike(Buffer, 'le', 8),
        ],
        this._dexProgramId,
      ),
      programId: this._proxyProgramId,
      referrerQuoteWallet,
    });
    this._middlewares.forEach((mw) => mw.settleFunds(ix));
    return this.proxy(ix);
  }

  /**
   * @override
   */
  public makeCloseOpenOrdersInstruction(
    openOrders: PublicKey,
    owner: PublicKey,
    solWallet: PublicKey,
  ): TransactionInstruction {
    const ix = DexInstructions.closeOpenOrders({
      market: this.address,
      openOrders,
      owner,
      solWallet,
      programId: this._proxyProgramId,
    });
    this._middlewares.forEach((mw) => mw.closeOpenOrders(ix));
    return this.proxy(ix);
  }

  /**
   * @override
   */
  // Skips the proxy frontend and goes directly to the orderbook.
  public makeConsumeEventsInstruction(
    openOrdersAccounts: Array<PublicKey>,
    limit: number,
  ): TransactionInstruction {
    return DexInstructions.consumeEvents({
      market: this.address,
      eventQueue: this.decoded.eventQueue,
      coinFee: this.decoded.eventQueue,
      pcFee: this.decoded.eventQueue,
      openOrdersAccounts,
      limit,
      programId: this._dexProgramId,
    });
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

const _MARKET_STATE_LAYOUT_V3 = struct([
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

  blob(7),
]);

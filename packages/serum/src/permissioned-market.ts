import { blob, struct } from 'buffer-layout';
import BN from 'bn.js';
import {
  Connection,
  PublicKey,
  Account,
  TransactionInstruction,
  SystemProgram,
  AccountMeta,
} from '@solana/web3.js';
import { Token, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { accountFlagsLayout, publicKeyLayout, u64 } from './layout';
import { Market, MarketOptions, OrderParams } from './market';
import { DexInstructions } from './instructions';

////////////////////////////////////////////////////////////////////////////////
//
// This API is experimental. It may be subject to imminent breaking changes.
//
////////////////////////////////////////////////////////////////////////////////

// Permissioned market overrides Market since it requires a frontend, on-chain
// proxy program, which relays all instructions to the orderbook. This requires
// two modifications for most instructions.
//
// 1. The dex program ID must be changed to the proxy program.
// 2. The canonical dex program ID must be inserted as the first account
//    in instructions using the proxy relay. The program is responsible for
//    removing this account before relaying to the dex.
//
// Otherwise, the client should function the same as a regular Market client.
export class PermissionedMarket extends Market {
  // Program ID of the permissioning proxy program.
  private _proxyProgramId: PublicKey;

  // Dex program ID.
  private _dexProgramId: PublicKey;

  // Account metas that are loaded as the first account to *all* transactions
  // to the proxy.
  private _preloadAccountMetas?: AccountMeta[];

  constructor(
    decoded: any,
    baseMintDecimals: number,
    quoteMintDecimals: number,
    options: MarketOptions = {},
    dexProgramId: PublicKey,
    proxyProgramId: PublicKey,
    preloadAccountMetas?: AccountMeta[],
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
    this._preloadAccountMetas = preloadAccountMetas;
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

    const approveIx = Token.createApproveInstruction(
      TOKEN_PROGRAM_ID,
      params.payer,
      params.openOrdersAddressKey!,
      params.owner,
      [],
      amount.toNumber(),
    );
    const tradeIx = this.proxy(
      super.makePlaceOrderInstruction(connection, params),
    );
    return [approveIx, tradeIx];
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
    preloadAccountMetas?: AccountMeta[],
  ): Promise<PermissionedMarket> {
    const market = await Market.load(
      connection,
      address,
      options,
      dexProgramId,
    );
    return new PermissionedMarket(
      market.decoded,
      // @ts-ignore
      market._baseSplTokenDecimals,
      // @ts-ignore
      market._quoteSplTokenDecimals,
      options,
      dexProgramId,
      proxyProgramId!,
      preloadAccountMetas!,
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
  public async makeInitOpenOrdersInstruction(
    owner: PublicKey,
    market: PublicKey,
  ): Promise<TransactionInstruction> {
    // b"open-orders"
    const openOrdersSeed = Buffer.from([
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
    // b"open-orders-init"
    const openOrdersInitSeed = Buffer.from([
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
      45,
      105,
      110,
      105,
      116,
    ]);
    const [openOrders] = await PublicKey.findProgramAddress(
      [
        openOrdersSeed,
        this._dexProgramId.toBuffer(),
        market.toBuffer(),
        owner.toBuffer(),
      ],
      this._proxyProgramId,
    );
    const [marketAuthority] = await PublicKey.findProgramAddress(
      [openOrdersInitSeed, this._dexProgramId.toBuffer(), market.toBuffer()],
      this._proxyProgramId,
    );
    const ix = DexInstructions.initOpenOrders({
      market,
      openOrders,
      owner,
      programId: this._proxyProgramId,
      marketAuthority,
    });

    // Prepend to the account list extra accounts needed for PDA initialization.
    ix.keys = [
      { pubkey: this._dexProgramId, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ...ix.keys,
    ];
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
  public async makeCancelOrderByClientIdInstruction(
    connection: Connection,
    owner: PublicKey,
    openOrders: PublicKey,
    clientId: BN,
  ): Promise<TransactionInstruction> {
    const ix = (
      await this.makeCancelOrderByClientIdTransaction(
        connection,
        owner,
        openOrders,
        clientId,
      )
    ).instructions[0];
    return this.proxy(ix);
  }

  /**
   * @override
   */
  public async makeSettleFundsInstruction(
    openOrders: PublicKey,
    owner: PublicKey,
    baseWallet: PublicKey,
    quoteWallet: PublicKey,
    referrerQuoteWallet: PublicKey,
  ): Promise<TransactionInstruction> {
    const ix = DexInstructions.settleFunds({
      market: this.address,
      openOrders,
      owner,
      baseVault: this.decoded.baseVault,
      quoteVault: this.decoded.quoteVault,
      baseWallet,
      quoteWallet,
      vaultSigner: await PublicKey.createProgramAddress(
        [
          this.address.toBuffer(),
          this.decoded.vaultSignerNonce.toArrayLike(Buffer, 'le', 8),
        ],
        this._dexProgramId,
      ),
      programId: this._proxyProgramId,
      referrerQuoteWallet,
    });
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
      ...(this._preloadAccountMetas ?? []),
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

import BN from 'bn.js';
import {
  PublicKey,
  Signer,
  Transaction,
  TransactionSignature,
  SYSVAR_RENT_PUBKEY,
} from '@solana/web3.js';
import { Program, Provider } from '@project-serum/anchor';
import { TokenListContainer } from '@solana/spl-token-registry';
import { Account, ConfirmOptions } from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { Market, OpenOrders } from '@project-serum/serum';
import { IDL } from './idl';
import {
  DEX_PID,
  SWAP_PID,
  USDC_PUBKEY,
  USDT_PUBKEY,
  getVaultOwnerAndNonce,
  getAssociatedTokenAddress,
} from './utils';
import SwapMarkets from './swap-markets';

// Close account feature flag.
//
// TODO: enable once the DEX supports closing open orders accounts.
const CLOSE_ENABLED = false;

// Initialize open orders feature flag.
//
// TODO: enable once the DEX supports initializing open orders accounts.
const OPEN_ENABLED = false;

/**
 *
 * # Swap
 *
 * A module to swap tokens across markets the Serum DEX, providing a thin
 * wrapper around an [Anchor](https://github.com/project-serum/anchor) client
 * for the purpose of providing a simplified `swap` API.
 *
 * ## Usage
 *
 * ### Create a client
 *
 * ```javascript
 * const client = new Swap(provider, tokenList)
 * ```
 *
 * ### Swap one token for another across USD(x) quoted markets.
 *
 * ```javascript
 * await client.swap({
 *   fromMint,
 *   toMint,
 *   amount,
 *   minExchangeRate,
 * });
 * ```
 *
 * ### Default Behavior
 *
 * Some parameters in the swap API are optional. For example, the `fromMarket`
 * and `toMarket`, specifying the markets to swap across. In the event that
 * markets are ommitted, the client will swap across USD(x) quoted markets.
 * For more information about default behavior see the [[SwapParams]]
 * documentation. For most GUIs, the application likely already knows the
 * markets to swap accross, since one needs that information to calculate
 * exchange rates. So it's recommend to pass in most, if not all, the
 * optional parameters explicitly, to prevent unnecessary network requests.
 *
 * ## Swap Program Basics
 *
 * One should have a basic understanding of the on-chain
 * [Swap](https://github.com/project-serum/swap) program before using the
 * client. Two core APIs are exposed.
 *
 * * [swap](https://github.com/project-serum/swap/blob/master/programs/swap/src/lib.rs#L36) -
 *   swaps two tokens on a single A/B market. This is just an IOC trade at the
 *   BBO that instantly settles.
 * * [swapTransitive](https://github.com/project-serum/swap/blob/master/programs/swap/src/lib.rs#L107) -
 *   swaps two tokens across **two** A/x, B/x markets in the same manner as
 *   `swap`.
 *
 * For both APIs, if the number of tokens received from the trade is less than
 * the client provided `minExchangeRate`, the transaction aborts.
 *
 * Note that if this client package is insufficient, one can always use the
 * Anchor generated client directly, exposing an API mapping one-to-one to
 * these program instructions. See the
 * [`tests/`](https://github.com/project-serum/swap/blob/master/tests/swap.js)
 * for examples of using the Anchor generated swap client.
 *
 * ## Serum Orderbook Program Basics
 *
 * Additionally, because the Swap program is an on-chain frontend for the Serum
 * DEX, one should also be aware of the basic accounts needed for trading on
 * the Serum DEX.
 *
 * Namely, a wallet must have an "open orders" account for each market the
 * wallet trades on. The "open orders" account is akin to how a wallet
 *  must have an SPL token account to own tokens, except instead of holding
 * tokens, the wallet can make trades on the orderbook.
 *
 * ### Creating Open Orders Accounts
 *
 * When the wallet doesn't have an open orders account already created,
 * the swap client provides two choices. Automatically create the required
 * accounts by preloading the instructions in the [[swap]] transaction.
 *
 * Note that if the user is swapping between two non-USD(x) tokens, e.g., wBTC
 * for wETH, then the user needs *two* open orders accounts on both wBTC/USD(x)
 * and wETH/USD(x) markets. In the event both of these open orders accounts are
 * created for the rfirst time, then the transaction is broken up into two
 * (and `Provider.sendAll` is used) to prevent hitting transaction size limits.
 */
export class Swap {
  /**
   * Anchor generated client for the swap program.
   */
  public get program(): Program {
    return this._program;
  }
  private _program: Program;

  /**
   * Token list registry for fetching USD(x) markets for each mint.
   */
  private get swapMarkets(): SwapMarkets {
    return this._swapMarkets;
  }
  private _swapMarkets: SwapMarkets;

  /**
   * @param provider  The wallet and network context to use for the client.
   * @param tokenList The token list providing market addresses for each mint.
   */
  constructor(provider: Provider, tokenList: TokenListContainer) {
    this._program = new Program(IDL, SWAP_PID, provider);
    this._swapMarkets = new SwapMarkets(provider, tokenList);
  }

  /**
   * Returns a list of markets to trade across to swap `fromMint` to `toMint`.
   */
  public route(fromMint: PublicKey, toMint: PublicKey): PublicKey[] | null {
    return this.swapMarkets.route(fromMint, toMint);
  }

  /**
   * Executes a swap against the Serum DEX on Solana. When using one should
   * first use `estimate` along with a user defined error tolerance to calculate
   * the `minExchangeRate`, which provides a lower bound for the number
   * of output tokens received when executing the swap. If, for example,
   * swapping on an illiquid market and the output tokens is less than
   * `minExchangeRate`, then the transaction will fail in an attempt to
   * prevent an undesireable outcome.
   */
  public async swap(params: SwapParams): Promise<Array<TransactionSignature>> {
    let txs = await this.swapTxs(params);
    if (params.additionalTransactions) {
      txs = txs.concat(params.additionalTransactions);
    }
    return this.program.provider.sendAll(txs, params.options);
  }

  public async swapTxs(params: SwapParams): Promise<Array<SendTxRequest>> {
    let {
      fromMint,
      toMint,
      quoteWallet,
      fromWallet,
      toWallet,
      fromMarket,
      toMarket,
      amount,
      minExchangeRate,
      referral,
      close,
      fromOpenOrders,
      toOpenOrders,
    } = params;

    // If either wallet isn't given, then use the associated token account.
    // Assumes the accounts are already created.
    if (!fromWallet) {
      fromWallet = await getAssociatedTokenAddress(
        ASSOCIATED_TOKEN_PROGRAM_ID,
        TOKEN_PROGRAM_ID,
        fromMint,
        this.program.provider.wallet.publicKey,
      );
    }
    if (!toWallet) {
      toWallet = await getAssociatedTokenAddress(
        ASSOCIATED_TOKEN_PROGRAM_ID,
        TOKEN_PROGRAM_ID,
        toMint,
        this.program.provider.wallet.publicKey,
      );
    }

    // If swapping to/from a USD(x) token, then swap directly on the market.
    if (fromMint.equals(USDC_PUBKEY) || fromMint.equals(USDT_PUBKEY)) {
      let coinWallet = toWallet;
      let pcWallet = fromWallet;
      let baseMint = toMint;
      let quoteMint = fromMint;
      let side: SideEnum = Side.Bid;
      // Special case USDT/USDC market since the coin is always USDT and
      // the pc is always USDC.
      if (toMint.equals(USDC_PUBKEY)) {
        coinWallet = fromWallet;
        pcWallet = toWallet;
        baseMint = fromMint;
        quoteMint = toMint;
        side = Side.Ask;
      } else if (toMint.equals(USDT_PUBKEY)) {
        coinWallet = toWallet;
        pcWallet = fromWallet;
        baseMint = toMint;
        quoteMint = quoteMint;
        side = Side.Bid;
      }
      return await this.swapDirectTxs({
        coinWallet,
        pcWallet,
        baseMint,
        quoteMint,
        side,
        amount,
        minExchangeRate,
        referral,
        close,
        fromMarket,
        fromOpenOrders,
      });
    } else if (toMint.equals(USDC_PUBKEY) || toMint.equals(USDT_PUBKEY)) {
      return await this.swapDirectTxs({
        coinWallet: fromWallet,
        pcWallet: toWallet,
        baseMint: fromMint,
        quoteMint: toMint,
        side: Side.Ask,
        amount,
        minExchangeRate,
        referral,
        close,
        fromMarket,
        fromOpenOrders,
      });
    } else if (fromMarket !== undefined && toMarket === undefined) {
      return await this.swapDirectTxs({
        coinWallet: fromWallet,
        pcWallet: toWallet,
        baseMint: fromMint,
        quoteMint: toMint,
        side: fromMint.equals(fromMarket.baseMintAddress) ? Side.Ask : Side.Bid,
        amount,
        minExchangeRate,
        referral,
        close,
        fromMarket,
        fromOpenOrders,
      });
    }

    // Neither wallet is a USD stable coin. So perform a transitive swap.
    if (!quoteWallet) {
      if (this.swapMarkets.usdcPathExists(fromMint, toMint)) {
        quoteWallet = await getAssociatedTokenAddress(
          ASSOCIATED_TOKEN_PROGRAM_ID,
          TOKEN_PROGRAM_ID,
          USDC_PUBKEY,
          this.program.provider.wallet.publicKey,
        );
      } else {
        quoteWallet = await getAssociatedTokenAddress(
          ASSOCIATED_TOKEN_PROGRAM_ID,
          TOKEN_PROGRAM_ID,
          USDT_PUBKEY,
          this.program.provider.wallet.publicKey,
        );
      }
    }
    return await this.swapTransitiveTxs({
      fromMint,
      toMint,
      fromWallet,
      toWallet,
      pcWallet: quoteWallet,
      amount,
      minExchangeRate,
      referral,
      close,
      fromMarket,
      toMarket,
      fromOpenOrders,
      toOpenOrders,
    });
  }

  private async swapDirectTxs({
    coinWallet,
    pcWallet,
    baseMint,
    quoteMint,
    side,
    amount,
    minExchangeRate,
    referral,
    close,
    fromMarket,
    fromOpenOrders,
  }: {
    coinWallet: PublicKey;
    pcWallet: PublicKey;
    baseMint: PublicKey;
    quoteMint: PublicKey;
    side: SideEnum;
    amount: BN;
    minExchangeRate: ExchangeRate;
    referral?: PublicKey;
    close?: boolean;
    fromMarket?: Market;
    fromOpenOrders?: PublicKey;
  }): Promise<Array<SendTxRequest>> {
    const marketAddress = fromMarket
      ? fromMarket.address
      : this.swapMarkets.getMarketAddress(quoteMint, baseMint);
    if (marketAddress === null) {
      throw new Error('Invalid market');
    }
    const marketClient = fromMarket
      ? fromMarket
      : await Market.load(
          this.program.provider.connection,
          marketAddress,
          this.program.provider.opts,
          DEX_PID,
        );
    const [vaultSigner] = await getVaultOwnerAndNonce(marketClient.address);
    let openOrders: PublicKey | undefined;
    if (fromOpenOrders) {
      openOrders = fromOpenOrders;
    } else {
      openOrders = await (async () => {
        let openOrders = await OpenOrders.findForMarketAndOwner(
          this.program.provider.connection,
          marketClient.address,
          this.program.provider.wallet.publicKey,
          DEX_PID,
        );
        // If we have an open orders account use it. It doesn't matter which
        // one we use.
        return openOrders[0] ? openOrders[0].address : undefined;
      })();
    }
    const needsOpenOrders = openOrders === undefined;

    const tx = new Transaction();
    const signers: Account[] = [];

    // Create the open orders account, if needed.
    if (needsOpenOrders) {
      const oo = new Account();
      signers.push(oo);
      openOrders = oo.publicKey;
      tx.add(
        await OpenOrders.makeCreateAccountTransaction(
          this.program.provider.connection,
          marketClient.address,
          this.program.provider.wallet.publicKey,
          oo.publicKey,
          DEX_PID,
        ),
      );
    }
    tx.add(
      this.program.instruction.swap(side, amount, minExchangeRate, {
        accounts: {
          market: {
            market: marketClient.address,
            // @ts-ignore
            requestQueue: marketClient._decoded.requestQueue,
            // @ts-ignore
            eventQueue: marketClient._decoded.eventQueue,
            bids: marketClient.bidsAddress,
            asks: marketClient.asksAddress,
            // @ts-ignore
            coinVault: marketClient._decoded.baseVault,
            // @ts-ignore
            pcVault: marketClient._decoded.quoteVault,
            vaultSigner,
            openOrders,
            orderPayerTokenAccount: side.bid ? pcWallet : coinWallet,
            coinWallet: coinWallet,
          },
          pcWallet,
          authority: this.program.provider.wallet.publicKey,
          dexProgram: DEX_PID,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: SYSVAR_RENT_PUBKEY,
        },
        remainingAccounts: referral && [
          { pubkey: referral, isWritable: true, isSigner: false },
        ],
      }),
    );

    // If an account was opened for this swap, then close it in the same
    // transaction.
    if (CLOSE_ENABLED && close && needsOpenOrders) {
      tx.add(
        this.program.instruction.closeAccount({
          accounts: {
            openOrders,
            authority: this.program.provider.wallet.publicKey,
            destination: this.program.provider.wallet.publicKey,
            market: marketClient.address,
            dexProgram: DEX_PID,
          },
        }),
      );
    }

    return [{ tx, signers }];
  }

  private async swapTransitiveTxs({
    fromMint,
    toMint,
    fromWallet,
    toWallet,
    pcWallet,
    amount,
    minExchangeRate,
    referral,
    close,
    fromMarket,
    toMarket,
    fromOpenOrders,
    toOpenOrders,
  }: {
    fromMint: PublicKey;
    toMint: PublicKey;
    fromWallet: PublicKey;
    toWallet: PublicKey;
    pcWallet: PublicKey;
    amount: BN;
    minExchangeRate: ExchangeRate;
    referral?: PublicKey;
    close?: boolean;
    fromMarket?: Market;
    toMarket?: Market;
    fromOpenOrders?: PublicKey;
    toOpenOrders?: PublicKey;
  }): Promise<Array<SendTxRequest>> {
    // Fetch the markets, if needed.
    let fromMarketAddress: PublicKey, toMarketAddress: PublicKey;
    let fromMarketClient: Market, toMarketClient: Market;
    if (fromMarket) {
      fromMarketAddress = fromMarket.address;
      fromMarketClient = fromMarket;
    } else {
      let fromMarketAddressMaybe = this.swapMarkets.getMarketAddress(
        USDC_PUBKEY,
        fromMint,
      );
      if (fromMarketAddressMaybe === null) {
        fromMarketAddressMaybe = this.swapMarkets.getMarketAddress(
          USDT_PUBKEY,
          fromMint,
        );
        if (fromMarketAddressMaybe === null) {
          throw new Error('Invalid market');
        }
      }
      fromMarketAddress = fromMarketAddressMaybe;

      fromMarketClient = await Market.load(
        this.program.provider.connection,
        fromMarketAddress,
        this.program.provider.opts,
        DEX_PID,
      );
    }
    if (toMarket) {
      toMarketAddress = toMarket.address;
      toMarketClient = toMarket;
    } else {
      let toMarketAddressMaybe = this.swapMarkets.getMarketAddress(
        USDC_PUBKEY,
        toMint,
      );
      if (toMarketAddressMaybe === null) {
        toMarketAddressMaybe = this.swapMarkets.getMarketAddress(
          USDT_PUBKEY,
          toMint,
        );
        if (toMarketAddressMaybe === null) {
          throw new Error('Invalid market');
        }
      }
      toMarketAddress = toMarketAddressMaybe;

      toMarketClient = await Market.load(
        this.program.provider.connection,
        toMarketAddress,
        this.program.provider.opts,
        DEX_PID,
      );
    }
    // Fetch the open orders accounts, if needed.
    if (!fromOpenOrders) {
      const acc = await OpenOrders.findForMarketAndOwner(
        this.program.provider.connection,
        fromMarketClient.address,
        this.program.provider.wallet.publicKey,
        DEX_PID,
      )[0];
      fromOpenOrders = acc ? acc.address : undefined;
    }
    if (!toOpenOrders) {
      const acc = await OpenOrders.findForMarketAndOwner(
        this.program.provider.connection,
        toMarketClient.address,
        this.program.provider.wallet.publicKey,
        DEX_PID,
      )[0];
      toOpenOrders = acc ? acc.address : undefined;
    }
    // If the open orders are still undefined, then they don't exist.
    const fromNeedsOpenOrders = fromOpenOrders === undefined;
    const toNeedsOpenOrders = toOpenOrders === undefined;

    // Now that we have all the accounts, build the transaction.
    //
    // In the event the transaction would be over the transaction size limit,
    // we break up the transaction into multiple and use `Provider.sendAll`
    // as a workaround, providing a single user flow for the swap action.
    //
    // Alternatively, one could breakup the different actions here into explicit
    // user flows. I.e., three separate flows for creating open orders
    // counts, swapping, and closing open orders accounts. If choosing to do
    // this, it's recommended to use the anchor generated client directly,
    // instead of the client here.
    let openOrdersTransaction: Transaction | undefined = undefined;
    const openOrdersSigners: Account[] = [];
    const swapTransaction: Transaction = new Transaction();
    const swapSigners: Account[] = [];
    let closeTransaction: Transaction | undefined = undefined;
    const closeSigners: Account[] = [];

    // Calculate the vault signers for each market.
    const [fromVaultSigner] = await getVaultOwnerAndNonce(
      fromMarketClient.address,
    );
    const [toVaultSigner] = await getVaultOwnerAndNonce(toMarketClient.address);

    // Add instructions to create open orders, if needed.
    //
    // If creating open orders accounts on *both* from and to markets, then
    // split out the create open orders instructions into their own transaction.
    if (fromNeedsOpenOrders && toNeedsOpenOrders) {
      openOrdersTransaction = new Transaction();
      const ooFrom = new Account();
      openOrdersSigners.push(ooFrom);
      openOrdersTransaction.add(
        await OpenOrders.makeCreateAccountTransaction(
          this.program.provider.connection,
          fromMarketAddress,
          this.program.provider.wallet.publicKey,
          ooFrom.publicKey,
          DEX_PID,
        ),
      );
      fromOpenOrders = ooFrom.publicKey;

      const ooTo = new Account();
      openOrdersSigners.push(ooTo);
      openOrdersTransaction.add(
        await OpenOrders.makeCreateAccountTransaction(
          this.program.provider.connection,
          toMarketAddress,
          this.program.provider.wallet.publicKey,
          ooTo.publicKey,
          DEX_PID,
        ),
      );
      toOpenOrders = ooTo.publicKey;

      if (OPEN_ENABLED) {
        openOrdersTransaction.add(
          this.program.instruction.initAccount({
            accounts: {
              openOrders: ooFrom.publicKey,
              authority: this.program.provider.wallet.publicKey,
              market: fromMarketAddress,
              dexProgram: DEX_PID,
              rent: SYSVAR_RENT_PUBKEY,
            },
          }),
        );
        openOrdersTransaction.add(
          this.program.instruction.initAccount({
            accounts: {
              openOrders: ooTo.publicKey,
              authority: this.program.provider.wallet.publicKey,
              market: fromMarketAddress,
              dexProgram: DEX_PID,
              rent: SYSVAR_RENT_PUBKEY,
            },
          }),
        );
      }
    } else if (fromNeedsOpenOrders) {
      const oo = new Account();
      swapSigners.push(oo);
      swapTransaction.add(
        await OpenOrders.makeCreateAccountTransaction(
          this.program.provider.connection,
          fromMarketAddress,
          this.program.provider.wallet.publicKey,
          oo.publicKey,
          DEX_PID,
        ),
      );
      fromOpenOrders = oo.publicKey;
    } else if (toNeedsOpenOrders) {
      const oo = new Account();
      swapSigners.push(oo);
      swapTransaction.add(
        await OpenOrders.makeCreateAccountTransaction(
          this.program.provider.connection,
          toMarketAddress,
          this.program.provider.wallet.publicKey,
          oo.publicKey,
          DEX_PID,
        ),
      );
      toOpenOrders = oo.publicKey;
    }

    swapTransaction.add(
      this.program.instruction.swapTransitive(amount, minExchangeRate, {
        accounts: {
          from: {
            market: fromMarketClient.address,
            // @ts-ignore
            requestQueue: fromMarketClient._decoded.requestQueue,
            // @ts-ignore
            eventQueue: fromMarketClient._decoded.eventQueue,
            bids: fromMarketClient.bidsAddress,
            asks: fromMarketClient.asksAddress,
            // @ts-ignore
            coinVault: fromMarketClient._decoded.baseVault,
            // @ts-ignore
            pcVault: fromMarketClient._decoded.quoteVault,
            vaultSigner: fromVaultSigner,
            openOrders: fromOpenOrders,
            orderPayerTokenAccount: fromWallet,
            coinWallet: fromWallet,
          },
          to: {
            market: toMarketClient.address,
            // @ts-ignore
            requestQueue: toMarketClient._decoded.requestQueue,
            // @ts-ignore
            eventQueue: toMarketClient._decoded.eventQueue,
            bids: toMarketClient.bidsAddress,
            asks: toMarketClient.asksAddress,
            // @ts-ignore
            coinVault: toMarketClient._decoded.baseVault,
            // @ts-ignore
            pcVault: toMarketClient._decoded.quoteVault,
            vaultSigner: toVaultSigner,
            openOrders: toOpenOrders,
            orderPayerTokenAccount: pcWallet,
            coinWallet: toWallet,
          },
          pcWallet,
          authority: this.program.provider.wallet.publicKey,
          dexProgram: DEX_PID,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: SYSVAR_RENT_PUBKEY,
        },
        remainingAccounts: referral && [
          { pubkey: referral, isWritable: true, isSigner: false },
        ],
      }),
    );

    if (CLOSE_ENABLED && close && fromNeedsOpenOrders) {
      closeTransaction = new Transaction();
      closeTransaction.add(
        this.program.instruction.closeAccount({
          accounts: {
            openOrders: fromOpenOrders,
            authority: this.program.provider.wallet.publicKey,
            destination: this.program.provider.wallet.publicKey,
            market: fromMarketClient.address,
            dexProgram: DEX_PID,
          },
        }),
      );
    }

    if (CLOSE_ENABLED && close && toNeedsOpenOrders) {
      if (!closeTransaction) {
        closeTransaction = new Transaction();
      }
      closeTransaction.add(
        this.program.instruction.closeAccount({
          accounts: {
            openOrders: toOpenOrders,
            authority: this.program.provider.wallet.publicKey,
            destination: this.program.provider.wallet.publicKey,
            market: toMarketClient.address,
            dexProgram: DEX_PID,
          },
        }),
      );
    }

    const txs: Array<SendTxRequest> = [];
    if (openOrdersTransaction !== undefined) {
      txs.push({ tx: openOrdersTransaction, signers: openOrdersSigners });
    }
    txs.push({ tx: swapTransaction, signers: swapSigners });
    if (closeTransaction !== undefined) {
      txs.push({ tx: closeTransaction, signers: closeSigners });
    }

    return txs;
  }
}

/**
 * Parameters to perform a swap.
 */
export type SwapParams = {
  /**
   * Token mint to swap from.
   */
  fromMint: PublicKey;

  /**
   * Token mint to swap to.
   */
  toMint: PublicKey;

  /**
   * Amount of `fromMint` to swap in exchange for `toMint`.
   */
  amount: BN;

  /**
   * The minimum rate used to calculate the number of tokens one
   * should receive for the swap. This is a safety mechanism to prevent one
   * from performing an unexpecteed trade.
   */
  minExchangeRate: ExchangeRate;

  /**
   * Token account to receive the Serum referral fee. The mint must be in the
   * quote currency of the trade (USDC or USDT).
   */
  referral?: PublicKey;

  /**
   * Wallet of the quote currency to use in a transitive swap. Should be either
   * a USDC or USDT wallet. If not provided uses an associated token address
   * for the configured provider.
   */
  quoteWallet?: PublicKey;

  /**
   * Wallet for `fromMint`. If not provided, uses an associated token address
   * for the configured provider.
   */
  fromWallet?: PublicKey;

  /**
   * Wallet for `toMint`. If not provided, uses the associated token address
   * for the configured provider.
   */
  toWallet?: PublicKey;

  /**
   * Market client for the first leg of the swap. Can be given to prevent
   * the client from making unnecessary network requests. It's recommended
   * to use this in most cases. If not given, then swaps across a USD(x) quoted
   * market.
   */
  fromMarket?: Market;

  /**
   * Market client for the second leg of the swap. Can be given to prevent
   * the client from making unnecessary network requests. It's recommended
   * to use this in most cases. If not given, then swaps across a USD(x) quoted
   * market.
   */
  toMarket?: Market;

  /**
   * Open orders account for the first leg of the swap. Can be given to prevent
   * the client from making unnecessary network requests. It's recommended
   * to use this in most cases.
   */
  fromOpenOrders?: PublicKey;

  /**
   * Open orders account for the second leg of the swap. Can be given to prevent
   * the client from making unnecessary network requests. It's recommended
   * to use this in most cases.
   */
  toOpenOrders?: PublicKey;

  /**
   * RPC options. If not given the options on the program's provider are used.
   */
  options?: ConfirmOptions;

  /**
   * True if all new open orders accounts should be automatically closed.
   * Currently disabled.
   */
  close?: boolean;

  /**
   * Additional transactions to bundle into the swap transaction
   */
  additionalTransactions?: Array<{ tx: Transaction; signers: Signer[] }>;
};

// Side rust enum used for the program's RPC API.
type SideEnum = any;
const Side = {
  Bid: { bid: {} },
  Ask: { ask: {} },
};

type ExchangeRate = {
  rate: BN;
  fromDecimals: number;
  quoteDecimals: number;
  strict: boolean;
};
type SendTxRequest = { tx: Transaction; signers: Array<Signer | undefined> };

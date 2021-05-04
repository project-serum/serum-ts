import BN from 'bn.js';
import {
  PublicKey,
  Transaction,
  TransactionSignature,
  SYSVAR_RENT_PUBKEY,
} from '@solana/web3.js';
import { Program, Provider } from '@project-serum/anchor';
import { TokenListContainer } from '@solana/spl-token-registry';
import {
  Account,
  TransactionInstruction,
  ConfirmOptions,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import * as base64 from 'base64-js';
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

/**
 *
 * # Swap
 *
 * A module to swap tokens across USD(x) quoted markets on the Serum DEX,
 * providing a thin wrapper around an
 * [Anchor](https://github.com/project-serum/anchor) generated client in an
 * attempt to abstract away orderbook details.
 *
 * ## Usage
 *
 * ### Create a client
 *
 * ```javascript
 * const client = new Swap(provider, tokenList)
 * ```
 *
 * ### List all token mints to swap
 *
 * ```javascript
 * const tokens = client.tokens();
 * ```
 *
 * ### Get all candidate swap pairs for a given token mint
 *
 * ```javascript
 * const swappableTokens = client.pairs(usdcPublicKey);
 * ```
 *
 * ### Swap one token for another.
 *
 * ```javascript
 * await client.swap({
 *   fromMint,
 *   toMint,
 *   amount,
 * })
 * ```
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
 * When swapping to/from a USD(x) token, the swap client will use the `swap` API.
 * When swapping to/from a non-USD(x) token, e.g., wBTC for wETH, the swap
 * client will use the `swapTransitive`API with USD(x) quoted markets to bridge
 * the two tokens.
 *
 * For both APIs, if the number of tokens received from the trade is less than
 * the client provided `minExpectedAmount`, the transaction aborts.
 *
 * Note that if this client package is insufficient, one can always use the
 *  Anchor generated client directly, exposing an API mapping one-to-one to
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
 * the swap client provides two choices.
 *
 * 1. Explicitly open (and close) the open
 *    orders account explicitly via the [[initAccounts]]
 *    (and [[closeAccounts]]) methods.
 * 2. Automatically create the required accounts by preloading the instructions
 *    in the [[swap]] transaction.
 *
 * Note that if the user is swapping between two non-USD(x) tokens, e.g., wBTC
 * for wETH, then the user needs *two* open orders accounts on both wBTC/USD(x)
 * and wETH/USD(x) markets. So if one chooses option two **and** needs to
 * create open orders accounts for both markets, then the transaction
 * is broken up into two (and `Provider.sendAll` is used) to prevent hitting
 * transaction size limits.
 */
export class Swap {
  /**
   * Anchor generated client for the swap program.
   */
  private program: Program;

  /**
   * Token list registry for fetching USD(x) markets for each mint.
   */
  private swapMarkets: SwapMarkets;

  /**
   * @param provider  The wallet and network context to use for the client.
   * @param tokenList The token list providing market addresses for each mint.
   */
  constructor(provider: Provider, tokenList: TokenListContainer) {
    this.program = new Program(IDL, SWAP_PID, provider);
    this.swapMarkets = new SwapMarkets(provider, tokenList);
  }

  /**
   * Returns a list of all the available tokens that can be swapped. This
   * includes all tokens with USDC or USDT quoted markets.
   *
   * To update the set of swappable tokens, please update the
   * [`@solana/spl-token-registry`](https://github.com/solana-labs/token-list)
   * package to list the USD(x) markets available for each token mint.
   */
  public tokens(): PublicKey[] {
    return this.swapMarkets.tokens();
  }

  /**
   * Given a token, returns the list of all candidate tokens that can be
   * swapped with the given token. This is important, because, in order for a
   * swap to be available, there must exist a path across a USD(x) quoted
   * market.
   *
   * To swap across alternative quote currencies, one should use the Anchor
   * generated client directly (although it's recommended to trade
   * across USD(x)) since they tend to be the most liquid.
   */
  public pairs(mint: PublicKey): PublicKey[] {
    return this.swapMarkets.pairs(mint);
  }

  /**
   * Sends a transaction to initialize all accounts required for a swap between
   * the two mints. I.e., creates the DEX open orders accounts.
   *
   * @throws if all open orders accounts already exist.
   */
  public async initAccounts(
    params: InitSwapAccountParams,
  ): Promise<TransactionSignature> {
    const { fromMint, toMint } = params;

    const signers: Account[] = [];
    const tx = new Transaction();

    // Direct swap on USD(x).
    if (fromMint.equals(USDC_PUBKEY) || fromMint.equals(USDT_PUBKEY)) {
      const openOrders = new Account();
      const marketAddress = await this.swapMarkets.getMarketAddressIfNeeded(
        fromMint,
        toMint,
      );
      tx.add(
        await OpenOrders.makeCreateAccountTransaction(
          this.program.provider.connection,
          marketAddress,
          this.program.provider.wallet.publicKey,
          openOrders.publicKey,
          DEX_PID,
        ),
      );
      signers.push(openOrders);
      tx.add(
        this.program.instruction.initAccount({
          accounts: {
            openOrders: openOrders.publicKey,
            authority: this.program.provider.wallet.publicKey,
            market: marketAddress,
            dexProgram: DEX_PID,
            rent: SYSVAR_RENT_PUBKEY,
          },
        }),
      );
    }
    // Direct swap on USD(x).
    else if (toMint.equals(USDC_PUBKEY) || toMint.equals(USDT_PUBKEY)) {
      const openOrders = new Account();
      const marketAddress = await this.swapMarkets.getMarketAddressIfNeeded(
        toMint,
        fromMint,
      );
      tx.add(
        await OpenOrders.makeCreateAccountTransaction(
          this.program.provider.connection,
          marketAddress,
          this.program.provider.wallet.publicKey,
          openOrders.publicKey,
          DEX_PID,
        ),
      );
      tx.add(
        this.program.instruction.initAccount({
          accounts: {
            openOrders: openOrders.publicKey,
            authority: this.program.provider.wallet.publicKey,
            market: marketAddress,
            dexProgram: DEX_PID,
            rent: SYSVAR_RENT_PUBKEY,
          },
        }),
      );
      signers.push(openOrders);
    }
    // Transitive swap across USD(x).
    else {
      // Builds the instructions for initializing open orders for a transitive
      // swap.
      const tryBuildTransitive = async (
        usdx: PublicKey,
      ): Promise<[Array<TransactionInstruction>, Array<Account>]> => {
        // Instructions and signers to build.
        const ixs: Array<TransactionInstruction> = [];
        const sigs: Array<Account> = [];

        // Markets.
        const marketFrom = await this.swapMarkets.getMarketAddress(
          usdx,
          fromMint,
        );
        const marketTo = await this.swapMarkets.getMarketAddress(usdx, toMint);

        // Open orders accounts (already existing).
        const ooAccsFrom = await OpenOrders.findForMarketAndOwner(
          this.program.provider.connection,
          marketFrom,
          this.program.provider.wallet.publicKey,
          DEX_PID,
        );
        const ooAccsTo = await OpenOrders.findForMarketAndOwner(
          this.program.provider.connection,
          marketTo,
          this.program.provider.wallet.publicKey,
          DEX_PID,
        );

        if (ooAccsFrom[0] && ooAccsTo[0]) {
          throw new Error('Open orders already exist');
        }

        // No open orders account for the from market, so make it.
        if (!ooAccsFrom[0]) {
          const ooFrom = new Account();
          ixs.push(
            await OpenOrders.makeCreateAccountTransaction(
              this.program.provider.connection,
              marketFrom,
              this.program.provider.wallet.publicKey,
              ooFrom.publicKey,
              DEX_PID,
            ),
          );
          ixs.push(
            this.program.instruction.initAccount({
              accounts: {
                openOrders: ooFrom.publicKey,
                authority: this.program.provider.wallet.publicKey,
                market: marketFrom,
                dexProgram: DEX_PID,
                rent: SYSVAR_RENT_PUBKEY,
              },
            }),
          );
          sigs.push(ooFrom);
        }

        // No open orders account for the to market, so make it.
        if (!ooAccsTo[0]) {
          const ooTo = new Account();
          ixs.push(
            await OpenOrders.makeCreateAccountTransaction(
              this.program.provider.connection,
              marketTo,
              this.program.provider.wallet.publicKey,
              ooTo.publicKey,
              DEX_PID,
            ),
          );
          ixs.push(
            this.program.instruction.initAccount({
              accounts: {
                openOrders: ooTo.publicKey,
                authority: this.program.provider.wallet.publicKey,
                market: marketTo,
                dexProgram: DEX_PID,
                rent: SYSVAR_RENT_PUBKEY,
              },
            }),
          );
          sigs.push(ooTo);
        }

        // Done.
        return [ixs, sigs];
      };

      try {
        // Try USDC.
        const [ixs, sigs] = await tryBuildTransitive(USDC_PUBKEY);
        tx.add(...ixs);
        signers.push(...sigs);
      } catch (err) {
        // USDC path doesn't exist. Try USDT.
        const [ixs, sigs] = await tryBuildTransitive(USDT_PUBKEY);
        tx.add(...ixs);
        signers.push(...sigs);
      }
    }

    // Send the constructed transaction to the cluster.
    return await this.program.provider.send(tx, signers);
  }

  /**
   * Sends a transaction to close all accounts required for a swap transaction,
   * i.e., all currently open DEX open orders accounts for the given `fromMint`
   * `toMint` swap path.
   *
   * @throws if no open orders accounts exist.
   */
  public async closeAccounts(
    params: CloseSwapAccountParams,
  ): Promise<TransactionSignature> {
    const { fromMint, toMint } = params;
    const tx = new Transaction();
    if (fromMint.equals(USDC_PUBKEY) || fromMint.equals(USDT_PUBKEY)) {
      const marketAddress = await this.swapMarkets.getMarketAddress(
        fromMint,
        toMint,
      );
      const ooAccounts = await OpenOrders.findForMarketAndOwner(
        this.program.provider.connection,
        marketAddress,
        this.program.provider.wallet.publicKey,
        DEX_PID,
      );
      if (!ooAccounts[0]) {
        throw new Error(`Open orders account doesn't exist`);
      }
      tx.add(
        this.program.instruction.closeAccount({
          accounts: {
            openOrders: ooAccounts[0].publicKey,
            authority: this.program.provider.wallet.publicKey,
            destination: this.program.provider.wallet.publicKey,
            market: marketAddress,
            dexProgram: DEX_PID,
          },
        }),
      );
    } else if (toMint.equals(USDC_PUBKEY) || toMint.equals(USDT_PUBKEY)) {
      const marketAddress = await this.swapMarkets.getMarketAddress(
        toMint,
        fromMint,
      );
      const ooAccounts = await OpenOrders.findForMarketAndOwner(
        this.program.provider.connection,
        marketAddress,
        this.program.provider.wallet.publicKey,
        DEX_PID,
      );
      if (!ooAccounts[0]) {
        throw new Error(`Open orders account doesn't exist`);
      }
      tx.add(
        this.program.instruction.closeAccount({
          accounts: {
            openOrders: ooAccounts[0].publicKey,
            authority: this.program.provider.wallet.publicKey,
            destination: this.program.provider.wallet.publicKey,
            market: marketAddress,
            dexProgram: DEX_PID,
          },
        }),
      );
    } else {
      const tryBuildTransitive = async (
        usdx: PublicKey,
      ): Promise<Array<TransactionInstruction>> => {
        // Instructions and signers to build.
        const ixs: Array<TransactionInstruction> = [];
        const sigs: Array<Account> = [];

        // Markets.
        const marketFrom = await this.swapMarkets.getMarketAddress(
          usdx,
          fromMint,
        );
        const marketTo = await this.swapMarkets.getMarketAddress(usdx, toMint);

        // Open orders accounts (already existing).
        const ooAccsFrom = await OpenOrders.findForMarketAndOwner(
          this.program.provider.connection,
          marketFrom,
          this.program.provider.wallet.publicKey,
          DEX_PID,
        );
        const ooAccsTo = await OpenOrders.findForMarketAndOwner(
          this.program.provider.connection,
          marketTo,
          this.program.provider.wallet.publicKey,
          DEX_PID,
        );

        if (!ooAccsFrom[0] && !ooAccsTo[0]) {
          throw new Error(`No open orders accounts left to close`);
        }

        // Close the from market open orders account, if it exists.
        if (ooAccsFrom[0]) {
          ixs.push(
            this.program.instruction.closeAccount({
              accounts: {
                openOrders: ooAccsFrom[0].publicKey,
                authority: this.program.provider.wallet.publicKey,
                destination: this.program.provider.wallet.publicKey,
                market: marketFrom,
                dexProgram: DEX_PID,
              },
            }),
          );
        }

        // Close the to market open orders account, if it exists.
        if (ooAccsTo[0]) {
          ixs.push(
            this.program.instruction.closeAccount({
              accounts: {
                openOrders: ooAccsTo[0].publicKey,
                authority: this.program.provider.wallet.publicKey,
                destination: this.program.provider.wallet.publicKey,
                market: marketTo,
                dexProgram: DEX_PID,
              },
            }),
          );
        }

        return ixs;
      };
      try {
        // Try USDC.
        const ixs = await tryBuildTransitive(USDC_PUBKEY);
        tx.add(...ixs);
      } catch (err) {
        // USDC path doesn't exist. Try USDT.
        const ixs = await tryBuildTransitive(USDT_PUBKEY);
        tx.add(...ixs);
      }
    }

    // Send the constructed transaction to the cluster.
    return await this.program.provider.send(tx);
  }

  /**
   * Executes a swap against the Serum DEX on Solana. When using one should
   * first use `estimate` along with a user defined error tolerance to calculate
   * the `minExpectedSwapAmount`, which provides a lower bound for the number
   * of output tokens received when executing the swap. If, for example,
   * swapping on an illiquid market and the output tokens is less than
   * `minExpectedSwapAmount`, then the transaction will fail in an attempt to
   * prevent an undesireable outcome.
   */
  public async swap(params: SwapParams): Promise<TransactionSignature> {
    const [ixs, signers] = await this.swapIxs(params);
    const tx = new Transaction();
    tx.add(...ixs);
    return this.program.provider.send(tx, signers, params.options);
  }

  /**
   * Returns an estimate for the number of *to*, i.e., output, tokens one would
   * get for the given swap parameters. This is useful to inform the user
   * approximately what will happen if the user executes the swap trade. UIs
   * should use this in conjunction with some bound (e.g. 5%), to prevent users
   * from making unexpected trades.
   */
  public async estimate(params: EstimateSwapParams): Promise<BN> {
    // Build the transaction.
    const [ixs, signers] = await this.swapIxs({
      ...params,
      minExpectedSwapAmount: new BN(1),
    });
    const tx = new Transaction();
    tx.add(...ixs);

    // Simulate it.
    const resp = await this.program.provider.simulate(
      tx,
      signers,
      params.options,
    );
    if (resp === undefined || resp.value.err || !resp.value.logs) {
      throw new Error('Unable to simulate swap');
    }

    // Decode the return value.
    //
    // TODO: Expose the event parsing api in anchor to make this less manual.
    let didSwapEvent = resp.value.logs
      .filter((log) => log.startsWith('Program log: 4ZfIrPLY4R'))
      .map((log) => {
        const logStr = log.slice('Program log: '.length);
        const logArr = Buffer.from(base64.toByteArray(logStr));
        return this.program.coder.events.decode('DidSwap', logArr.slice(8));
      })[0];
    return didSwapEvent.toAmount;
  }

  private async swapIxs(
    params: SwapParams,
  ): Promise<[TransactionInstruction[], Account[]]> {
    let {
      fromMint,
      toMint,
      quoteWallet,
      fromWallet,
      toWallet,
      amount,
      minExpectedSwapAmount,
      referral,
    } = params;

    // Defaults to .5% error off the estimate, if not provided.
    if (minExpectedSwapAmount === undefined) {
      const estimated = await this.estimate(params);
      minExpectedSwapAmount = estimated.mul(new BN(99.5)).div(new BN(100));
    }

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
      return await this.swapDirectIxs({
        coinWallet: toWallet,
        pcWallet: fromWallet,
        baseMint: toMint,
        quoteMint: fromMint,
        side: Side.Bid,
        amount,
        minExpectedSwapAmount,
        referral,
      });
    } else if (toMint.equals(USDC_PUBKEY) || toMint.equals(USDT_PUBKEY)) {
      return await this.swapDirectIxs({
        coinWallet: fromWallet,
        pcWallet: toWallet,
        baseMint: fromMint,
        quoteMint: toMint,
        side: Side.Ask,
        amount,
        minExpectedSwapAmount,
        referral,
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
    return await this.swapTransitiveIxs({
      fromMint,
      toMint,
      fromWallet,
      toWallet,
      pcWallet: quoteWallet,
      amount,
      minExpectedSwapAmount,
      referral,
    });
  }

  private async swapDirectIxs({
    coinWallet,
    pcWallet,
    baseMint,
    quoteMint,
    side,
    amount,
    minExpectedSwapAmount,
    referral,
  }: {
    coinWallet: PublicKey;
    pcWallet: PublicKey;
    baseMint: PublicKey;
    quoteMint: PublicKey;
    side: SideEnum;
    amount: BN;
    minExpectedSwapAmount: BN;
    referral?: PublicKey;
  }): Promise<[TransactionInstruction[], Account[]]> {
    const marketClient = await Market.load(
      this.program.provider.connection,
      this.swapMarkets.getMarketAddress(quoteMint, baseMint),
      this.program.provider.opts,
      DEX_PID,
    );
    const [vaultSigner] = await getVaultOwnerAndNonce(marketClient.address);
    let openOrders = await (async () => {
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

    const needsOpenOrders = openOrders === undefined;

    const ixs: TransactionInstruction[] = [];
    const signers: Account[] = [];

    // Create the open orders account, if needed.
    if (needsOpenOrders) {
      const oo = new Account();
      signers.push(oo);
      openOrders = oo.publicKey;
      ixs.push(
        await OpenOrders.makeCreateAccountTransaction(
          this.program.provider.connection,
          marketClient.address,
          this.program.provider.wallet.publicKey,
          oo.publicKey,
          DEX_PID,
        ),
      );
    }
    ixs.push(
      this.program.instruction.swap(side, amount, minExpectedSwapAmount, {
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
        remainingAccounts: referral && [referral],
      }),
    );

    // TOOD: enable once the DEX supports closing open orders accounts.
    const _enabled = false;
    // If an account was opened for this swap, then close it in the same
    // transaction.
    if (_enabled && needsOpenOrders) {
      ixs.push(
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

    return [ixs, signers];
  }

  private async swapTransitiveIxs({
    fromMint,
    toMint,
    fromWallet,
    toWallet,
    pcWallet,
    amount,
    minExpectedSwapAmount,
    referral,
  }: {
    fromMint: PublicKey;
    toMint: PublicKey;
    fromWallet: PublicKey;
    toWallet: PublicKey;
    pcWallet: PublicKey;
    amount: BN;
    minExpectedSwapAmount: BN;
    referral?: PublicKey;
  }): Promise<[TransactionInstruction[], Account[]]> {
    let fromMarket: PublicKey, toMarket: PublicKey;
    try {
      // Try USDC path.
      fromMarket = this.swapMarkets.getMarketAddress(USDC_PUBKEY, fromMint);
      toMarket = this.swapMarkets.getMarketAddress(USDC_PUBKEY, toMint);
    } catch (err) {
      // USDC path doesn't exist. Try USDT.
      fromMarket = this.swapMarkets.getMarketAddress(USDT_PUBKEY, fromMint);
      toMarket = this.swapMarkets.getMarketAddress(USDT_PUBKEY, toMint);
    }
    const [fromMarketClient, toMarketClient] = await Promise.all([
      Market.load(
        this.program.provider.connection,
        fromMarket,
        this.program.provider.opts,
        DEX_PID,
      ),
      Market.load(
        this.program.provider.connection,
        toMarket,
        this.program.provider.opts,
        DEX_PID,
      ),
    ]);
    const [fromVaultSigner] = await getVaultOwnerAndNonce(
      fromMarketClient.address,
    );
    const [toVaultSigner] = await getVaultOwnerAndNonce(toMarketClient.address);
    const [fromOpenOrders, toOpenOrders] = await (async () => {
      let [fromOpenOrders, toOpenOrders] = await Promise.all([
        OpenOrders.findForMarketAndOwner(
          this.program.provider.connection,
          fromMarketClient.address,
          this.program.provider.wallet.publicKey,
          DEX_PID,
        ),
        OpenOrders.findForMarketAndOwner(
          this.program.provider.connection,
          toMarketClient.address,
          this.program.provider.wallet.publicKey,
          DEX_PID,
        ),
      ]);
      // If we have an open orders account use it. It doesn't matter which
      // one we use.
      return [
        fromOpenOrders[0] ? fromOpenOrders[0].address : undefined,
        toOpenOrders[0] ? toOpenOrders[0].address : undefined,
      ];
    })();
    const fromNeedsOpenOrders = fromOpenOrders === undefined;
    const toNeedsOpenOrders = toOpenOrders === undefined;

    const ixs: TransactionInstruction[] = [];
    const signers: Account[] = [];

    // Add instruction to batch create all open orders accounts, if needed.
    let accounts: Account[] = [];
    if (fromNeedsOpenOrders || true) {
      const oo = new Account();
      signers.push(oo);
      accounts.push(oo);
    }
    if (toNeedsOpenOrders || true) {
      const oo = new Account();
      signers.push(oo);
      accounts.push(oo);
    }
    if (fromNeedsOpenOrders || toNeedsOpenOrders || true) {
      let remainingAccounts = accounts.map((a) => {
        return {
          pubkey: a.publicKey,
          isSigner: true,
          isWritable: true,
        };
      });
      const openOrdersSize = 200;
      const lamports = new BN(
        await this.program.provider.connection.getMinimumBalanceForRentExemption(
          openOrdersSize,
        ),
      );
      // ixs.push(
      // 	this.createAccountsProgram.instruction.createAccounts({
      // 		accounts: {
      // 			funding: this.program.provider.wallet.publicKey,
      // 			owner: DEX_PID,
      // 			systemProgram: SystemProgram.programId,
      // 		},
      // 		remainingAccounts,
      // 	}),
      // );
    }

    ixs.push(
      this.program.instruction.swapTransitive(amount, minExpectedSwapAmount, {
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
        remainingAccounts: referral && [referral],
      }),
    );

    return [ixs, signers];
  }
}

/**
 * Parameters to initailize swap accounts.
 */
export type InitSwapAccountParams = {
  /**
   * The token to swap from.
   */
  fromMint: PublicKey;
  /**
   * The token tos wap to.
   */
  toMint: PublicKey;
};

/**
 * Parameters to close swap accounts.
 */
export type CloseSwapAccountParams = {
  /**
   * The token to swap from.
   */
  fromMint: PublicKey;
  /**
   * The token tos wap to.
   */
  toMint: PublicKey;
};

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
   * The minimum number of `toMint` tokens one should receive for the swap. This
   * is a safety mechanism to prevent one from performing an unexpecteed trade.
   *
   * If not given, then defaults to 0.05% off the **estimated** amount.
   */
  minExpectedSwapAmount?: BN;

  /**
   * Token account to receive the Serum referral fee. The mint must be in the
   * quote currency of the trade.
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
   * RPC options. If not given the options on the program's provider are used.
   */
  options?: ConfirmOptions;
};

export type EstimateSwapParams = SwapParams;

// Side rust enum used for the program's RPC API.
type SideEnum = any;
const Side = {
  Bid: { bid: {} },
  Ask: { ask: {} },
};

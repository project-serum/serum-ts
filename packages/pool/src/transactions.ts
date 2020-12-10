import {
  PoolInfo,
  PoolInstructions,
  RETBUF_PROGRAM_ID,
  SERUM_FEE_OWNER_ADDRESS,
  UserInfo,
} from './instructions';
import {
  Account,
  AccountMeta,
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
} from '@solana/web3.js';
import { TokenInstructions } from '@project-serum/serum';
import { Basket, PoolAction } from './schema';
import BN from 'bn.js';
import {
  createAssociatedTokenAccount,
  getAssociatedTokenAddress,
} from '@project-serum/associated-token';

export interface TransactionAndSigners {
  transaction: Transaction;
  /**
   * Auto-generated accounts that need to sign the transaction. Note that this does not include
   * the user (fee payer and spl-token owner) account.
   */
  signers: Account[];
}

export interface SimplePoolParams {
  /** Connection to use to fetch fees. */
  connection: Connection;

  /** Program ID of the pool program. */
  programId: PublicKey;

  /** Size of pool state account, in bytes. */
  poolStateSpace: number;

  /** User-friendly name for the pool. */
  poolName: string;

  /**
   * Number of decimals for the to-be-created pool token.
   *
   * Defaults to 6.
   */
  poolMintDecimals?: number;
  /** Mint addresses for the tokens in the pool. */
  assetMints: PublicKey[];

  /**
   * Initial quantity of outstanding tokens, sent to the pool creator.
   *
   * Defaults to `10 ** poolMintDecimals`.
   */
  initialPoolMintSupply?: BN;
  /** Initial quantities of assets in the pool, sent from the pool creator. */
  initialAssetQuantities: BN[];

  /**
   * Owner for the spl-token accounts from which the initial pool assets are
   * taken and to which the newly created pool tokens are sent.
   */
  creator: PublicKey;
  /** Spl-token accounts from which the initial pool assets are taken. */
  creatorAssets: PublicKey[];

  /** Fee rate for creations and redemptions, times 10 ** 6. */
  feeRate?: number;

  /** Any additional accounts needed to initalize the pool. */
  additionalAccounts?: AccountMeta[];
}

/**
 * High-level API for constructing transactions to interact with pools.
 *
 * For a lower-level API, see {@link PoolInstructions}.
 */
export class PoolTransactions {
  /**
   * Transaction to initialize a simple pool.
   *
   * This will:
   * - initialize a new pool token mint
   * - initialize a pool token account for the creator and mint some tokens to it
   * - initialize vault accounts for each of the pool assets
   * - transfer assets from the pool creator to the vault accounts
   * - initialize the pool
   */
  static async initializeSimplePool(
    params: SimplePoolParams,
  ): Promise<[PublicKey, TransactionAndSigners[]]> {
    const {
      connection,
      programId,
      poolStateSpace,
      poolMintDecimals = 6,
      poolName,
      assetMints,
      initialPoolMintSupply = new BN('1' + '0'.repeat(poolMintDecimals)),
      initialAssetQuantities,
      creator,
      creatorAssets,
      feeRate = 2500,
      additionalAccounts = [],
    } = params;
    if (assetMints.length !== initialAssetQuantities.length) {
      throw new Error(
        'assetMints and initialAssetQuantities must have the same length',
      );
    }
    if (assetMints.length !== creatorAssets.length) {
      throw new Error('assetMints and creatorAssets must have the same length');
    }

    const poolStateAccount = new Account();
    const [vaultSigner, vaultSignerNonce] = await PublicKey.findProgramAddress(
      [poolStateAccount.publicKey.toBuffer()],
      programId,
    );
    const poolTokenMint = new Account();
    const creatorPoolTokenAddress = await getAssociatedTokenAddress(
      creator,
      poolTokenMint.publicKey,
    );
    const vaultAddresses = await Promise.all(
      assetMints.map(mint => getAssociatedTokenAddress(vaultSigner, mint)),
    );
    const serumFeeAddress = await getAssociatedTokenAddress(
      SERUM_FEE_OWNER_ADDRESS,
      poolTokenMint.publicKey,
    );

    // Split into two transactions to stay under the size limit.
    // Ideally all instructions that transfer tokens happen in the second transaction,
    // so they get reverted if the pool creation fails.
    const setup = {
      transaction: new Transaction(),
      signers: [poolTokenMint],
    };
    const finalize = {
      transaction: new Transaction(),
      signers: [poolStateAccount],
    };

    const mintAccountSpace = 82;
    const mintAccountLamports = await connection.getMinimumBalanceForRentExemption(
      mintAccountSpace,
    );

    // Initialize pool token.
    setup.transaction.add(
      SystemProgram.createAccount({
        fromPubkey: creator,
        newAccountPubkey: poolTokenMint.publicKey,
        space: mintAccountSpace,
        lamports: mintAccountLamports,
        programId: TokenInstructions.TOKEN_PROGRAM_ID,
      }),
      TokenInstructions.initializeMint({
        mint: poolTokenMint.publicKey,
        decimals: poolMintDecimals,
        mintAuthority: creator,
      }),
      await createAssociatedTokenAccount(
        creator,
        creator,
        poolTokenMint.publicKey,
      ),
      await createAssociatedTokenAccount(
        creator,
        SERUM_FEE_OWNER_ADDRESS,
        poolTokenMint.publicKey,
      ),
    );
    finalize.transaction.add(
      TokenInstructions.mintTo({
        mint: poolTokenMint.publicKey,
        destination: creatorPoolTokenAddress,
        amount: initialPoolMintSupply,
        mintAuthority: creator,
      }),
      TokenInstructions.setAuthority({
        target: poolTokenMint.publicKey,
        currentAuthority: creator,
        newAuthority: vaultSigner,
        authorityType: 0, // AuthorityType::MintTokens
      }),
    );

    // Initialize vault accounts.
    await Promise.all(
      assetMints.map(async (mint, index) => {
        const vault = vaultAddresses[index];
        setup.transaction.add(
          await createAssociatedTokenAccount(creator, vaultSigner, mint),
        );
        finalize.transaction.add(
          TokenInstructions.transfer({
            source: creatorAssets[index],
            destination: vault,
            amount: initialAssetQuantities[index],
            owner: creator,
          }),
        );
      }),
    );

    // Initialize pool account.
    finalize.transaction.add(
      SystemProgram.createAccount({
        fromPubkey: creator,
        newAccountPubkey: poolStateAccount.publicKey,
        space: poolStateSpace,
        lamports: await connection.getMinimumBalanceForRentExemption(
          poolStateSpace,
        ),
        programId: programId,
      }),
      PoolInstructions.initialize(
        programId,
        poolStateAccount.publicKey,
        poolTokenMint.publicKey,
        poolName,
        vaultAddresses,
        vaultSigner,
        vaultSignerNonce,
        serumFeeAddress,
        creatorPoolTokenAddress,
        feeRate,
        additionalAccounts,
      ),
    );

    return [poolStateAccount.publicKey, [setup, finalize]];
  }

  /**
   * Transaction to get a pool basket, for use with simulateTransaction.
   *
   * This is a wrapper around {@link PoolInstructions.getBasket} that handles
   * initializing the retbuf account.
   *
   * @param pool Pool to interact with.
   * @param action Creation, redemption, or swap.
   * @param payer Payer for fees. Must have nonzero SOL but will not be charged
   * if the transaction is only simulated.
   */
  static getBasket(
    pool: PoolInfo,
    action: PoolAction,
    payer: PublicKey,
  ): TransactionAndSigners {
    const transaction = new Transaction();
    const retbufAccount = new Account();
    transaction.add(
      SystemProgram.createAccount({
        fromPubkey: payer,
        newAccountPubkey: retbufAccount.publicKey,
        lamports: 0,
        space: 1024,
        programId: RETBUF_PROGRAM_ID,
      }),
    );
    transaction.add(
      PoolInstructions.getBasket(pool, action, retbufAccount.publicKey),
    );
    transaction.feePayer = payer;
    return { transaction, signers: [retbufAccount] };
  }

  /**
   * Transaction to execute a creation, redemption, or swap.
   *
   * This is a wrapper around {@link PoolInstructions.execute} that handles
   * token delegation.
   *
   * The transaction will create a temporary account, delegate tokens to it,
   * and use it in place of the actual owner, to limit the quantity of tokens
   * that the pool can pull from the user's accounts.
   *
   * @param pool Pool to interact with.
   * @param action Creation, redemption, or swap.
   * @param user Token accounts to pull funds from or send funds to.
   * @param expectedBasket Expected basket. Used to determine the quantity of
   * tokens to approve.
   */
  static execute(
    pool: PoolInfo,
    action: PoolAction,
    user: UserInfo,
    expectedBasket: Basket,
  ): TransactionAndSigners {
    if (expectedBasket.quantities.length !== pool.state.assets.length) {
      throw new Error(
        'expectedBasket must have the same number of components as the pool',
      );
    }
    const transaction = new Transaction();
    const delegate = new Account();
    const signers = [delegate];
    user = { ...user, assetAccounts: user.assetAccounts.slice() };
    let wrappedSolAccount: Account | null = null;

    function approveDelegate(amount: BN, index: number, approveZero = false) {
      if (
        user.assetAccounts[index].equals(user.owner) &&
        pool.state.assets[index].mint.equals(TokenInstructions.WRAPPED_SOL_MINT)
      ) {
        wrappedSolAccount = new Account();
        signers.push(wrappedSolAccount);
        transaction.add(
          SystemProgram.createAccount({
            fromPubkey: user.owner,
            newAccountPubkey: wrappedSolAccount.publicKey,
            lamports: amount.toNumber() + 2.04e6,
            space: 165,
            programId: TokenInstructions.TOKEN_PROGRAM_ID,
          }),
          TokenInstructions.initializeAccount({
            account: wrappedSolAccount.publicKey,
            mint: TokenInstructions.WRAPPED_SOL_MINT,
            owner: delegate.publicKey,
          }),
        );
        user.assetAccounts[index] = wrappedSolAccount.publicKey;
      } else if (amount.gtn(0) || approveZero) {
        transaction.add(
          TokenInstructions.approve({
            owner: user.owner,
            source: user.assetAccounts[index],
            delegate: delegate.publicKey,
            amount,
          }),
        );
      }
    }

    if ('create' in action) {
      expectedBasket.quantities.forEach((amount, index) => {
        approveDelegate(amount, index, true);
      });
    } else if ('redeem' in action) {
      transaction.add(
        TokenInstructions.approve({
          owner: user.owner,
          source: user.poolTokenAccount,
          delegate: delegate.publicKey,
          amount: action.redeem,
        }),
      );
      expectedBasket.quantities.forEach((amount, index) => {
        if (amount.isNeg()) {
          approveDelegate(amount.abs(), index);
        } else {
          approveDelegate(new BN(0), index);
        }
      });
    } else if ('swap' in action) {
      action.swap.quantities.forEach((amount, index) => {
        approveDelegate(amount, index);
      });
    }
    transaction.add(
      PoolInstructions.execute(pool, action, {
        ...user,
        owner: delegate.publicKey,
      }),
    );
    if (wrappedSolAccount) {
      transaction.add(
        TokenInstructions.closeAccount({
          source: wrappedSolAccount!.publicKey,
          destination: user.owner,
          owner: delegate.publicKey,
        }),
      );
    }
    return { transaction, signers };
  }
}

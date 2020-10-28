import {
  PoolInfo,
  PoolInstructions,
  RETBUF_PROGRAM_ID,
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
import { TOKEN_PROGRAM_ID } from '@project-serum/serum/lib/token-instructions';

export interface TransactionAndSigners {
  transaction: Transaction;
  signers: Account[];
}

export interface SimplePoolParams {
  /** Connection to use to fetch fees. */
  connection: Connection;

  /** Program ID of the pool program. */
  programId: PublicKey;

  /** Uninitialized account to use as the new pool account. */
  poolStateAccount: Account;
  /** Size of pool state account, in bytes. */
  poolStateSpace: number;

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
  /** Spl-token accounts from which the inital pool assets are taken. */
  creatorAssets: PublicKey[];

  /** Any additional accounts needed to initalize the pool. */
  additionalAccounts?: AccountMeta[];
}

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
  ): Promise<TransactionAndSigners> {
    const {
      connection,
      programId,
      poolStateAccount,
      poolStateSpace,
      poolMintDecimals = 6,
      assetMints,
      initialPoolMintSupply = new BN('1e' + poolMintDecimals),
      initialAssetQuantities,
      creator,
      creatorAssets,
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

    const [vaultSigner, vaultSignerNonce] = await PublicKey.findProgramAddress(
      [poolStateAccount.publicKey.toBuffer()],
      programId,
    );
    const poolTokenMint = new Account();
    const creatorPoolTokenAccount = new Account();
    const transaction = new Transaction();
    const signers = [poolStateAccount, poolTokenMint, creatorPoolTokenAccount];

    const tokenAccountSpace = 165;
    const tokenAccountLamports = await connection.getMinimumBalanceForRentExemption(
      tokenAccountSpace,
    );

    // Initialize pool token.
    transaction.add(
      SystemProgram.createAccount({
        fromPubkey: creator,
        newAccountPubkey: poolTokenMint.publicKey,
        space: 82,
        lamports: await connection.getMinimumBalanceForRentExemption(82),
        programId: TOKEN_PROGRAM_ID,
      }),
      TokenInstructions.initializeMint({
        mint: poolTokenMint.publicKey,
        decimals: poolMintDecimals,
        mintAuthority: creator,
      }),
      SystemProgram.createAccount({
        fromPubkey: creator,
        newAccountPubkey: creatorPoolTokenAccount.publicKey,
        space: tokenAccountSpace,
        lamports: tokenAccountLamports,
        programId: TOKEN_PROGRAM_ID,
      }),
      TokenInstructions.mintTo({
        mint: poolTokenMint.publicKey,
        destination: creatorPoolTokenAccount.publicKey,
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
    const vaults: PublicKey[] = [];
    assetMints.forEach((mint, index) => {
      const vault = new Account();
      transaction.add(
        SystemProgram.createAccount({
          fromPubkey: creator,
          newAccountPubkey: vault.publicKey,
          space: tokenAccountSpace,
          lamports: tokenAccountLamports,
          programId: TOKEN_PROGRAM_ID,
        }),
        TokenInstructions.initializeAccount({
          account: vault.publicKey,
          mint,
          owner: vaultSigner,
        }),
        TokenInstructions.transfer({
          source: creatorAssets[index],
          destination: vault.publicKey,
          amount: initialAssetQuantities[index],
          owner: creator,
        }),
      );
      vaults.push(vault.publicKey);
      signers.push(vault);
    });

    // Initialize pool account.
    transaction.add(
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
        vaults,
        vaultSigner,
        vaultSignerNonce,
        additionalAccounts,
      ),
    );

    return { transaction, signers };
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
    const transaction = new Transaction();
    const delegate = new Account();
    if ('create' in action) {
      expectedBasket.quantities.forEach((amount, index) => {
        transaction.add(
          TokenInstructions.approve({
            owner: user.owner,
            source: user.assetAccounts[index],
            delegate: delegate.publicKey,
            amount,
          }),
        );
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
          transaction.add(
            TokenInstructions.approve({
              owner: user.owner,
              source: user.assetAccounts[index],
              delegate: delegate.publicKey,
              amount: amount.abs(),
            }),
          );
        }
      });
    } else if ('swap' in action) {
      action.swap.quantities.forEach((amount, index) => {
        transaction.add(
          TokenInstructions.approve({
            owner: user.owner,
            source: user.assetAccounts[index],
            delegate: delegate.publicKey,
            amount,
          }),
        );
      });
    }
    transaction.add(
      PoolInstructions.execute(pool, action, {
        ...user,
        owner: delegate.publicKey,
      }),
    );
    return { transaction, signers: [delegate] };
  }
}

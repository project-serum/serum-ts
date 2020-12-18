import {
  AccountMeta,
  PublicKey,
  SYSVAR_RENT_PUBKEY,
  TransactionInstruction,
} from '@solana/web3.js';
import { encodePoolRequest, PoolAction, PoolState } from './schema';
import { TOKEN_PROGRAM_ID } from '@project-serum/token';

export interface PoolInfo {
  address: PublicKey;
  state: PoolState;
  program: PublicKey;
}

export interface UserInfo {
  /**  spl-token account for the {@link PoolState.poolTokenMint pool token}. */
  poolTokenAccount: PublicKey;
  /**
   *  spl-token account for each of the {@link PoolState.assets assets} in the
   *  pool.
   */
  assetAccounts: PublicKey[];
  /**
   *  Owner or delegate of the token accounts.
   */
  owner: PublicKey;
  /**
   * Optional spl-token account to which referral fees should be sent.
   */
  referrer?: PublicKey;
}

export const RETBUF_PROGRAM_ID = new PublicKey(
  // TODO: switch to shmem4EWT2sPdVGvTZCzXXRAURL9G5vpPxNwSeKhHUL once that exists on mainnet
  'BYVBQ71CYArTNbEpDnsPCjcoWkJL9181xvj52kfyFFHg',
);

export const LQD_FEE_OWNER_ADDRESS = new PublicKey(
  '3LTvJCPiPSMjX1kBJ6ZfEhn4G2hM46aJ1yEZsk8i12TK',
);

/**
 * Low-level API for constructing and encoding pool instructions.
 *
 * For a higher-level API that handles initializing accounts and approving token
 * transfers, use {@link PoolTransactions}.
 */
export class PoolInstructions {
  /**
   * Instruction to initialize a pool.
   *
   * @param poolProgram Program ID of the pool program.
   * @param poolAccount Newly-created account to hold the pool state. Must be
   * owned by the pool program.
   * @param poolTokenMint spl-token mint address for the pool token.
   * @param poolName User-friendly name for the pool.
   * @param vaults spl-token account for each of the assets in the pool.
   * @param vaultSigner Mint authority for `poolTokenMint` and owner of
   * `poolTokenMint`.
   * @param vaultSignerNonce Nonce used to generate `vaultSigner`.
   * @param lqdFeeAccount Pool token spl-token account owned by the LQD fee owner.
   * @param initializerFeeAccount Pool token spl-token account owned by the pool initializer.
   * @param feeRate Fee rate for creations/redemptions times 10^6.
   * @param additionalAccounts Any custom pool-specific accounts needed to
   * initialize the pool.
   * @param customData Any custom pool-specific data needed to initialize the pool
   */
  static initialize(
    poolProgram: PublicKey,
    poolAccount: PublicKey,
    poolTokenMint: PublicKey,
    poolName: string,
    vaults: PublicKey[],
    vaultSigner: PublicKey,
    vaultSignerNonce: number,
    lqdFeeAccount: PublicKey,
    initializerFeeAccount: PublicKey,
    feeRate: number,
    additionalAccounts?: AccountMeta[],
    customData?: Buffer,
  ): TransactionInstruction {
    return new TransactionInstruction({
      keys: [
        { pubkey: poolAccount, isSigner: false, isWritable: true },
        { pubkey: poolTokenMint, isSigner: false, isWritable: true },
        ...vaults.map(vaultAddress => ({
          pubkey: vaultAddress,
          isSigner: false,
          isWritable: true,
        })),
        { pubkey: vaultSigner, isSigner: false, isWritable: false },
        { pubkey: lqdFeeAccount, isSigner: false, isWritable: false },
        { pubkey: initializerFeeAccount, isSigner: false, isWritable: false },
        {
          pubkey: SYSVAR_RENT_PUBKEY,
          isSigner: false,
          isWritable: false,
        },
        ...(additionalAccounts ?? []),
      ],
      programId: poolProgram,
      data: encodePoolRequest({
        initialize: {
          vaultSignerNonce,
          assetsLength: vaults.length,
          poolName,
          feeRate,
          customData: customData ?? Buffer.alloc(0),
        },
      }),
    });
  }

  /**
   * Instruction to get the expected basket for a {@link PoolAction}.
   *
   * For creations, the basket is the quantity of each asset
   * that need to be sent to the pool to process the creation.  For redemptions
   * and swaps, the basket is the quantity of each asset that will be
   * transferred from the pool to the user after the redemption or swap.
   *
   * Negative quantities will cause tokens to be transferred in the opposite
   * direction.
   *
   * @param pool
   * @param action Creation, redemption, or swap.
   * @param retbufAccount Account to which the basket will be written. Must be
   * owned by the retbuf program.
   */
  static getBasket(
    pool: PoolInfo,
    action: PoolAction,
    retbufAccount: PublicKey,
  ): TransactionInstruction {
    return new TransactionInstruction({
      keys: [
        { pubkey: pool.address, isSigner: false, isWritable: false },
        {
          pubkey: pool.state.poolTokenMint,
          isSigner: false,
          isWritable: false,
        },
        ...pool.state.assets.map(assetInfo => ({
          pubkey: assetInfo.vaultAddress,
          isSigner: false,
          isWritable: false,
        })),
        { pubkey: pool.state.vaultSigner, isSigner: false, isWritable: false },
        { pubkey: retbufAccount, isSigner: false, isWritable: true },
        { pubkey: RETBUF_PROGRAM_ID, isSigner: false, isWritable: false },
        ...pool.state.accountParams.map(paramInfo => ({
          pubkey: paramInfo.address,
          isSigner: false,
          isWritable: false,
        })),
      ],
      programId: pool.program,
      data: encodePoolRequest({ getBasket: action }),
    });
  }

  /**
   * Instruction to execute a creation, redemption, or swap.
   *
   * @param pool
   * @param action Creation, redemption, or swap.
   * @param user Token accounts to pull funds from or send funds to.
   */
  static execute(
    pool: PoolInfo,
    action: PoolAction,
    user: UserInfo,
  ): TransactionInstruction {
    return new TransactionInstruction({
      keys: [
        { pubkey: pool.address, isSigner: false, isWritable: true },
        { pubkey: pool.state.poolTokenMint, isSigner: false, isWritable: true },
        ...pool.state.assets.map(assetInfo => ({
          pubkey: assetInfo.vaultAddress,
          isSigner: false,
          isWritable: true,
        })),
        { pubkey: pool.state.vaultSigner, isSigner: false, isWritable: false },
        { pubkey: user.poolTokenAccount, isSigner: false, isWritable: true },
        ...user.assetAccounts.map(address => ({
          pubkey: address,
          isSigner: false,
          isWritable: true,
        })),
        { pubkey: user.owner, isSigner: true, isWritable: false },
        {
          pubkey: pool.state.lqdFeeVault,
          isSigner: false,
          isWritable: true,
        },
        {
          pubkey: pool.state.initializerFeeVault,
          isSigner: false,
          isWritable: true,
        },
        {
          pubkey: user.referrer ?? pool.state.lqdFeeVault,
          isSigner: false,
          isWritable: true,
        },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        ...pool.state.accountParams.map(paramInfo => ({
          pubkey: paramInfo.address,
          isSigner: false,
          isWritable: paramInfo.writable,
        })),
      ],
      programId: pool.program,
      data: encodePoolRequest({ execute: action }),
    });
  }
}

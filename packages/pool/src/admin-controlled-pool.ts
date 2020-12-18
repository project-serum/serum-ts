import { struct, u32 } from 'buffer-layout';
import { Layout, rustEnum, tagged, u64 } from '@project-serum/borsh';
import {
  AccountMeta,
  PublicKey,
  TransactionInstruction,
} from '@solana/web3.js';
import BN from 'bn.js';
import { PoolInfo } from './instructions';
import { TOKEN_PROGRAM_ID } from '@project-serum/token';

export type AdminRequest =
  | { pause: any }
  | { unpause: any }
  | { approveDelegate: { amount: BN } }
  | { addAsset: any }
  | { removeAsset: any }
  | { updateFee: { feeRate: number } }
  | { updateAdmin: any };

export const ADMIN_INSTRUCTION_TAG = new BN('31e6452361a17878', 'hex');

export const AdminRequest: Layout<AdminRequest> = tagged(
  ADMIN_INSTRUCTION_TAG,
  rustEnum([
    struct([], 'pause'),
    struct([], 'unpause'),
    struct([u64('amount')], 'approveDelegate'),
    struct([], 'addAsset'),
    struct([], 'removeAsset'),
    struct([u32('feeRate')], 'updateFee'),
    struct([], 'updateAdmin'),
  ]),
);

function encodeAdminRequest(request: AdminRequest): Buffer {
  const buffer = Buffer.alloc(1000);
  const len = AdminRequest.encode(request, buffer);
  return buffer.slice(0, len);
}

function makeAdminInstruction(
  pool: PoolInfo,
  request: AdminRequest,
  keys?: Array<AccountMeta>,
): TransactionInstruction {
  if (!pool.state.adminKey) {
    throw new Error('Pool does not have admin');
  }
  return new TransactionInstruction({
    keys: [
      { pubkey: pool.address, isSigner: false, isWritable: true },
      { pubkey: pool.state.adminKey, isSigner: true, isWritable: false },
      ...(keys ?? []),
    ],
    programId: pool.program,
    data: encodeAdminRequest(request),
  });
}

/** Instructions for interacting with the example admin-controlled pool. */
export class AdminControlledPoolInstructions {
  /** Pauses creations and redemptions for the pool. */
  static pause(pool: PoolInfo): TransactionInstruction {
    return makeAdminInstruction(pool, { pause: {} });
  }
  /**
   * Resumes creations and redemptions for the pool.
   *
   * Pool assets must not have any outstanding delegates.
   */
  static unpause(pool: PoolInfo): TransactionInstruction {
    return makeAdminInstruction(
      pool,
      { unpause: {} },
      pool.state.assets.map(asset => ({
        pubkey: asset.vaultAddress,
        isSigner: false,
        isWritable: false,
      })),
    );
  }

  /** Approves an account to spend tokens on behalf of the pool. */
  static approveDelegate(
    pool: PoolInfo,
    vault: PublicKey,
    delegate: PublicKey,
    amount: BN,
  ): TransactionInstruction {
    return makeAdminInstruction(pool, { approveDelegate: { amount } }, [
      { pubkey: vault, isSigner: false, isWritable: true },
      { pubkey: delegate, isSigner: false, isWritable: false },
      { pubkey: pool.state.vaultSigner, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ]);
  }

  /** Adds a new asset to the pool. */
  static addAsset(pool: PoolInfo, vault: PublicKey): TransactionInstruction {
    return makeAdminInstruction(pool, { addAsset: {} }, [
      { pubkey: vault, isSigner: false, isWritable: false },
    ]);
  }

  /**
   * Removes an asset from the pool.
   *
   * The pool must not currently own any tokens of the asset to be removed.
   */
  static removeAsset(pool: PoolInfo, vault: PublicKey): TransactionInstruction {
    return makeAdminInstruction(pool, { removeAsset: {} }, [
      { pubkey: vault, isSigner: false, isWritable: false },
    ]);
  }

  /** Modifies the fee rate for the pool. */
  static updateFee(pool: PoolInfo, feeRate: number): TransactionInstruction {
    return makeAdminInstruction(pool, { updateFee: { feeRate } });
  }

  /** Transfers admin permission for the pool to a new account. */
  static updateAdmin(
    pool: PoolInfo,
    newAdmin: PublicKey,
  ): TransactionInstruction {
    return makeAdminInstruction(pool, { updateAdmin: {} }, [
      { pubkey: newAdmin, isSigner: true, isWritable: false },
    ]);
  }
}

export const ADMIN_CONTROLLED_POOL_TAG = new BN('4a3ab7f76f93f94e', 'hex');

export function isAdminControlledPool(pool: PoolInfo): boolean {
  return pool.state.customState
    .slice(0, 8)
    .equals(ADMIN_CONTROLLED_POOL_TAG.toArrayLike(Buffer, 'le', 8));
}

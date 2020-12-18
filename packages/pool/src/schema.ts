import { struct, u32, u8 } from 'buffer-layout';
import {
  bool,
  i64,
  Layout,
  option,
  publicKey,
  rustEnum,
  str,
  tagged,
  u64,
  vec,
  vecU8,
} from '@project-serum/borsh';
import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';

/**
 * Decoded pool state.
 */
export interface PoolState {
  /** Token mint address for the pool token. */
  poolTokenMint: PublicKey;
  /** Assets in the pool. */
  assets: AssetInfo[];
  /** Owner of the assets in the pool. */
  vaultSigner: PublicKey;
  /** Nonce used to generate `vaultSigner`; only used internally by the pool program. */
  vaultSignerNonce: number;
  /** Accounts that must be included in requests to create or redeem tokens. */
  accountParams: ParamDesc[];
  /** User-friendly name for the pool. */
  name: string;
  /** Token vault address for fees collected by the pool for LQD. */
  lqdFeeVault: PublicKey;
  /** Token vault address for fees collected by the pool for the pool initializer. */
  initializerFeeVault: PublicKey;
  /** Fee on creations/redemptions, times 10^6. */
  feeRate: number;
  /** Admin for the pool. Not used by default but may have pool-specific semantics. */
  adminKey: PublicKey | null;
  /** Custom pool-specific state. */
  customState: Buffer;
}

/** Describes one of the assets in the pool. */
export interface AssetInfo {
  /** Token mint address for the asset. */
  mint: PublicKey;
  /** Token vault address for the asset. */
  vaultAddress: PublicKey;
}

export interface ParamDesc {
  address: PublicKey;
  writable: boolean;
}

export type PoolRequest =
  | { initialize: InitializePoolRequest }
  | { getBasket: PoolAction }
  | { execute: PoolAction };

export interface InitializePoolRequest {
  vaultSignerNonce: number;
  assetsLength: number;
  poolName: string;
  feeRate: number;
  customData: Buffer;
}

export type PoolAction = { create: BN } | { redeem: BN } | { swap: Basket };

export interface Basket {
  quantities: BN[];
}

export const AssetInfo: Layout<AssetInfo> = struct([
  publicKey('mint'),
  publicKey('vaultAddress'),
]);

export const ParamDesc: Layout<ParamDesc> = struct([
  publicKey('address'),
  bool('writable'),
]);

export const POOL_STATE_TAG = new BN('16a7874c7fb2301b', 'hex');

export const PoolState: Layout<PoolState> = tagged(
  POOL_STATE_TAG,
  struct([
    publicKey('poolTokenMint'),
    vec(AssetInfo, 'assets'),
    publicKey('vaultSigner'),
    u8('vaultSignerNonce'),
    vec(ParamDesc, 'accountParams'),
    str('name'),
    publicKey('lqdFeeVault'),
    publicKey('initializerFeeVault'),
    u32('feeRate'),
    option(publicKey(), 'adminKey'),
    vecU8('customState'),
  ]),
);

export const Basket: Layout<Basket> = struct([vec(i64(), 'quantities')]);

export const PoolAction: Layout<PoolAction> = rustEnum([
  u64('create'),
  u64('redeem'),
  Basket.replicate('swap'),
]);

export const InitializePoolRequest: Layout<InitializePoolRequest> = struct([
  u8('vaultSignerNonce'),
  u8('assetsLength'),
  str('poolName'),
  u32('feeRate'),
  vecU8('customData'),
]);

export const POOL_REQUEST_TAG = new BN('220a6cbdcd1cc4cf', 'hex');

export const PoolRequest: Layout<PoolRequest> = tagged(
  POOL_REQUEST_TAG,
  rustEnum([
    InitializePoolRequest.replicate('initialize'),
    PoolAction.replicate('getBasket'),
    PoolAction.replicate('execute'),
  ]),
);

export function isPoolState(data: Buffer): boolean {
  return data.slice(0, 8).equals(POOL_STATE_TAG.toBuffer('le'));
}

export function decodePoolState(data: Buffer): PoolState {
  return PoolState.decode(data);
}

export function encodePoolState(state: PoolState): Buffer {
  const buffer = Buffer.alloc(1000);
  const len = PoolState.encode(state, buffer);
  return buffer.slice(0, len);
}

export function encodePoolRequest(poolRequest: PoolRequest): Buffer {
  const buffer = Buffer.alloc(1000);
  const len = PoolRequest.encode(poolRequest, buffer);
  return buffer.slice(0, len);
}

export function decodePoolRequest(data: Buffer): PoolRequest {
  return PoolRequest.decode(data);
}

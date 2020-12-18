import { Layout } from 'buffer-layout';
import * as borsh from '@project-serum/borsh';
import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';

export interface LockedRewardVendor {
  initialized: boolean;
  registrar: PublicKey;
  vault: PublicKey;
  nonce: number;
  pool: PublicKey;
  poolTokenSupply: BN;
  rewardEventQueueCursor: number;
  startTs: BN;
  endTs: BN;
  expiryTs: BN;
  expiryReceiver: PublicKey;
  total: BN;
  periodCount: BN;
  expired: boolean;
}

const LOCKED_REWARD_VENDOR_LAYOUT: Layout<LockedRewardVendor> = borsh.struct([
  borsh.bool('initialized'),
  borsh.publicKey('registrar'),
  borsh.publicKey('vault'),
  borsh.u8('nonce'),
  borsh.publicKey('pool'),
  borsh.u64('poolTokenSupply'),
  borsh.u32('rewardEventQueueCursor'),
  borsh.i64('startTs'),
  borsh.i64('endTs'),
  borsh.i64('expiryTs'),
  borsh.publicKey('expiryReceiver'),
  borsh.u64('total'),
  borsh.u64('periodCount'),
  borsh.bool('expired'),
]);

export function decode(data: Buffer): LockedRewardVendor {
  return LOCKED_REWARD_VENDOR_LAYOUT.decode(data);
}

export function encode(v: LockedRewardVendor): Buffer {
  const buffer = Buffer.alloc(1000); // TODO: use a tighter buffer.
  const len = LOCKED_REWARD_VENDOR_LAYOUT.encode(v, buffer);
  return buffer.slice(0, len);
}

export function defaultLockedRewardVendor(): LockedRewardVendor {
  return {
    initialized: false,
    registrar: new PublicKey(Buffer.alloc(32)),
    vault: new PublicKey(Buffer.alloc(32)),
    nonce: 0,
    pool: new PublicKey(Buffer.alloc(32)),
    poolTokenSupply: new BN(0),
    rewardEventQueueCursor: 0,
    startTs: new BN(0),
    endTs: new BN(0),
    expiryTs: new BN(0),
    expiryReceiver: new PublicKey(Buffer.alloc(32)),
    total: new BN(0),
    periodCount: new BN(0),
    expired: false,
  };
}

export const SIZE: number = encode(defaultLockedRewardVendor()).length;

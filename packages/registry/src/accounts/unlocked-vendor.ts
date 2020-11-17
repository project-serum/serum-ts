import { Layout } from 'buffer-layout';
import * as borsh from '@project-serum/borsh';
import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';

export interface UnlockedRewardVendor {
  initialized: boolean;
  registrar: PublicKey;
  vault: PublicKey;
  nonce: number;
  pool: PublicKey;
  poolTokenSupply: BN;
  rewardEventQueueCursor: number;
  startTs: BN;
  expiryTs: BN;
  expiryReceiver: PublicKey;
  total: BN;
}

const LOCKED_REWARD_VENDOR_LAYOUT: Layout<UnlockedRewardVendor> = borsh.struct([
  borsh.bool('initialized'),
  borsh.publicKey('registrar'),
  borsh.publicKey('vault'),
  borsh.u8('nonce'),
  borsh.publicKey('pool'),
  borsh.u64('poolTokenSupply'),
  borsh.u32('rewardEventQueueCursor'),
  borsh.i64('startTs'),
  borsh.i64('expiryTs'),
  borsh.publicKey('expiryReceiver'),
  borsh.u64('total'),
]);

export function decode(data: Buffer): UnlockedRewardVendor {
  return LOCKED_REWARD_VENDOR_LAYOUT.decode(data);
}

export function encode(v: UnlockedRewardVendor): Buffer {
  const buffer = Buffer.alloc(1000); // TODO: use a tighter buffer.
  const len = LOCKED_REWARD_VENDOR_LAYOUT.encode(v, buffer);
  return buffer.slice(0, len);
}

export function defaultUnlockedRewardVendor(): UnlockedRewardVendor {
  return {
    initialized: false,
    registrar: new PublicKey(Buffer.alloc(32)),
    vault: new PublicKey(Buffer.alloc(32)),
    nonce: 0,
    pool: new PublicKey(Buffer.alloc(32)),
    poolTokenSupply: new BN(0),
    rewardEventQueueCursor: 0,
    startTs: new BN(0),
    expiryTs: new BN(0),
    expiryReceiver: new PublicKey(Buffer.alloc(32)),
    total: new BN(0),
  };
}

export const SIZE: number = encode(defaultUnlockedRewardVendor()).length;

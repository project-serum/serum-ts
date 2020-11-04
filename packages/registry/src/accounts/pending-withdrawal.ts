import { struct, Layout } from 'buffer-layout';
import { bool, i64, publicKey, rustEnum, u64 } from '@project-serum/borsh';
import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';

export interface PendingWithdrawal {
  initialized: boolean;
  burned: boolean;
  member: PublicKey;
  startTs: BN;
  endTs: BN;
  sptAmount: BN;
  pool: PublicKey;
  payment: PendingPayment;
}

export interface PendingPayment {
  assetAmount: BN;
  megaAssetAmount: BN;
}

const PENDING_PAYMENT_LAYOUT: Layout<PendingPayment> = struct([
  u64('assetAmount'),
  u64('megaAssetAmount'),
]);

const PENDING_WITHDRAWAL_LAYOUT: Layout<PendingWithdrawal> = struct([
  bool('initialized'),
  bool('burned'),
  publicKey('member'),
  i64('startTs'),
  i64('endTs'),
  u64('sptAmount'),
  publicKey('pool'),
  PENDING_PAYMENT_LAYOUT.replicate('payment'),
]);

export function decode(data: Buffer): PendingWithdrawal {
  return PENDING_WITHDRAWAL_LAYOUT.decode(data);
}

export function encode(pw: PendingWithdrawal): Buffer {
  const buffer = Buffer.alloc(1000); // TODO: use a tighter buffer.
  const len = PENDING_WITHDRAWAL_LAYOUT.encode(pw, buffer);
  return buffer.slice(0, len);
}

export const SIZE: number = encode({
  initialized: false,
  burned: false,
  member: new PublicKey(Buffer.alloc(32)),
  startTs: new BN(0),
  endTs: new BN(0),
  sptAmount: new BN(0),
  pool: new PublicKey(Buffer.alloc(32)),
  payment: {
    assetAmount: new BN(0),
    megaAssetAmount: new BN(0),
  },
}).length;

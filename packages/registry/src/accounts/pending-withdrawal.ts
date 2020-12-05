import { struct, Layout } from 'buffer-layout';
import { bool, i64, publicKey, u64 as borshU64 } from '@project-serum/borsh';
import { PublicKey } from '@solana/web3.js';
import { u64 } from '@solana/spl-token';
import BN from 'bn.js';

export interface PendingWithdrawal {
  initialized: boolean;
  member: PublicKey;
  burned: boolean;
  pool: PublicKey;
  startTs: BN;
  endTs: BN;
  amount: BN;
  balanceId: PublicKey;
}

const PENDING_WITHDRAWAL_LAYOUT: Layout<PendingWithdrawal> = struct([
  bool('initialized'),
  publicKey('member'),
  bool('burned'),
  publicKey('pool'),
  i64('startTs'),
  i64('endTs'),
  borshU64('amount'),
  publicKey('balanceId'),
]);

export function decode(data: Buffer): PendingWithdrawal {
  return PENDING_WITHDRAWAL_LAYOUT.decode(data);
}

export function encode(pw: PendingWithdrawal): Buffer {
  const buffer = Buffer.alloc(1000); // TODO: use a tighter buffer.
  const len = PENDING_WITHDRAWAL_LAYOUT.encode(pw, buffer);
  return buffer.slice(0, len);
}

export function defaultPendingWithdrawal(): PendingWithdrawal {
  return {
    initialized: false,
    member: new PublicKey(Buffer.alloc(32)),
    burned: false,
    pool: new PublicKey(Buffer.alloc(32)),
    startTs: new u64(0),
    endTs: new u64(0),
    amount: new u64(0),
    balanceId: new PublicKey(Buffer.alloc(32)),
  };
}

export const SIZE: number = encode(defaultPendingWithdrawal()).length;

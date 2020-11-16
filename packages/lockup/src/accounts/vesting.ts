import { struct, u8, Layout } from 'buffer-layout';
import { bool, i64, publicKey, u64, option } from '@project-serum/borsh';
import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';

export interface Vesting {
  initialized: boolean;
  needsAssignment: NeedsAssignment | null;
  claimed: boolean;
  safe: PublicKey;
  beneficiary: PublicKey;
  balance: BN;
  startBalance: BN;
  startTs: BN;
  endTs: BN;
  periodCount: BN;
  lockedNftMint: PublicKey;
  lockedNftToken: PublicKey;
  whitelistOwned: BN;
}

export interface NeedsAssignment {
  authority: PublicKey;
  programId: PublicKey;
  identifier: PublicKey;
  nonce: number;
}

export const NEEDS_ASSIGNMENT_LAYOUT: Layout<NeedsAssignment> = struct([
  publicKey('authority'),
  publicKey('programid'),
  publicKey('identifier'),
  u8('nonce'),
]);

export const VESTING_LAYOUT: Layout<Vesting> = struct([
  bool('initialized'),
  option(
    NEEDS_ASSIGNMENT_LAYOUT.replicate('needsAssignmentInner'),
    'needsAssignment',
  ),
  bool('claimed'),
  publicKey('safe'),
  publicKey('beneficiary'),
  u64('balance'),
  u64('startBalance'),
  i64('startTs'),
  i64('endTs'),
  u64('periodCount'),
  publicKey('lockedNftMint'),
  publicKey('lockedNftToken'),
  u64('whitelistOwned'),
]);

export function decode(data: Buffer): Vesting {
  return VESTING_LAYOUT.decode(data);
}

export function encode(v: Vesting): Buffer {
  const buffer = Buffer.alloc(1000); // TODO: use a tighter buffer.
  const len = VESTING_LAYOUT.encode(v, buffer);
  return buffer.slice(0, len);
}

export const SIZE = encode({
  initialized: false,
  needsAssignment: {
    authority: new PublicKey(Buffer.alloc(32)),
    programId: new PublicKey(Buffer.alloc(32)),
    identifier: new PublicKey(Buffer.alloc(32)),
    nonce: 0,
  },
  claimed: false,
  safe: new PublicKey(Buffer.alloc(32)),
  beneficiary: new PublicKey(Buffer.alloc(32)),
  balance: new BN(0),
  startBalance: new BN(0),
  startTs: new BN(0),
  endTs: new BN(0),
  periodCount: new BN(0),
  lockedNftMint: new PublicKey(Buffer.alloc(32)),
  lockedNftToken: new PublicKey(Buffer.alloc(32)),
  whitelistOwned: new BN(0),
}).length;

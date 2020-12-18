import { struct, u8, Layout } from 'buffer-layout';
import { bool, i64, publicKey, u64 } from '@project-serum/borsh';
import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';

export interface Vesting {
  initialized: boolean;
  safe: PublicKey;
  beneficiary: PublicKey;
  mint: PublicKey;
  vault: PublicKey;
  grantor: PublicKey;
  outstanding: BN;
  startBalance: BN;
  startTs: BN;
  endTs: BN;
  periodCount: BN;
  whitelistOwned: BN;
  nonce: number;
}

export const VESTING_LAYOUT: Layout<Vesting> = struct([
  bool('initialized'),
  publicKey('safe'),
  publicKey('beneficiary'),
  publicKey('mint'),
  publicKey('vault'),
  publicKey('grantor'),
  u64('outstanding'),
  u64('startBalance'),
  i64('startTs'),
  i64('endTs'),
  u64('periodCount'),
  u64('whitelistOwned'),
  u8('nonce'),
]);

export function decode(data: Buffer): Vesting {
  return VESTING_LAYOUT.decode(data);
}

export function encode(v: Vesting): Buffer {
  const buffer = Buffer.alloc(1000); // TODO: use a tighter buffer.
  const len = VESTING_LAYOUT.encode(v, buffer);
  return buffer.slice(0, len);
}

export function defaultVesting(): Vesting {
  return {
    initialized: false,
    safe: new PublicKey(Buffer.alloc(32)),
    beneficiary: new PublicKey(Buffer.alloc(32)),
    mint: new PublicKey(Buffer.alloc(32)),
    vault: new PublicKey(Buffer.alloc(32)),
    grantor: new PublicKey(Buffer.alloc(32)),
    outstanding: new BN(0),
    startBalance: new BN(0),
    startTs: new BN(0),
    endTs: new BN(0),
    periodCount: new BN(0),
    whitelistOwned: new BN(0),
    nonce: 0,
  };
}

export const SIZE = encode(defaultVesting()).length;

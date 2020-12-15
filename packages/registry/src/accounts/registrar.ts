import { struct, u8, Layout } from 'buffer-layout';
import { bool, i64, publicKey, u64 as borshU64 } from '@project-serum/borsh';
import { PublicKey } from '@solana/web3.js';
import { u64 } from '@solana/spl-token';
import BN from 'bn.js';

export interface Registrar {
  initialized: boolean;
  authority: PublicKey;
  nonce: number;
  maxStakePerEntity: BN;
  withdrawalTimelock: BN;
  deactivationTimelock: BN;
  rewardEventQueue: PublicKey;
  mint: PublicKey;
  megaMint: PublicKey;
  poolMint: PublicKey;
  poolMintMega: PublicKey;
  stakeRate: BN;
  stakeRateMega: BN;
}

const REGISTRAR_LAYOUT: Layout<Registrar> = struct([
  bool('initialized'),
  publicKey('authority'),
  u8('nonce'),
  borshU64('maxStakePerEntity'),
  i64('withdrawalTimelock'),
  i64('deactivationTimelock'),
  publicKey('rewardEventQueue'),
  publicKey('mint'),
  publicKey('megaMint'),
  publicKey('poolMint'),
  publicKey('poolMintMega'),
  borshU64('stakeRate'),
  borshU64('stakeRateMega'),
]);

export function decode(data: Buffer): Registrar {
  return REGISTRAR_LAYOUT.decode(data);
}

export function encode(r: Registrar): Buffer {
  const buffer = Buffer.alloc(1000); // TODO: use a tighter buffer.
  const len = REGISTRAR_LAYOUT.encode(r, buffer);
  return buffer.slice(0, len);
}

export const SIZE: number = encode({
  initialized: false,
  authority: new PublicKey(Buffer.alloc(32)),
  nonce: 0,
  maxStakePerEntity: new u64(0),
  withdrawalTimelock: new u64(0),
  deactivationTimelock: new u64(0),
  rewardEventQueue: new PublicKey(Buffer.alloc(32)),
  mint: new PublicKey(Buffer.alloc(32)),
  megaMint: new PublicKey(Buffer.alloc(32)),
  poolMint: new PublicKey(Buffer.alloc(32)),
  poolMintMega: new PublicKey(Buffer.alloc(32)),
  stakeRate: new u64(0),
  stakeRateMega: new u64(0),
}).length;

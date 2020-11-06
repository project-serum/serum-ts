import { struct, u8, Layout } from 'buffer-layout';
import { bool, i64, publicKey, u64 } from '@project-serum/borsh';
import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';

export interface Registrar {
  initialized: boolean;
  authority: PublicKey;
  nonce: number;
  rewardActivationThreshold: BN;
  withdrawalTimelock: BN;
  deactivationTimelock: BN;
  vault: PublicKey;
  megaVault: PublicKey;
  pool: PublicKey;
  megaPool: PublicKey;
  poolProgramId: PublicKey;
}

const REGISTRAR_LAYOUT: Layout<Registrar> = struct([
  bool('initialized'),
  publicKey('authority'),
  u8('nonce'),
  u64('rewardActivationThreshold'),
  i64('withdrawalTimelock'),
  i64('deactivationTimelock'),
  publicKey('vault'),
  publicKey('megaVault'),
  publicKey('pool'),
  publicKey('megaPool'),
  publicKey('poolProgramId'),
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
  rewardActivationThreshold: new BN(0),
  withdrawalTimelock: new BN(0),
  deactivationTimelock: new BN(0),
  vault: new PublicKey(Buffer.alloc(32)),
  megaVault: new PublicKey(Buffer.alloc(32)),
  pool: new PublicKey(Buffer.alloc(32)),
  megaPool: new PublicKey(Buffer.alloc(32)),
  poolProgramId: new PublicKey(Buffer.alloc(32)),
}).length;

export const STAKE_POOL_NAME = '';
export const MEGA_STAKE_POOL_NAME = '';

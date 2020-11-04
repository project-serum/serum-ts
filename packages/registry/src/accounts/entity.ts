import { struct, Layout } from 'buffer-layout';
import { bool, i64, publicKey, rustEnum, u64 } from '@project-serum/borsh';
import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';

export interface Entity {
  initialized: boolean;
  registrar: PublicKey;
  leader: PublicKey;
  balances: Balances;
  generation: BN;
  state: EntityState;
}

export interface Balances {
  sptAmount: BN;
  sptMegaAmount: BN;
  stakeIntent: BN;
  megaStakeIntent: BN;
}

export type EntityState = Inactive | PendingDeactivation | Active;
export type Inactive = {};
export type PendingDeactivation = {
  deactivationStartTs: BN;
  timelock: BN;
};
export type Active = {};

const BALANCES_LAYOUT: Layout<Balances> = struct([
  u64('sptAmount'),
  u64('sptMegaAmount'),
  u64('stakeIntent'),
  u64('megaStakeIntent'),
]);

const ENTITY_STATE_LAYOUT: Layout<EntityState> = rustEnum([
  struct([], 'inactive'),
  struct([i64('deactivationStartTs'), i64('timelock')], 'pendingDeactivation'),
  struct([], 'active'),
]);

const ENTITY_LAYOUT: Layout<Entity> = struct([
  bool('initialized'),
  publicKey('registrar'),
  publicKey('leader'),
  BALANCES_LAYOUT.replicate('balances'),
  u64('generation'),
  ENTITY_STATE_LAYOUT.replicate('state'),
]);

export function decode(data: Buffer): Entity {
  return ENTITY_LAYOUT.decode(data);
}

export function encode(e: Entity): Buffer {
  const buffer = Buffer.alloc(1000); // TODO: use a tighter buffer.
  const len = ENTITY_LAYOUT.encode(e, buffer);
  return buffer.slice(0, len);
}

export const SIZE: number = encode({
  initialized: false,
  registrar: new PublicKey(Buffer.alloc(32)),
  leader: new PublicKey(Buffer.alloc(32)),
  balances: {
    sptAmount: new BN(0),
    sptMegaAmount: new BN(0),
    stakeIntent: new BN(0),
    megaStakeIntent: new BN(0),
  },
  generation: new BN(0),
  state: {
    inactive: {},
  },
}).length;

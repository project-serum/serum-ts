import { struct, Layout } from 'buffer-layout';
import {
  bool,
  i64,
  publicKey,
  rustEnum,
  u64 as borshU64,
} from '@project-serum/borsh';
import { PublicKey } from '@solana/web3.js';
import { u64 } from '@solana/spl-token';
import BN from 'bn.js';

export interface Entity {
  initialized: boolean;
  registrar: PublicKey;
  leader: PublicKey;
  balances: Balances;
  state: EntityState;
  metadata: PublicKey;
}

export interface Balances {
  sptAmount: BN;
  sptMegaAmount: BN;
}

export type EntityState = {
  inactive?: Inactive;
  pendingDeactivation?: PendingDeactivation;
  active?: Active;
};
export type Inactive = {};
export type PendingDeactivation = {
  deactivationStartTs: BN;
  timelock: BN;
};
export type Active = {};

const BALANCES_LAYOUT: Layout<Balances> = struct([
  borshU64('sptAmount'),
  borshU64('sptMegaAmount'),
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
  ENTITY_STATE_LAYOUT.replicate('state'),
  publicKey('metadata'),
]);

export function decode(data: Buffer): Entity {
  return ENTITY_LAYOUT.decode(data);
}

export function encode(e: Entity): Buffer {
  const buffer = Buffer.alloc(1000); // TODO: use a tighter buffer.
  const len = ENTITY_LAYOUT.encode(e, buffer);
  return buffer.slice(0, len);
}

export function defaultEntity(): Entity {
  return {
    initialized: false,
    registrar: new PublicKey(Buffer.alloc(32)),
    leader: new PublicKey(Buffer.alloc(32)),
    balances: {
      sptAmount: new u64(0),
      sptMegaAmount: new u64(0),
    },
    state: {
      pendingDeactivation: {
        deactivationStartTs: new u64(0),
        timelock: new u64(0),
      },
    },
    metadata: new PublicKey(Buffer.alloc(32)),
  };
}

export const SIZE: number = encode(defaultEntity()).length;

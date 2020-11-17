import { struct, u8, u32, Layout } from 'buffer-layout';
import {
  bool,
  publicKey,
  u64 as borshU64,
  i64 as borshI64,
} from '@project-serum/borsh';
import { u64 } from '@solana/spl-token';
import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
import { PoolPrices, POOL_PRICES_LAYOUT } from './generation';

export interface Member {
  initialized: boolean;
  registrar: PublicKey;
  beneficiary: PublicKey;
  entity: PublicKey;
  generation: BN;
  balances: MemberBalances;
  lastActivePrices: PoolPrices;
  metadata: PublicKey;
  spt: PublicKey;
  sptMega: PublicKey;
  rewardsCursor: number;
  lastStakeTs: BN;
}

interface MemberBalances {
  sptAmount: BN;
  sptMegaAmount: BN;
  currentDeposit: BN;
  currentMegaDeposit: BN;
  main: OriginalDeposit;
  delegate: OriginalDeposit;
}

interface OriginalDeposit {
  owner: PublicKey;
  deposit: BN;
  megaDeposit: BN;
}

const ORIGINAL_DEPOSIT_LAYOUT: Layout<OriginalDeposit> = struct([
  publicKey('owner'),
  borshU64('deposit'),
  borshU64('megaDeposit'),
]);

const MEMBER_BALANCES_LAYOUT: Layout<MemberBalances> = struct([
  borshU64('sptAmount'),
  borshU64('sptMegaAmount'),
  borshU64('currentDeposit'),
  borshU64('currentMegaDeposit'),
  ORIGINAL_DEPOSIT_LAYOUT.replicate('main'),
  ORIGINAL_DEPOSIT_LAYOUT.replicate('delegate'),
]);

export const MEMBER_LAYOUT: Layout<Member> = struct([
  bool('initialized'),
  publicKey('registrar'),
  publicKey('beneficiary'),
  publicKey('entity'),
  borshU64('generation'),
  MEMBER_BALANCES_LAYOUT.replicate('balances'),
  POOL_PRICES_LAYOUT.replicate('lastActivePrices'),
  publicKey('metadata'),
  publicKey('spt'),
  publicKey('sptMega'),
  u32('rewardsCursor'),
  borshI64('lastStakeTs'),
]);

export function decode(data: Buffer): Member {
  return MEMBER_LAYOUT.decode(data);
}

export function encode(m: Member): Buffer {
  const buffer = Buffer.alloc(1000); // TODO: use a tighter buffer.
  const len = MEMBER_LAYOUT.encode(m, buffer);
  return buffer.slice(0, len);
}

export function defaultMember(): Member {
  return {
    initialized: false,
    registrar: new PublicKey(Buffer.alloc(32)),
    beneficiary: new PublicKey(Buffer.alloc(32)),
    entity: new PublicKey(Buffer.alloc(32)),
    generation: new u64(0),
    balances: {
      sptAmount: new u64(0),
      sptMegaAmount: new u64(0),
      currentDeposit: new u64(0),
      currentMegaDeposit: new u64(0),
      main: {
        owner: new PublicKey(Buffer.alloc(32)),
        deposit: new u64(0),
        megaDeposit: new u64(0),
      },
      delegate: {
        owner: new PublicKey(Buffer.alloc(32)),
        deposit: new u64(0),
        megaDeposit: new u64(0),
      },
    },
    lastActivePrices: {
      basket: {
        quantities: [new u64(0)],
      },
      megaBasket: {
        quantities: [new u64(0), new u64(0)],
      },
    },
    metadata: new PublicKey(Buffer.alloc(32)),
    spt: new PublicKey(Buffer.alloc(32)),
    sptMega: new PublicKey(Buffer.alloc(32)),
    rewardsCursor: 0,
    lastStakeTs: new BN(0),
  };
}

export const SIZE: number = encode(defaultMember()).length;

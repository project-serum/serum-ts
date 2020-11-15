import { struct, u8, Layout } from 'buffer-layout';
import { bool, publicKey, u64 } from '@project-serum/borsh';
import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
import {
  PoolPrices,
  POOL_PRICES_LAYOUT,
  defaultPoolPrices,
} from './generation';

export interface Member {
  initialized: boolean;
  registrar: PublicKey;
  entity: PublicKey;
  beneficiary: PublicKey;
  generation: BN;
  balances: MemberBalances;
  lastActivePrices: PoolPrices;
  nonce: number;
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
  u64('deposit'),
  u64('megaDeposit'),
]);

const MEMBER_BALANCES_LAYOUT: Layout<MemberBalances> = struct([
  u64('sptAmount'),
  u64('sptMegaAmount'),
  u64('currentDeposit'),
  u64('currentMegaDeposit'),
  ORIGINAL_DEPOSIT_LAYOUT.replicate('main'),
  ORIGINAL_DEPOSIT_LAYOUT.replicate('delegate'),
]);

const MEMBER_LAYOUT: Layout<Member> = struct([
  bool('initialized'),
  publicKey('registrar'),
  publicKey('entity'),
  publicKey('beneficiary'),
  u64('generation'),
  MEMBER_BALANCES_LAYOUT.replicate('balances'),
  POOL_PRICES_LAYOUT.replicate('lastActivePrices'),
  u8('nonce'),
]);

export function decode(data: Buffer): Member {
  return MEMBER_LAYOUT.decode(data);
}

export function encode(m: Member): Buffer {
  const buffer = Buffer.alloc(1000); // TODO: use a tighter buffer.
  const len = MEMBER_LAYOUT.encode(m, buffer);
  return buffer.slice(0, len);
}

export const SIZE: number = encode({
  initialized: false,
  registrar: new PublicKey(Buffer.alloc(32)),
  entity: new PublicKey(Buffer.alloc(32)),
  beneficiary: new PublicKey(Buffer.alloc(32)),
  generation: new BN(0),
  balances: {
    sptAmount: new BN(0),
    sptMegaAmount: new BN(0),
    currentDeposit: new BN(0),
    currentMegaDeposit: new BN(0),
    main: {
      owner: new PublicKey(Buffer.alloc(32)),
      deposit: new BN(0),
      megaDeposit: new BN(0),
    },
    delegate: {
      owner: new PublicKey(Buffer.alloc(32)),
      deposit: new BN(0),
      megaDeposit: new BN(0),
    },
  },
  lastActivePrices: defaultPoolPrices(),
  nonce: 0,
}).length;

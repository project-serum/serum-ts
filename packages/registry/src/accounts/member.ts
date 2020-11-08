import { struct, u8, Layout } from 'buffer-layout';
import { bool, publicKey, u64 } from '@project-serum/borsh';
import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';

export interface Member {
  initialized: boolean;
  registrar: PublicKey;
  entity: PublicKey;
  beneficiary: PublicKey;
  generation: BN;
  books: MemberBooks;
}

export interface MemberBooks {
  sptAmount: BN;
  sptMegaAmount: BN;
  stakeIntent: BN;
  megaStakeIntent: BN;
  main: Book;
  delegate: Book;
}

export interface Book {
  owner: PublicKey;
  balances: Balances;
}

export interface Balances {
  deposit: BN;
  megaDeposit: BN;
}

const BALANCES_LAYOUT: Layout<Balances> = struct([
  u64('deposit'),
  u64('megaDeposit'),
]);

const BOOK_LAYOUT: Layout<Balances> = struct([
  publicKey('owner'),
  BALANCES_LAYOUT.replicate('balances'),
]);

const MEMBER_BOOKS_LAYOUT: Layout<MemberBooks> = struct([
  u64('sptAmount'),
  u64('sptMegaAmount'),
  u64('stakeIntent'),
  u64('megaStakeIntent'),
  BOOK_LAYOUT.replicate('main'),
  BOOK_LAYOUT.replicate('delegate'),
]);

const MEMBER_LAYOUT: Layout<Member> = struct([
  bool('initialized'),
  publicKey('registrar'),
  publicKey('entity'),
  publicKey('beneficiary'),
  u64('generation'),
  MEMBER_BOOKS_LAYOUT.replicate('books'),
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
  books: {
    sptAmount: new BN(0),
    sptMegaAmount: new BN(0),
    stakeIntent: new BN(0),
    megaStakeIntent: new BN(0),
    main: {
      owner: new PublicKey(Buffer.alloc(32)),
      balances: {
        deposit: new BN(0),
        megaDeposit: new BN(0),
      },
    },
    delegate: {
      owner: new PublicKey(Buffer.alloc(32)),
      balances: {
        deposit: new BN(0),
        megaDeposit: new BN(0),
      },
    },
  },
}).length;

import { struct, u8, u32, Layout } from 'buffer-layout';
import { vec, bool, publicKey, i64 as borshI64 } from '@project-serum/borsh';
import { PublicKey } from '@solana/web3.js';
import { AccountInfo as TokenAccount } from '@solana/spl-token';
import BN from 'bn.js';

export interface Member {
  initialized: boolean;
  registrar: PublicKey;
  beneficiary: PublicKey;
  entity: PublicKey;
  balances: Array<BalanceSandbox>;
  metadata: PublicKey;
  rewardsCursor: number;
  lastStakeTs: BN;
}

export interface MemberDeref {
  member: Member;
  balances: BalanceSandboxDeref[];
}

export interface BalanceSandbox {
  owner: PublicKey;
  spt: PublicKey;
  sptMega: PublicKey;
  vault: PublicKey;
  vaultMega: PublicKey;
  vaultStake: PublicKey;
  vaultStakeMega: PublicKey;
  vaultPendingWithdrawal: PublicKey;
  vaultPendingWithdrawalMega: PublicKey;
}

export interface BalanceSandboxDeref {
  owner: PublicKey;
  spt: TokenAccount;
  sptMega: TokenAccount;
  vault: TokenAccount;
  vaultMega: TokenAccount;
  vaultStake: TokenAccount;
  vaultStakeMega: TokenAccount;
  vaultPendingWithdrawal: TokenAccount;
  vaultPendingWithdrawalMega: TokenAccount;
}

const BALANCE_SANDBOX_LAYOUT: Layout<BalanceSandbox> = struct([
  publicKey('owner'),
  publicKey('spt'),
  publicKey('sptMega'),
  publicKey('vault'),
  publicKey('vaultMega'),
  publicKey('vaultStake'),
  publicKey('vaultStakeMega'),
  publicKey('vaultPendingWithdrawal'),
  publicKey('vaultPendingWithdrawalMega'),
]);

export const MEMBER_LAYOUT: Layout<Member> = struct([
  bool('initialized'),
  publicKey('registrar'),
  publicKey('beneficiary'),
  publicKey('entity'),
  publicKey('metadata'),
  vec(BALANCE_SANDBOX_LAYOUT.replicate('balancesInner'), 'balances'),
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
    metadata: new PublicKey(Buffer.alloc(32)),
    balances: [defaultBalanceSandbox(), defaultBalanceSandbox()],
    rewardsCursor: 0,
    lastStakeTs: new BN(0),
  };
}

function defaultBalanceSandbox(): BalanceSandbox {
  return {
    owner: new PublicKey(Buffer.alloc(32)),
    spt: new PublicKey(Buffer.alloc(32)),
    sptMega: new PublicKey(Buffer.alloc(32)),
    vault: new PublicKey(Buffer.alloc(32)),
    vaultMega: new PublicKey(Buffer.alloc(32)),
    vaultStake: new PublicKey(Buffer.alloc(32)),
    vaultStakeMega: new PublicKey(Buffer.alloc(32)),
    vaultPendingWithdrawal: new PublicKey(Buffer.alloc(32)),
    vaultPendingWithdrawalMega: new PublicKey(Buffer.alloc(32)),
  };
}

export const SIZE: number = encode(defaultMember()).length;

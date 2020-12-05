import { Layout } from 'buffer-layout';
import {
  option,
  i64,
  publicKey,
  rustEnum,
  u64,
  u32,
  struct,
  u8,
} from '@project-serum/borsh';
import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';

export type RegistryInstruction =
  | Initialize
  | UpdateRegistrar
  | CreateEntity
  | UpdateEntity
  | CreateMember
  | UpdateMember
  | SwitchEntity
  | Deposit
  | Withdraw
  | Stake
  | StartStakeWithdrawal
  | EndStakeWithdrawal
  | CreateEntity
  | DropLockedReward
  | DropUnlockedReward
  | ClaimLockedReward
  | ClaimUnlockedReward;

type Initialize = {
  authority: PublicKey;
  mint: PublicKey;
  mintMega: PublicKey;
  nonce: number;
  withdrawalTimelock: BN;
  deactivationTimelock: BN;
  rewardActivationThreshold: BN;
  maxStakePerEntity: BN;
  stakeRate: BN;
  stakeRateMega: BN;
};

type UpdateRegistrar = {
  newAuthority: PublicKey | null;
  withdrawalTimelock: BN | null;
  deactivationTimelock: BN | null;
  rewardActivationThreshold: BN | null;
  maxStakePerEntity: BN | null;
};

type CreateEntity = {
  metadata: PublicKey;
};

type UpdateEntity = {
  leader: PublicKey | null;
  metadata: PublicKey | null;
};

type CreateMember = {};

type UpdateMember = {
  metadata: PublicKey | null;
};

type SwitchEntity = {};

type Deposit = {
  amount: BN;
};

type Withdraw = {
  amount: BN;
};

type Stake = {
  amount: BN;
  balanceId: PublicKey;
};

type StartStakeWithdrawal = {
  amount: BN;
  balanceId: PublicKey;
};

type EndStakeWithdrawal = {};

type DropLockedReward = {
  total: BN;
  expiryTs: BN;
  expiryReceiver: PublicKey;
  periodCount: BN;
  nonce: number;
};

type DropUnlockedReward = {
  total: BN;
  expiryTs: BN;
  expiryReceiver: PublicKey;
  nonce: number;
};

type ClaimLockedReward = {
  cursor: number;
  // Nonce for the vesting account to be created.
  nonce: number;
};

type ClaimUnlockedReward = {
  cursor: number;
};

const REGISTRY_INSTRUCTION_LAYOUT: Layout<RegistryInstruction> = rustEnum([
  struct(
    [
      publicKey('authority'),
      publicKey('mint'),
      publicKey('megaMint'),
      u8('nonce'),
      i64('withdrawalTimelock'),
      i64('deactivationTimelock'),
      u64('rewardActivationThreshold'),
      u64('maxStakePerEntity'),
      u64('stakeRate'),
      u64('stakeRateMega'),
    ],
    'initialize',
  ),
  struct(
    [
      option(publicKey(), 'newAuthority'),
      option(i64(), 'withdrawalTimelock'),
      option(i64(), 'deactivationTimelock'),
      option(u64(), 'rewardActivationThreshold'),
      option(u64(), 'maxStakePerEntity'),
    ],
    'updateRegistrar',
  ),
  struct([publicKey('metadata')], 'createEntity'),
  struct(
    [option(publicKey(), 'leader'), option(publicKey(), 'metadata')],
    'updateEntity',
  ),
  struct([], 'createMember'),
  struct([option(publicKey(), 'metadata')], 'updateMember'),
  struct([], 'switchEntity'),
  struct([u64('amount')], 'deposit'),
  struct([u64('amount')], 'withdraw'),
  struct([u64('amount'), publicKey('balanceId')], 'stake'),
  struct([u64('amount'), publicKey('balanceId')], 'startStakeWithdrawal'),
  struct([], 'endStakeWithdrawal'),
  struct(
    [
      u64('total'),
      i64('endTs'),
      i64('expiryTs'),
      publicKey('expiryReceiver'),
      u64('periodCount'),
      u8('nonce'),
    ],
    'dropLockedReward',
  ),
  struct(
    [u64('total'), i64('expiryTs'), publicKey('expiryReceiver'), u8('nonce')],
    'dropUnlockedReward',
  ),
  struct([u32('cursor'), u8('nonce')], 'claimLockedReward'),
  struct([u32('cursor')], 'claimUnlockedReward'),
]);

export function decode(data: Buffer): RegistryInstruction {
  return REGISTRY_INSTRUCTION_LAYOUT.decode(data);
}

export function encode(i: RegistryInstruction): Buffer {
  const buffer = Buffer.alloc(1000); // TODO: use a tighter buffer.
  const len = REGISTRY_INSTRUCTION_LAYOUT.encode(i, buffer);
  return buffer.slice(0, len);
}

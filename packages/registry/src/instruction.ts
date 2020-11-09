import { u8, struct, Layout } from 'buffer-layout';
import {
  bool,
  option,
  i64,
  publicKey,
  rustEnum,
  u64,
} from '@project-serum/borsh';
import { PublicKey, TransactionInstruction } from '@solana/web3.js';
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
  | MarkGeneration
  | StartStakeWithdrawal
  | EndStakeWithdrawal
  | CreateEntity;

type Initialize = {
  authority: PublicKey;
  nonce: number;
  withdrawalTimelock: BN;
  deactivationTimelock: BN;
  rewardActivationThreshold: BN;
  maxStakePerEntity: BN;
};

type UpdateRegistrar = {
  newAuthority: PublicKey | null;
  withdrawalTimelock: BN | null;
  deactivationTimelock: BN | null;
  rewardActivationThreshold: BN | null;
  maxStakePerEntity: BN | null;
};

type CreateEntity = {};

type UpdateEntity = {
  leader: PublicKey;
};

type CreateMember = {
  delegate: PublicKey;
};

type UpdateMember = {
  delegate: PublicKey | null;
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
};

type MarkGeneration = {};

type StartStakeWithdrawal = {
  amount: BN;
};

type EndStakeWithdrawal = {};

const REGISTRY_INSTRUCTION_LAYOUT: Layout<RegistryInstruction> = rustEnum([
  struct(
    [
      publicKey('authority'),
      u8('nonce'),
      i64('withdrawalTimelock'),
      i64('deactivationTimelock'),
      u64('rewardActivationThreshold'),
      u64('maxStakePerEntity'),
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
  struct([], 'createEntity'),
  struct([publicKey('leader')], 'updateEntity'),
  struct([publicKey('delegate')], 'createMember'),
  struct([option(publicKey(), 'delegate')], 'updateMember'),
  struct([], 'switchEntity'),
  struct([u64('amount')], 'deposit'),
  struct([u64('amount')], 'withdraw'),
  struct([u64('amount')], 'stake'),
  struct([], 'markGeneration'),
  struct([u64('amount')], 'startStakeWithdrawal'),
  struct([], 'endStakeWithdrawal'),
]);

export function decode(data: Buffer): RegistryInstruction {
  return REGISTRY_INSTRUCTION_LAYOUT.decode(data);
}

export function encode(i: RegistryInstruction): Buffer {
  const buffer = Buffer.alloc(1000); // TODO: use a tighter buffer.
  const len = REGISTRY_INSTRUCTION_LAYOUT.encode(i, buffer);
  return buffer.slice(0, len);
}

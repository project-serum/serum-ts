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
import { Watchtower, WATCHTOWER_LAYOUT } from './accounts/member';
import BN from 'bn.js';

export type RegistryInstruction =
  | Initialize
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
  | CreateEntity;

export type Initialize = {
  authority: PublicKey;
  nonce: number;
  withdrawalTimelock: BN;
  deactivationTimelock: BN;
  rewardActivationThreshold: BN;
};

export type CreateEntity = {};

export type UpdateEntity = {
  leader: PublicKey;
};

export type CreateMember = {
  delegate: PublicKey;
  watchtower: Watchtower;
};

export type UpdateMember = {
  watchtower: Watchtower | null;
  delegate: PublicKey | null;
};

export type SwitchEntity = {};

export type Deposit = {
  amount: BN;
};

export type Withdraw = {
  amount: BN;
};

export type Stake = {
  amount: BN;
};

export type StartStakeWithdrawal = {
  amount: BN;
};

export type EndStakeWithdrawal = {};

const REGISTRY_INSTRUCTION_LAYOUT: Layout<RegistryInstruction> = rustEnum([
  struct(
    [
      publicKey('authority'),
      u8('nonce'),
      i64('withdrawalTimelock'),
      i64('deactivationTimelock'),
      u64('rewardActivationThreshold'),
    ],
    'initialize',
  ),
  struct([], 'createEntity'),
  struct([publicKey('leader')], 'updateEntity'),
  struct(
    [publicKey('delegate'), WATCHTOWER_LAYOUT.replicate('watchtower')],
    'createMember',
  ),
  struct(
    [
      option(WATCHTOWER_LAYOUT.replicate('watchtowerInner'), 'watchtower'),
      option(publicKey(), 'delegate'),
    ],
    'updateMember',
  ),
  struct([], 'switchEntity'),
  struct([u64('amount')], 'deposit'),
  struct([u64('amount')], 'withdraw'),
  struct([u64('amount')], 'stake'),
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

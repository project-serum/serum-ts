import { u8, struct, Layout } from 'buffer-layout';
import { i64, publicKey, rustEnum, u64, vecU8 } from '@project-serum/borsh';
import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
import { WhitelistEntry, WHITELIST_ENTRY_LAYOUT } from './accounts/whitelist';

export type LockupInstruction =
  | Initialize
  | CreateVesting
  | Withdraw
  | WhitelistWithdraw
  | WhitelistDeposit
  | WhitelistAdd
  | WhitelistDelete
  | SetAuthority
  | AvailableForWithdrawal;

type Initialize = {
  authority: PublicKey;
};

type CreateVesting = {
  beneficiary: PublicKey;
  endTs: BN;
  periodCount: BN;
  depositAmount: BN;
};

type Withdraw = {};

type WhitelistWithdraw = {
  amount: BN;
  instructionData: Buffer;
};

type WhitelistDeposit = {
  instructionData: Buffer;
};

type WhitelistAdd = {
  entry: WhitelistEntry;
};

type WhitelistDelete = {
  entry: WhitelistEntry;
};

type SetAuthority = {
  newAuthority: PublicKey;
};

type AvailableForWithdrawal = {};

const LOCKUP_INSTRUCTION_LAYOUT: Layout<LockupInstruction> = rustEnum([
  struct([publicKey('authority')], 'initialize'),
  struct(
    [
      publicKey('beneficiary'),
      i64('endTs'),
      u64('periodCount'),
      u64('depositAmount'),
      u8('nonce'),
    ],
    'createVesting',
  ),
  struct([u64('amount')], 'withdraw'),
  struct([u64('amount'), vecU8('instructionData')], 'whitelistWithdraw'),
  struct([vecU8('instructionData')], 'whitelistDeposit'),
  struct([WHITELIST_ENTRY_LAYOUT.replicate('entry')], 'whitelistAdd'),
  struct([WHITELIST_ENTRY_LAYOUT.replicate('entry')], 'whitelistDelete'),
  struct([publicKey('newAuthority')], 'setAuthority'),
  struct([], 'availableForWithdrawal'),
]);

export function decode(data: Buffer): LockupInstruction {
  return LOCKUP_INSTRUCTION_LAYOUT.decode(data);
}

export function encode(i: LockupInstruction): Buffer {
  const buffer = Buffer.alloc(1000); // TODO: use a tighter buffer.
  const len = LOCKUP_INSTRUCTION_LAYOUT.encode(i, buffer);
  return buffer.slice(0, len);
}

import BN from 'bn.js';
import { struct, Layout } from 'buffer-layout';
import { PublicKey } from '@solana/web3.js';
import { publicKey, u64, rustEnum, vec } from '@project-serum/borsh';
import { Ring, RingItemDecoder } from './ring';

const CAPACITY = 14598;
const MESSAGE_SIZE = 137;

export class RewardEventQueue extends Ring<RewardEvent> {
  constructor(data: Buffer) {
    super(data, new RewardEventDecoder(), CAPACITY, MESSAGE_SIZE);
    if (data.length != this.bufferSize()) {
      throw new Error(
        `expected data length ${this.bufferSize()} got ${data.length}`,
      );
    }
  }

  static accountSize(): number {
    return CAPACITY * MESSAGE_SIZE + Ring.MESSAGE_START;
  }
}

class RewardEventDecoder implements RingItemDecoder<RewardEvent> {
  decode(data: Buffer): RewardEvent {
    return REWARD_EVENT_LAYOUT.decode(data);
  }
}

export type RewardEvent = {
  lockedAlloc?: LockedAlloc;
  unlockedAlloc?: UnlockedAlloc;
};

export type LockedAlloc = {
  from: PublicKey;
  total: BN;
  pool: PublicKey;
  vendor: PublicKey;
  mint: PublicKey;
};

export type UnlockedAlloc = {
  from: PublicKey;
  total: BN;
  pool: PublicKey;
  vendor: PublicKey;
  mint: PublicKey;
};

const REWARD_EVENT_LAYOUT: Layout<RewardEvent> = rustEnum([
  struct(
    [
      publicKey('from'),
      u64('total'),
      publicKey('pool'),
      publicKey('vendor'),
      publicKey('mint'),
    ],
    'lockedAlloc',
  ),
  struct(
    [
      publicKey('from'),
      u64('total'),
      publicKey('pool'),
      publicKey('vendor'),
      publicKey('mint'),
    ],
    'unlockedAlloc',
  ),
]);

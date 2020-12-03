import { struct, Layout } from 'buffer-layout';
import { publicKey, u64, str } from '@project-serum/borsh';
import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
import { Ring, RingItemDecoder } from '../../accounts/ring';

const CAPACITY = 500;
const MESSAGE_SIZE = 320;

export class MQueue extends Ring<Message> {
  constructor(data: Buffer) {
    super(data, new MessageDecoder(), CAPACITY, MESSAGE_SIZE);
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

class MessageDecoder implements RingItemDecoder<Message> {
  decode(data: Buffer): Message {
    return decode(data);
  }
}

export interface Message {
  from: PublicKey;
  ts: BN;
  content: string;
}

export const MESSAGE_LAYOUT: Layout<Message> = struct([
  publicKey('from'),
  u64('ts'),
  str('content'),
]);

export function decode(data: Buffer): Message {
  return MESSAGE_LAYOUT.decode(data);
}

export function encode(e: Message): Buffer {
  const buffer = Buffer.alloc(1000); // TODO: use a tighter buffer.
  const len = MESSAGE_LAYOUT.encode(e, buffer);
  return buffer.slice(0, len);
}

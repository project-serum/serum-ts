import { struct, Layout, u32 } from 'buffer-layout';
import { publicKey, u64, str } from '@project-serum/borsh';
import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';

const MESSAGE_SIZE = 320;
const MAX_MESSAGES = 500;
const MESSAGE_START = 8;

export const SIZE = MAX_MESSAGES * MESSAGE_SIZE + MESSAGE_START;

export class MQueue {
  constructor(private data: Buffer) {}

  messages(): Array<Message> {
    let messages = [];
    let idx = this.tail();
    let head = this.head();
    while (idx % MAX_MESSAGES !== head) {
      messages.push(this.message_at(idx));
      idx += 1;
    }
    return messages;
  }

  message_at(idx: number): Message {
    let start = idx * MESSAGE_SIZE + MESSAGE_START;
    let end = start + MESSAGE_SIZE;
    let bytes = this.data.slice(start, end);
    return decode(bytes);
  }

  head(): number {
    let bytes = this.data.slice(0, 4);
    return u32().decode(bytes);
  }

  tail(): number {
    let bytes = this.data.slice(4, 8);
    return u32().decode(bytes);
  }
}

export interface Message {
  from: PublicKey;
  ts: BN;
  content: string;
}

const MESSAGE_LAYOUT: Layout<Message> = struct([
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

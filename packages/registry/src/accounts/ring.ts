import { u32 } from 'buffer-layout';

export interface RingItemDecoder<T> {
  decode(data: Buffer): T;
}

const HEAD_START = 33;
const TAIL_START = 37;

export class Ring<T> {
  static MESSAGE_START = 41;

  constructor(
    private data: Buffer,
    private decoder: RingItemDecoder<T>,
    private capacity: number,
    private messageSize: number,
  ) {}

  bufferSize(): number {
    return this.capacity * this.messageSize + Ring.MESSAGE_START;
  }

  messages(): Array<T> {
    let messages = [];
    let idx = this.tail();
    let head = this.head();
    while (idx % this.capacity !== head) {
      messages.push(this.messageAt(idx));
      idx += 1;
    }
    return messages;
  }

  messageAt(idx: number): T {
    let start = idx * this.messageSize + Ring.MESSAGE_START;
    let end = start + this.messageSize;
    let bytes = this.data.slice(start, end);
    return this.decoder.decode(bytes);
  }

  head(): number {
    return this.headCursor() % this.capacity;
  }

  headCursor(): number {
    let bytes = this.data.slice(HEAD_START, HEAD_START + 4);
    return u32().decode(bytes);
  }

  tail(): number {
    return this.tailCursor() % this.capacity;
  }

  tailCursor(): number {
    let bytes = this.data.slice(TAIL_START, TAIL_START + 4);
    return u32().decode(bytes);
  }
}

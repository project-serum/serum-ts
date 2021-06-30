import { bits, blob, struct, u32, u8 } from 'buffer-layout';
import {
  accountFlagsLayout,
  publicKeyLayout,
  u128,
  u64,
  zeros,
} from './layout';
import BN from 'bn.js';
import { PublicKey } from '@solana/web3.js';

const REQUEST_QUEUE_HEADER = struct([
  blob(5),

  accountFlagsLayout('accountFlags'),
  u32('head'),
  zeros(4),
  u32('count'),
  zeros(4),
  u32('nextSeqNum'),
  zeros(4),
]);

const REQUEST_FLAGS = bits(u8(), false, 'requestFlags');
REQUEST_FLAGS.addBoolean('newOrder');
REQUEST_FLAGS.addBoolean('cancelOrder');
REQUEST_FLAGS.addBoolean('bid');
REQUEST_FLAGS.addBoolean('postOnly');
REQUEST_FLAGS.addBoolean('ioc');

const REQUEST = struct([
  REQUEST_FLAGS,
  u8('openOrdersSlot'),
  u8('feeTier'),
  blob(5),
  u64('maxBaseSizeOrCancelId'),
  u64('nativeQuoteQuantityLocked'),
  u128('orderId'),
  publicKeyLayout('openOrders'),
  u64('clientOrderId'),
]);

const EVENT_QUEUE_HEADER = struct([
  blob(5),

  accountFlagsLayout('accountFlags'),
  u32('head'),
  zeros(4),
  u32('count'),
  zeros(4),
  u32('seqNum'),
  zeros(4),
]);

const EVENT_FLAGS = bits(u8(), false, 'eventFlags');
EVENT_FLAGS.addBoolean('fill');
EVENT_FLAGS.addBoolean('out');
EVENT_FLAGS.addBoolean('bid');
EVENT_FLAGS.addBoolean('maker');

const EVENT = struct([
  EVENT_FLAGS,
  u8('openOrdersSlot'),
  u8('feeTier'),
  blob(5),
  u64('nativeQuantityReleased'), // Amount the user received
  u64('nativeQuantityPaid'), // Amount the user paid
  u64('nativeFeeOrRebate'),
  u128('orderId'),
  publicKeyLayout('openOrders'),
  u64('clientOrderId'),
]);

export interface Event {
  eventFlags: { fill: boolean; out: boolean; bid: boolean; maker: boolean };

  seqNum?: number;
  orderId: BN;
  openOrders: PublicKey;
  openOrdersSlot: number;
  feeTier: number;

  nativeQuantityReleased: BN;
  nativeQuantityPaid: BN;
  nativeFeeOrRebate: BN;
}

function decodeQueueItem(headerLayout, nodeLayout, buffer: Buffer, nodeIndex) {
  return nodeLayout.decode(
    buffer,
    headerLayout.span + nodeIndex * nodeLayout.span,
  );
}

function decodeQueue(
  headerLayout,
  nodeLayout,
  buffer: Buffer,
  history?: number,
) {
  const header = headerLayout.decode(buffer);
  const allocLen = Math.floor(
    (buffer.length - headerLayout.span) / nodeLayout.span,
  );
  const nodes: any[] = [];
  if (history) {
    for (let i = 0; i < Math.min(history, allocLen); ++i) {
      const nodeIndex =
        (header.head + header.count + allocLen - 1 - i) % allocLen;
      nodes.push(decodeQueueItem(headerLayout, nodeLayout, buffer, nodeIndex));
    }
  } else {
    for (let i = 0; i < header.count; ++i) {
      const nodeIndex = (header.head + i) % allocLen;
      nodes.push(decodeQueueItem(headerLayout, nodeLayout, buffer, nodeIndex));
    }
  }
  return { header, nodes };
}

export function decodeEventsSince(buffer: Buffer, lastSeqNum: number): Event[] {
  const header = EVENT_QUEUE_HEADER.decode(buffer);
  const allocLen = Math.floor(
    (buffer.length - EVENT_QUEUE_HEADER.span) / EVENT.span,
  );

  // calculate number of missed events
  // account for u32 & ringbuffer overflows
  const modulo32Uint = 0x100000000;
  let missedEvents = (header.seqNum - lastSeqNum + modulo32Uint) % modulo32Uint;
  if (missedEvents > allocLen) {
    missedEvents = allocLen - 1;
  }
  const startSeq = (header.seqNum - missedEvents + modulo32Uint) % modulo32Uint;

  // define boundary indexes in ring buffer [start;end)
  const endIndex = (header.head + header.count) % allocLen;
  const startIndex = (endIndex - missedEvents + allocLen) % allocLen;

  const results: Event[] = [];
  for (let i = 0; i < missedEvents; ++i) {
    const nodeIndex = (startIndex + i) % allocLen;
    const event = decodeQueueItem(EVENT_QUEUE_HEADER, EVENT, buffer, nodeIndex);
    event.seqNum = (startSeq + i) % modulo32Uint;
    results.push(event);
  }
  return results;
}

export function decodeRequestQueue(buffer: Buffer, history?: number) {
  const { header, nodes } = decodeQueue(
    REQUEST_QUEUE_HEADER,
    REQUEST,
    buffer,
    history,
  );
  if (!header.accountFlags.initialized || !header.accountFlags.requestQueue) {
    throw new Error('Invalid requests queue');
  }
  return nodes;
}

export function decodeEventQueue(buffer: Buffer, history?: number): Event[] {
  const { header, nodes } = decodeQueue(
    EVENT_QUEUE_HEADER,
    EVENT,
    buffer,
    history,
  );
  if (!header.accountFlags.initialized || !header.accountFlags.eventQueue) {
    throw new Error('Invalid events queue');
  }
  return nodes;
}

export const REQUEST_QUEUE_LAYOUT = {
  HEADER: REQUEST_QUEUE_HEADER,
  NODE: REQUEST,
};

export const EVENT_QUEUE_LAYOUT = {
  HEADER: EVENT_QUEUE_HEADER,
  NODE: EVENT,
};

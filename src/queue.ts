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
  u8('ownerSlot'),
  blob(6),
  u64('maxBaseSizeOrCancelId'),
  u64('maxQuoteSize'),
  u128('orderId'),
  publicKeyLayout('owner'),
]);

const EVENT_QUEUE_HEADER = struct([
  accountFlagsLayout('accountFlags'),
  u32('head'),
  zeros(4),
  u32('count'),
  zeros(4),
]);

const EVENT_FLAGS = bits(u8(), false, 'eventFlags');
EVENT_FLAGS.addBoolean('fill');
EVENT_FLAGS.addBoolean('out');
EVENT_FLAGS.addBoolean('bid');
EVENT_FLAGS.addBoolean('maker');

const EVENT = struct([
  EVENT_FLAGS,
  u8('ownerSlot'),
  blob(6),
  u64('quantityReleased'),
  u64('quantityPaid'),
  u128('orderId'),
  publicKeyLayout('owner'),
]);

export interface Event {
  eventFlags: any;
  ownerSlot: number;
  quantityReleased: BN;
  quantityPaid: BN;
  orderId: BN;
  owner: PublicKey;
}

function decodeQueue(headerLayout, nodeLayout, buffer) {
  const header = headerLayout.decode(buffer);
  const allocLen = Math.floor(
    (buffer.length - headerLayout.span) / nodeLayout.span,
  );
  const nodes: any[] = [];
  for (let i = 0; i < header.count; ++i) {
    const nodeIndex = (header.head + i) % allocLen;
    nodes.push(
      nodeLayout.decode(
        buffer,
        headerLayout.span + nodeIndex * nodeLayout.span,
      ),
    );
  }
  return { header, nodes };
}

export function decodeRequestQueue(buffer: Buffer) {
  const { header, nodes } = decodeQueue(REQUEST_QUEUE_HEADER, REQUEST, buffer);
  if (!header.accountFlags.initialized || !header.accountFlags.requestQueue) {
    throw new Error('Invalid requests queue');
  }
  return nodes;
}

export function decodeEventQueue(buffer: Buffer): Event[] {
  const { header, nodes } = decodeQueue(EVENT_QUEUE_HEADER, EVENT, buffer);
  if (!header.accountFlags.initialized || !header.accountFlags.eventQueue) {
    throw new Error('Invalid events queue');
  }
  return nodes;
}

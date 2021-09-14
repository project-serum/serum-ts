import BN from 'bn.js';
import {
  decodeEventQueue,
  decodeEventsSince,
  EVENT_QUEUE_LAYOUT,
} from './queue';

// convenience definitions for readability
const QueueHeader = EVENT_QUEUE_LAYOUT.HEADER;
const Event = EVENT_QUEUE_LAYOUT.NODE;
const seqNum = (e) => e.seqNum;
const orderId = (e) => e.orderId.toNumber();

function queueWith(head, count, seqNum) {
  const size = 4;
  const b = Buffer.alloc(QueueHeader.span + size * Event.span);
  QueueHeader.encode(
    {
      accountFlags: { initialized: true, eventQueue: true },
      head,
      count,
      seqNum,
    },
    b,
    0,
  );

  // use order id to encode the offset from the beginning for easy tests
  for (let i = 0; i < size; i++) {
    Event.encode({ orderId: new BN(0) }, b, QueueHeader.span + i * Event.span);
  }

  return b;
}

test('should decode empty queue', () => {
  const q = queueWith(0, 0, 0);
  // [0, 1, 2, 3]
  //  ^
  //  0

  expect(decodeEventQueue(q)).toEqual([]);
  expect(decodeEventQueue(q, 4).map(orderId)).toEqual([3, 2, 1, 0]);
  expect(decodeEventQueue(q, 4).map(seqNum)).toEqual([-1, -2, -3, -4]);
  expect(decodeEventsSince(q, 0)).toEqual([]);
  expect(decodeEventsSince(q, 3)).toEqual([]);
});

test('should decode empty queue from mid', () => {
  const q = queueWith(2, 0, 2);
  // [0, 1, 2, 3]
  //        ^
  //        2

  expect(decodeEventQueue(q).map(orderId)).toEqual([]);
  expect(decodeEventQueue(q).map(seqNum)).toEqual([]);
  expect(decodeEventQueue(q, 4).map(orderId)).toEqual([1, 0, 3, 2]);
  expect(decodeEventQueue(q, 4).map(seqNum)).toEqual([1, 0, -1, -2]);
  expect(decodeEventsSince(q, 0).map(orderId)).toEqual([0, 1]);
  expect(decodeEventsSince(q, 0).map(seqNum)).toEqual([0, 1]);
});

test('should decode full event queue after roll-over', () => {
  const q = queueWith(2, 4, 6);
  // [0, 1, 2, 3]
  //        ^
  //        6

  expect(decodeEventQueue(q).map(orderId)).toEqual([2, 3, 0, 1]);
  expect(decodeEventQueue(q).map(seqNum)).toEqual([2, 3, 4, 5]);
  expect(decodeEventQueue(q, 4).map(orderId)).toEqual([2, 3, 0, 1].reverse());
  expect(decodeEventQueue(q, 4).map(seqNum)).toEqual([2, 3, 4, 5].reverse());
  expect(decodeEventsSince(q, 0).map(seqNum)).toEqual([2, 3, 4, 5]);
  expect(decodeEventsSince(q, 1).map(seqNum)).toEqual([2, 3, 4, 5]);
  expect(decodeEventsSince(q, 2).map(seqNum)).toEqual([2, 3, 4, 5]);
  expect(decodeEventsSince(q, 3).map(seqNum)).toEqual([3, 4, 5]);
  expect(decodeEventsSince(q, 4).map(seqNum)).toEqual([4, 5]);
  expect(decodeEventsSince(q, 5).map(seqNum)).toEqual([5]);
  expect(decodeEventsSince(q, 6).map(seqNum)).toEqual([]);
  expect(decodeEventsSince(q, 7).map(seqNum)).toEqual([]);
});

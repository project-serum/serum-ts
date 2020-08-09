import { blob, offset, seq, struct, u32, u8, union } from 'buffer-layout';
import { publicKeyLayout, u128, u64, zeros } from './layout';

const SLAB_HEADER_LAYOUT = struct(
  [
    // Number of modified slab nodes
    u32('bumpIndex'),
    zeros(4), // Consider slabs with more than 2^32 nodes to be invalid

    // Linked list of unused nodes
    u32('freeListLen'),
    zeros(4),
    u32('freeListHead'),

    u32('root'),

    u32('leafCount'),
    zeros(4),
  ],
  'header',
);

const SLAB_NODE_LAYOUT = union(u32('tag'), blob(60), 'node');
SLAB_NODE_LAYOUT.addVariant(0, struct([]), 'uninitialized');
SLAB_NODE_LAYOUT.addVariant(
  1,
  struct([
    // Only the first prefixLen high-order bits of key are meaningful
    u32('prefixLen'),
    u128('key'),
    seq(u32(), 2, 'children'),
  ]),
  'innerNode',
);
SLAB_NODE_LAYOUT.addVariant(
  2,
  struct([
    u8('ownerSlot'), // Index into OPEN_ORDERS_LAYOUT.orders
    blob(3),
    u128('key'), // (price, seqNum)
    publicKeyLayout('owner'),
    u64('quantity'), // In units of lot size
  ]),
  'leafNode',
);
SLAB_NODE_LAYOUT.addVariant(3, struct([u32('next')]), 'freeNode');
SLAB_NODE_LAYOUT.addVariant(4, struct([]), 'lastFreeNode');

export const SLAB_LAYOUT = struct([
  SLAB_HEADER_LAYOUT,
  seq(
    SLAB_NODE_LAYOUT,
    offset(
      SLAB_HEADER_LAYOUT.layoutFor('bumpIndex'),
      SLAB_HEADER_LAYOUT.offsetOf('bumpIndex') - SLAB_HEADER_LAYOUT.span,
    ),
    'nodes',
  ),
]);

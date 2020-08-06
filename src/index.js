import { u8, nu64, u32, seq, blob, struct, union, offset } from 'buffer-layout';
import { zeros, publicKeyLayout } from './layout';

const SLAB_HEADER_LAYOUT = struct(
  [
    u32('bumpIndex'),
    zeros(4),
    u32('freeListLen'),
    zeros(4),
    u32('freeListHead'),
    u32('rootNode'),
    u32('leafCount'),
    zeros(4),
  ],
  'header',
);

const SLAB_NODE_LAYOUT = union(u32('tag'), blob(60), 'node');
SLAB_NODE_LAYOUT.addVariant(0, struct([]), 'uninitialized');
SLAB_NODE_LAYOUT.addVariant(
  1,
  struct([u32('prefixLen'), blob(16, 'key'), seq(u32(), 2, 'children')]),
  'innerNode',
);
SLAB_NODE_LAYOUT.addVariant(
  2,
  struct([
    u8('ownerSlot'),
    blob(3),
    blob(16, 'key'),
    publicKeyLayout('owner'),
    nu64('quantity'),
  ]),
  'leafNode',
);
SLAB_NODE_LAYOUT.addVariant(3, struct([u32('next')]), 'freeNode');
SLAB_NODE_LAYOUT.addVariant(4, struct([]), 'lastFreeNode');

const SLAB_LAYOUT = struct([
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

export function parseSlab(slab) {
  const { header, nodes } = SLAB_LAYOUT.decode(slab);
  return { header, nodes };
}

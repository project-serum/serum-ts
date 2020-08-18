import BN from 'bn.js';
import { blob, offset, seq, struct, u32, u8, union } from 'buffer-layout';
import { publicKeyLayout, setLayoutDecoder, u128, u64, zeros } from './layout';
import { PublicKey } from '@solana/web3.js';

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
    publicKeyLayout('owner'), // Open orders account
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

export class Slab {
  private header: any;
  private nodes: any;

  constructor(header, nodes) {
    this.header = header;
    this.nodes = nodes;
  }

  static decode(buffer: Buffer) {
    return SLAB_LAYOUT.decode(buffer);
  }

  get(searchKey: BN | number) {
    if (this.header.leafCount === 0) {
      return null;
    }
    if (!(searchKey instanceof BN)) {
      searchKey = new BN(searchKey);
    }
    let index = this.header.root;
    while (true) {
      const { leafNode, innerNode } = this.nodes[index];
      if (leafNode) {
        if (leafNode.key.eq(searchKey)) {
          return leafNode;
        }
        return null;
      } else if (innerNode) {
        if (
          !innerNode.key
            .xor(searchKey)
            .iushrn(128 - innerNode.prefixLen)
            .isZero()
        ) {
          return null;
        }
        index =
          innerNode.children[
            searchKey.testn(128 - innerNode.prefixLen - 1) ? 1 : 0
          ];
      } else {
        throw new Error('Invalid slab');
      }
    }
  }

  [Symbol.iterator]() {
    return this.items(false);
  }

  *items(
    descending = false,
  ): Generator<{ ownerSlot: number; key: BN; owner: PublicKey; quantity: BN }> {
    if (this.header.leafCount === 0) {
      return;
    }
    const stack = [this.header.root];
    while (stack.length > 0) {
      const index = stack.pop();
      const { leafNode, innerNode } = this.nodes[index];
      if (leafNode) {
        yield leafNode;
      } else if (innerNode) {
        if (descending) {
          stack.push(innerNode.children[0], innerNode.children[1]);
        } else {
          stack.push(innerNode.children[1], innerNode.children[0]);
        }
      }
    }
  }
}

setLayoutDecoder(SLAB_LAYOUT, ({ header, nodes }) => new Slab(header, nodes));

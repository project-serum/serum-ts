import BN from 'bn.js';
import { SLAB_LAYOUT } from './slab-layout';

export class Slab {
  constructor(header, nodes) {
    this.header = header;
    this.nodes = nodes;
  }

  static from(buffer, offset = 0) {
    const { header, nodes } = SLAB_LAYOUT.decode(buffer, offset);
    return new Slab(header, nodes);
  }

  get = (searchKey) => {
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
  };
}

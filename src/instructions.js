import { blob, Layout, struct, u16, u32, u8, union } from 'buffer-layout';
import { u64 } from './layout';

class VersionedLayout extends Layout {
  constructor(version, inner, property) {
    super(inner.span > 0 ? inner.span + 1 : inner.span, property);
    this.version = version;
    this.inner = inner;
  }

  decode(b, offset = 0) {
    if (b.readUInt8(offset) !== this._version) {
      throw new Error('invalid version');
    }
    return this.inner.decode(b, offset + 1);
  }

  encode(src, b, offset = 0) {
    b.writeUInt8(this.version, offset);
    return 1 + this.inner.encode(src, b, offset + 1);
  }

  getSpan(b, offset = 0) {
    return 1 + this.inner.getSpan(b, offset + 1);
  }
}

export const INSTRUCTION_LAYOUT = new VersionedLayout(
  0,
  union(u32('instruction')),
);
INSTRUCTION_LAYOUT.inner.addVariant(
  0,
  struct([
    u64('baseLotSize'),
    u64('quoteLotSize'),
    u16('feeRateBps'),
    u64('vaultSignerNonce'),
    u64('quoteDustThreshold'),
  ]),
  'initializeMarket',
);
INSTRUCTION_LAYOUT.inner.addVariant(
  1,
  struct([
    u8('side'), // buy = 0, sell = 1
    blob(3),
    u64('limitPrice'),
    u64('maxQuantity'),
    u8('orderType'), // limit = 0, ioc = 1, postOnly = 2
    blob(3),
  ]),
  'newOrder',
);
INSTRUCTION_LAYOUT.inner.addVariant(
  2,
  struct([u16('limit'), blob(2)]),
  'matchOrders',
);
INSTRUCTION_LAYOUT.inner.addVariant(
  3,
  struct([u16('limit'), blob(2)]),
  'consumeEvents',
);
INSTRUCTION_LAYOUT.inner.addVariant(4, struct([]), 'cancelOrder');

export function encodeInstruction(instruction) {
  const b = Buffer.alloc(100);
  return b.slice(0, INSTRUCTION_LAYOUT.encode(instruction, b));
}

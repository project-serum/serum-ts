import { bits, Blob, Layout, u32 } from 'buffer-layout';
import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';

class Zeros extends Blob {
  decode(b, offset) {
    const slice = super.decode(b, offset);
    if (!slice.every((v) => v === 0)) {
      throw new Error('nonzero padding bytes');
    }
    return slice;
  }
}

export function zeros(length) {
  return new Zeros(length);
}

class PublicKeyLayout extends Blob {
  constructor(property) {
    super(32, property);
  }

  decode(b, offset) {
    return new PublicKey(super.decode(b, offset));
  }

  encode(src, b, offset) {
    return super.encode(src.toBuffer(), b, offset);
  }
}

export function publicKeyLayout(property) {
  return new PublicKeyLayout(property);
}

class BNLayout extends Blob {
  decode(b, offset) {
    return new BN(super.decode(b, offset), 10, 'le');
  }

  encode(src, b, offset) {
    return super.encode(src.toArrayLike(Buffer, 'le', this.span), b, offset);
  }
}

export function u64(property) {
  return new BNLayout(8, property);
}

export function u128(property) {
  return new BNLayout(16, property);
}

export class WideBits extends Layout {
  constructor(property) {
    super(8, property);
    this._lower = bits(u32(), false);
    this._upper = bits(u32(), false);
  }

  addBoolean(property) {
    if (this._lower.fields.length < 32) {
      this._lower.addBoolean(property);
    } else {
      this._upper.addBoolean(property);
    }
  }

  decode(b, offset = 0) {
    const lowerDecoded = this._lower.decode(b, offset);
    const upperDecoded = this._upper.decode(b, offset + this._lower.span);
    return { ...lowerDecoded, ...upperDecoded };
  }

  encode(src, b, offset = 0) {
    return (
      this._lower.encode(src, b, offset) +
      this._upper.encode(src, b, offset + this._lower.span)
    );
  }
}

export class VersionedLayout extends Layout {
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

export function setLayoutDecoder(layout, decoder) {
  const originalDecode = layout.decode;
  layout.decode = function decode(b, offset = 0) {
    return decoder(originalDecode.call(this, b, offset));
  };
}

export function setLayoutEncoder(layout, encoder) {
  const originalEncode = layout.encode;
  layout.encode = function encode(src, b, offset) {
    return originalEncode(encoder(src), b, offset);
  };
  return layout;
}

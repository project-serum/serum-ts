import { Blob } from 'buffer-layout';
import { PublicKey } from '@solana/web3.js';

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

import { struct, Layout } from 'buffer-layout';
import { bool, publicKey } from '@project-serum/borsh';
import { PublicKey } from '@solana/web3.js';

export interface Safe {
  initialized: boolean;
  authority: PublicKey;
  whitelist: PublicKey;
}

export const SAFE_LAYOUT: Layout<Safe> = struct([
  bool('initialized'),
  publicKey('authority'),
  publicKey('whitelist'),
]);

export function decode(data: Buffer): Safe {
  return SAFE_LAYOUT.decode(data);
}

export function encode(s: Safe): Buffer {
  const buffer = Buffer.alloc(1000); // TODO: use a tighter buffer.
  const len = SAFE_LAYOUT.encode(s, buffer);
  return buffer.slice(0, len);
}

export const SIZE = encode({
  initialized: false,
  authority: new PublicKey(Buffer.alloc(32)),
  whitelist: new PublicKey(Buffer.alloc(32)),
}).length;

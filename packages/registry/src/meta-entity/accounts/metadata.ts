import { struct, Layout } from 'buffer-layout';
import { PublicKey } from '@solana/web3.js';
import { bool, publicKey, str } from '@project-serum/borsh';

export interface Metadata {
  initialized: boolean;
  entity: PublicKey;
  authority: PublicKey;
  name: string;
  about: string;
  imageUrl: string;
  chat: PublicKey;
}

const METADATA_LAYOUT: Layout<Metadata> = struct([
  bool('initialized'),
  publicKey('entity'),
  publicKey('authority'),
  str('name'),
  str('about'),
  str('imageUrl'),
  publicKey('chat'),
]);

export function decode(data: Buffer): Metadata {
  return METADATA_LAYOUT.decode(data);
}

export function encode(e: Metadata): Buffer {
  const buffer = Buffer.alloc(1000); // TODO: use a tighter buffer.
  const len = METADATA_LAYOUT.encode(e, buffer);
  return buffer.slice(0, len);
}

export const SIZE = 280 * 2 + 32;

export function defaultMetadata(): Metadata {
  return {
    initialized: true,
    entity: new PublicKey(Buffer.alloc(32)),
    authority: new PublicKey(Buffer.alloc(32)),
    name: '',
    about: '',
    imageUrl: '',
    chat: new PublicKey(Buffer.alloc(32)),
  };
}

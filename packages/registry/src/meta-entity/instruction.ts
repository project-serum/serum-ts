import { struct, Layout } from 'buffer-layout';
import {
  option,
  publicKey,
  str,
  rustEnum,
  u64,
  vecU8,
} from '@project-serum/borsh';
import { PublicKey } from '@solana/web3.js';

export type MetaEntityInstruction =
  | { initialize: Initialize }
  | { updateMetaEntity: UpdateMetaEntity }
  | { sendMessage: SendMessage };

type Initialize = {
  entity: PublicKey;
  authority: PublicKey;
  name: string;
  about: string;
  imageUrl: string;
  chat: PublicKey;
};

type UpdateMetaEntity = {
  name: string | null;
  about: string | null;
  imageUrl: string | null;
  chat: PublicKey | null;
};

type SendMessage = {
  data: Buffer;
};

const META_ENTITY_INSTRUCTION_LAYOUT: Layout<MetaEntityInstruction> = rustEnum([
  struct(
    [
      publicKey('entity'),
      publicKey('authority'),
      str('name'),
      str('about'),
      str('imageUrl'),
      publicKey('chat'),
    ],
    'initialize',
  ),
  struct(
    [
      option(str(), 'name'),
      option(str(), 'about'),
      option(publicKey(), 'chat'),
    ],
    'updateMetaEntity',
  ),
  struct([vecU8('data')], 'sendMessage'),
]);

export function decode(data: Buffer): MetaEntityInstruction {
  return META_ENTITY_INSTRUCTION_LAYOUT.decode(data);
}

export function encode(i: MetaEntityInstruction): Buffer {
  const buffer = Buffer.alloc(1000); // TODO: use a tighter buffer.
  const len = META_ENTITY_INSTRUCTION_LAYOUT.encode(i, buffer);
  return buffer.slice(0, len);
}

import { struct, Layout } from 'buffer-layout';
import { rustEnum } from '@project-serum/borsh';

// Simplified since we only use the SetBuffer variant.
export type IdlInstruction =
  | Create
  | CreateBuffer
  | Write
  | SetBuffer
  | SetAuthority;

type Create = {};
type CreateBuffer = {};
type Write = {};
type SetBuffer = {};
type SetAuthority = {};

const IDL_INSTRUCTION_LAYOUT: Layout<IdlInstruction> = rustEnum([
  struct([], 'create'),
  struct([], 'createBuffer'),
  struct([], 'write'),
  struct([], 'setBuffer'),
  struct([], 'setAuthority'),
]);

export function encodeInstruction(i: IdlInstruction): Buffer {
  const buffer = Buffer.alloc(1000); // TODO: use a tighter buffer.
  const len = IDL_INSTRUCTION_LAYOUT.encode(i, buffer);
  return Buffer.concat([IDL_TAG, buffer.slice(0, len)]);
}

// Reverse for little endian.
export const IDL_TAG = Buffer.from('0a69e9a778bcf440', 'hex').reverse();

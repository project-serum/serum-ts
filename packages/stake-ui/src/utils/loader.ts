import { struct, Layout } from 'buffer-layout';
import { publicKey, rustEnum } from '@project-serum/borsh';

// Simplified since we only use the Upgrade variant.
export type UpgradeableLoaderInstruction =
  | InitializeBuffer
  | Write
  | DeployWithMaxDataLen
  | Upgrade
  | SetAuthority;

type InitializeBuffer = {};
type Write = {};
type DeployWithMaxDataLen = {};
type Upgrade = {};
type SetAuthority = {};

const UPGRADEABLE_LOADER_INSTRUCTION_LAYOUT: Layout<UpgradeableLoaderInstruction> = rustEnum(
  [
    struct([], 'initalizeBufer'),
    struct([], 'write'),
    struct([], 'deployWithMaxDataLen'),
    struct([], 'upgrade'),
    struct([], 'setAuthority'),
  ],
);

export function encodeInstruction(i: UpgradeableLoaderInstruction): Buffer {
  const buffer = Buffer.alloc(1000); // TODO: use a tighter buffer.
  const len = UPGRADEABLE_LOADER_INSTRUCTION_LAYOUT.encode(i, buffer);
  return buffer.slice(0, len);
}

const UPGRADEABLE_LOADER_STATE_LAYOUT: Layout<any> = rustEnum([
  struct([], 'uninitialized'),
  struct([], 'buffer'),
  struct([publicKey('programdataAddress')], 'program'),
  struct([], 'programData'),
]);

export function decodeState(data: Buffer): any {
  return UPGRADEABLE_LOADER_STATE_LAYOUT.decode(data);
}

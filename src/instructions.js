import { blob, Layout, struct, u16, u32, u8, union } from 'buffer-layout';
import { u64, VersionedLayout } from './layout';
import { PublicKey } from '@solana/web3.js';

export const DEX_PROGRAM_ID = new PublicKey(
  '6iM2JjaPVViB2u82aVjf3ZfHDNHQ4G635XgnvgN6CNhY',
);

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

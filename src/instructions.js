import { struct, u16, u32, u8, union } from 'buffer-layout';
import {
  orderTypeLayout,
  publicKeyLayout,
  sideLayout,
  u128,
  u64,
  VersionedLayout,
} from './layout';
import { PublicKey, TransactionInstruction } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from './token-instructions';

export const DEX_PROGRAM_ID = new PublicKey(
  'DXgi6RmREQNFnWRV4gP28CQFdp4k8f6YSqGjH6fgJLDq',
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
    sideLayout('side'),
    u64('limitPrice'),
    u64('maxQuantity'),
    orderTypeLayout('orderType'),
  ]),
  'newOrder',
);
INSTRUCTION_LAYOUT.inner.addVariant(2, struct([u16('limit')]), 'matchOrders');
INSTRUCTION_LAYOUT.inner.addVariant(3, struct([u16('limit')]), 'consumeEvents');
INSTRUCTION_LAYOUT.inner.addVariant(
  4,
  struct([
    sideLayout('side'),
    u128('orderId'),
    publicKeyLayout('openOrders'),
    u8('openOrdersSlot'),
  ]),
  'cancelOrder',
);
INSTRUCTION_LAYOUT.inner.addVariant(5, struct([]), 'settleFunds');

export function encodeInstruction(instruction) {
  const b = Buffer.alloc(100);
  return b.slice(0, INSTRUCTION_LAYOUT.encode(instruction, b));
}

export class DexInstructions {
  static initializeMarket({
    market,
    requestQueue,
    eventQueue,
    bids,
    asks,
    baseVault,
    quoteVault,
    baseMint,
    quoteMint,
    baseLotSize,
    quoteLotSize,
    feeRateBps,
    vaultSignerNonce,
    quoteDustThreshold,
  }) {
    return new TransactionInstruction({
      keys: [
        { pubkey: market, isSigner: false, isWritable: true },
        { pubkey: requestQueue, isSigner: false, isWritable: true },
        { pubkey: eventQueue, isSigner: false, isWritable: true },
        { pubkey: bids, isSigner: false, isWritable: true },
        { pubkey: asks, isSigner: false, isWritable: true },
        { pubkey: baseVault, isSigner: false, isWritable: true },
        { pubkey: quoteVault, isSigner: false, isWritable: true },
        { pubkey: baseMint, isSigner: false, isWritable: false },
        { pubkey: quoteMint, isSigner: false, isWritable: false },
      ],
      programId: DEX_PROGRAM_ID,
      data: encodeInstruction({
        initializeMarket: {
          baseLotSize,
          quoteLotSize,
          feeRateBps,
          vaultSignerNonce,
          quoteDustThreshold,
        },
      }),
    });
  }

  static newOrder({
    market,
    openOrders,
    payer,
    owner,
    requestQueue,
    baseVault,
    quoteVault,
    side,
    limitPrice,
    maxQuantity,
    orderType,
  }) {
    return new TransactionInstruction({
      keys: [
        { pubkey: market, isSigner: false, isWritable: false },
        { pubkey: openOrders, isSigner: false, isWritable: true },
        { pubkey: requestQueue, isSigner: false, isWritable: true },
        { pubkey: payer, isSigner: false, isWritable: true },
        { pubkey: owner, isSigner: true, isWritable: false },
        { pubkey: baseVault, isSigner: false, isWritable: true },
        { pubkey: quoteVault, isSigner: false, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      ],
      programId: DEX_PROGRAM_ID,
      data: encodeInstruction({
        newOrder: { side, limitPrice, maxQuantity, orderType },
      }),
    });
  }

  static matchOrders({
    market,
    requestQueue,
    eventQueue,
    bids,
    asks,
    baseVault,
    quoteVault,
    limit,
  }) {
    return new TransactionInstruction({
      keys: [
        { pubkey: market, isSigner: false, isWritable: true },
        { pubkey: requestQueue, isSigner: false, isWritable: true },
        { pubkey: eventQueue, isSigner: false, isWritable: true },
        { pubkey: bids, isSigner: false, isWritable: true },
        { pubkey: asks, isSigner: false, isWritable: true },
        { pubkey: baseVault, isSigner: false, isWritable: true },
        { pubkey: quoteVault, isSigner: false, isWritable: true },
      ],
      programId: DEX_PROGRAM_ID,
      data: encodeInstruction({ matchOrders: { limit } }),
    });
  }

  static consumeEvents({ market, eventQueue, openOrdersAccounts, limit }) {
    return new TransactionInstruction({
      keys: [
        ...openOrdersAccounts.map((account) => ({
          pubkey: account,
          isSigner: false,
          isWritable: true,
        })),
        { pubkey: market, isSigner: false, isWritable: true },
        { pubkey: eventQueue, isSigner: false, isWritable: true },
      ],
      programId: DEX_PROGRAM_ID,
      data: encodeInstruction({ consumeEvents: { limit } }),
    });
  }

  static cancelOrder({
    market,
    openOrders,
    owner,
    requestQueue,
    side,
    orderId,
    openOrdersSlot,
  }) {
    return new TransactionInstruction({
      keys: [
        { pubkey: market, isSigner: false, isWritable: false },
        { pubkey: openOrders, isSigner: false, isWritable: true },
        { pubkey: requestQueue, isSigner: false, isWritable: true },
        { pubkey: owner, isSigner: true, isWritable: false },
      ],
      programId: DEX_PROGRAM_ID,
      data: encodeInstruction({
        cancelOrder: { side, orderId, openOrders, openOrdersSlot },
      }),
    });
  }

  static settleFunds({
    market,
    openOrders,
    owner,
    baseVault,
    quoteVault,
    baseWallet,
    quoteWallet,
    vaultSigner,
  }) {
    return new TransactionInstruction({
      keys: [
        { pubkey: market, isSigner: false, isWritable: true },
        { pubkey: openOrders, isSigner: false, isWritable: true },
        { pubkey: owner, isSigner: true, isWritable: false },
        { pubkey: baseVault, isSigner: false, isWritable: true },
        { pubkey: quoteVault, isSigner: false, isWritable: true },
        { pubkey: baseWallet, isSigner: false, isWritable: true },
        { pubkey: quoteWallet, isSigner: false, isWritable: true },
        { pubkey: vaultSigner, isSigner: false, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      ],
      programId: DEX_PROGRAM_ID,
      data: encodeInstruction({
        settleFunds: {},
      }),
    });
  }
}

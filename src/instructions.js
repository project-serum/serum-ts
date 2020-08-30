import { struct, u16, u32, u8, union } from 'buffer-layout';
import {
  orderTypeLayout,
  publicKeyLayout,
  sideLayout,
  u128,
  u64,
  VersionedLayout,
} from './layout';
import {
  PublicKey,
  SYSVAR_RENT_PUBKEY,
  TransactionInstruction,
} from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from './token-instructions';

export const DEX_PROGRAM_ID = new PublicKey(
  '5sBco58q1hJroiGW8Rus351GRf7DG2bPXRrby3xg6x35',
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
    u64('clientId'),
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
INSTRUCTION_LAYOUT.inner.addVariant(
  6,
  struct([u64('clientId')]),
  'cancelOrderByClientId',
);

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
    programId = DEX_PROGRAM_ID,
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
      programId,
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
    clientId,
    programId = DEX_PROGRAM_ID,
  }) {
    return new TransactionInstruction({
      keys: [
        { pubkey: market, isSigner: false, isWritable: true },
        { pubkey: openOrders, isSigner: false, isWritable: true },
        { pubkey: requestQueue, isSigner: false, isWritable: true },
        { pubkey: payer, isSigner: false, isWritable: true },
        { pubkey: owner, isSigner: true, isWritable: false },
        { pubkey: baseVault, isSigner: false, isWritable: true },
        { pubkey: quoteVault, isSigner: false, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
      ],
      programId,
      data: encodeInstruction({
        newOrder: clientId
          ? { side, limitPrice, maxQuantity, orderType, clientId }
          : { side, limitPrice, maxQuantity, orderType },
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
    programId = DEX_PROGRAM_ID,
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
      programId,
      data: encodeInstruction({ matchOrders: { limit } }),
    });
  }

  static consumeEvents({
    market,
    eventQueue,
    openOrdersAccounts,
    limit,
    programId = DEX_PROGRAM_ID,
  }) {
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
      programId,
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
    programId = DEX_PROGRAM_ID,
  }) {
    return new TransactionInstruction({
      keys: [
        { pubkey: market, isSigner: false, isWritable: false },
        { pubkey: openOrders, isSigner: false, isWritable: true },
        { pubkey: requestQueue, isSigner: false, isWritable: true },
        { pubkey: owner, isSigner: true, isWritable: false },
      ],
      programId,
      data: encodeInstruction({
        cancelOrder: { side, orderId, openOrders, openOrdersSlot },
      }),
    });
  }

  static cancelOrderByClientId({
    market,
    openOrders,
    owner,
    requestQueue,
    clientId,
    programId = DEX_PROGRAM_ID,
  }) {
    return new TransactionInstruction({
      keys: [
        { pubkey: market, isSigner: false, isWritable: false },
        { pubkey: openOrders, isSigner: false, isWritable: true },
        { pubkey: requestQueue, isSigner: false, isWritable: true },
        { pubkey: owner, isSigner: true, isWritable: false },
      ],
      programId,
      data: encodeInstruction({
        cancelOrderByClientId: { clientId },
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
    programId = DEX_PROGRAM_ID,
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
      programId,
      data: encodeInstruction({
        settleFunds: {},
      }),
    });
  }
}

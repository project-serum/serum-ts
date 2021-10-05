import { struct, u16, u32, u8, union } from 'buffer-layout';
import {
  orderTypeLayout,
  publicKeyLayout,
  selfTradeBehaviorLayout,
  sideLayout,
  u128,
  u64,
  VersionedLayout,
} from './layout';
import {
  SYSVAR_RENT_PUBKEY,
  TransactionInstruction,
  PublicKey,
} from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from './token-instructions';

// NOTE: Update these if the position of arguments for the settleFunds instruction changes
export const SETTLE_FUNDS_BASE_WALLET_INDEX = 5;
export const SETTLE_FUNDS_QUOTE_WALLET_INDEX = 6;

// NOTE: Update these if the position of arguments for the newOrder instruction changes
export const NEW_ORDER_OPEN_ORDERS_INDEX = 1;
export const NEW_ORDER_OWNER_INDEX = 4;

// NOTE: Update these if the position of arguments for the newOrder instruction changes
export const NEW_ORDER_V3_OPEN_ORDERS_INDEX = 1;
export const NEW_ORDER_V3_OWNER_INDEX = 7;

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
INSTRUCTION_LAYOUT.inner.addVariant(
  10,
  struct([
    sideLayout('side'),
    u64('limitPrice'),
    u64('maxBaseQuantity'),
    u64('maxQuoteQuantity'),
    selfTradeBehaviorLayout('selfTradeBehavior'),
    orderTypeLayout('orderType'),
    u64('clientId'),
    u16('limit'),
  ]),
  'newOrderV3',
);
INSTRUCTION_LAYOUT.inner.addVariant(
  11,
  struct([sideLayout('side'), u128('orderId')]),
  'cancelOrderV2',
);
INSTRUCTION_LAYOUT.inner.addVariant(
  12,
  struct([u64('clientId')]),
  'cancelOrderByClientIdV2',
);
INSTRUCTION_LAYOUT.inner.addVariant(14, struct([]), 'closeOpenOrders');
INSTRUCTION_LAYOUT.inner.addVariant(15, struct([]), 'initOpenOrders');
INSTRUCTION_LAYOUT.inner.addVariant(16, struct([u16('limit')]), 'prune');
INSTRUCTION_LAYOUT.inner.addVariant(17, struct([u16('limit')]), 'consumeEventsPermissioned');

export function encodeInstruction(instruction) {
  const b = Buffer.alloc(100);
  return b.slice(0, INSTRUCTION_LAYOUT.encode(instruction, b));
}

export function decodeInstruction(message) {
  return INSTRUCTION_LAYOUT.decode(message);
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
    programId,
    authority = undefined,
    pruneAuthority = undefined,
    crankAuthority = undefined,
  }) {
    let rentSysvar = new PublicKey(
      'SysvarRent111111111111111111111111111111111',
    );
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
        // Use a dummy address if using the new dex upgrade to save tx space.
        {
          pubkey: authority ? quoteMint : SYSVAR_RENT_PUBKEY,
          isSigner: false,
          isWritable: false,
        },
      ]
        .concat(
          authority
            ? { pubkey: authority, isSigner: false, isWritable: false }
            : [],
        )
        .concat(
          authority && pruneAuthority
            ? { pubkey: pruneAuthority, isSigner: false, isWritable: false }
            : [],
        )
        .concat(
          authority && pruneAuthority && crankAuthority
            ? { pubkey: crankAuthority, isSigner: false, isWritable: false }
            : [],
        ),
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
    programId,
    feeDiscountPubkey = null,
  }) {
    const keys = [
      { pubkey: market, isSigner: false, isWritable: true },
      { pubkey: openOrders, isSigner: false, isWritable: true },
      { pubkey: requestQueue, isSigner: false, isWritable: true },
      { pubkey: payer, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: false },
      { pubkey: baseVault, isSigner: false, isWritable: true },
      { pubkey: quoteVault, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    ];
    if (feeDiscountPubkey) {
      keys.push({
        pubkey: feeDiscountPubkey,
        isSigner: false,
        isWritable: false,
      });
    }
    return new TransactionInstruction({
      keys,
      programId,
      data: encodeInstruction({
        newOrder: clientId
          ? { side, limitPrice, maxQuantity, orderType, clientId }
          : { side, limitPrice, maxQuantity, orderType },
      }),
    });
  }

  static newOrderV3({
    market,
    openOrders,
    payer,
    owner,
    requestQueue,
    eventQueue,
    bids,
    asks,
    baseVault,
    quoteVault,
    side,
    limitPrice,
    maxBaseQuantity,
    maxQuoteQuantity,
    orderType,
    clientId,
    programId,
    selfTradeBehavior,
    feeDiscountPubkey = null,
  }) {
    const keys = [
      { pubkey: market, isSigner: false, isWritable: true },
      { pubkey: openOrders, isSigner: false, isWritable: true },
      { pubkey: requestQueue, isSigner: false, isWritable: true },
      { pubkey: eventQueue, isSigner: false, isWritable: true },
      { pubkey: bids, isSigner: false, isWritable: true },
      { pubkey: asks, isSigner: false, isWritable: true },
      { pubkey: payer, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: false },
      { pubkey: baseVault, isSigner: false, isWritable: true },
      { pubkey: quoteVault, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    ];
    if (feeDiscountPubkey) {
      keys.push({
        pubkey: feeDiscountPubkey,
        isSigner: false,
        isWritable: false,
      });
    }
    return new TransactionInstruction({
      keys,
      programId,
      data: encodeInstruction({
        newOrderV3: {
          side,
          limitPrice,
          maxBaseQuantity,
          maxQuoteQuantity,
          selfTradeBehavior,
          orderType,
          clientId,
          limit: 65535,
        },
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
    programId,
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
    coinFee,
    pcFee,
    openOrdersAccounts,
    limit,
    programId,
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
        { pubkey: coinFee, isSigner: false, isWriteable: true },
        { pubkey: pcFee, isSigner: false, isWritable: true },
      ],
      programId,
      data: encodeInstruction({ consumeEvents: { limit } }),
    });
  }

  static consumeEventsPermissioned({
    market,
    eventQueue,
    crankAuthority,
    openOrdersAccounts,
    limit,
    programId,
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
        { pubkey: crankAuthority, isSigner: true, isWritable: false },
      ],
      programId,
      data: encodeInstruction({ consumeEventsPermissioned: { limit } }),
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
    programId,
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

  static cancelOrderV2(order) {
    const {
      market,
      bids,
      asks,
      eventQueue,
      openOrders,
      owner,
      side,
      orderId,
      programId,
    } = order;
    return new TransactionInstruction({
      keys: [
        { pubkey: market, isSigner: false, isWritable: false },
        { pubkey: bids, isSigner: false, isWritable: true },
        { pubkey: asks, isSigner: false, isWritable: true },
        { pubkey: openOrders, isSigner: false, isWritable: true },
        { pubkey: owner, isSigner: true, isWritable: false },
        { pubkey: eventQueue, isSigner: false, isWritable: true },
      ],
      programId,
      data: encodeInstruction({
        cancelOrderV2: { side, orderId },
      }),
    });
  }

  static cancelOrderByClientId({
    market,
    openOrders,
    owner,
    requestQueue,
    clientId,
    programId,
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

  static cancelOrderByClientIdV2({
    market,
    openOrders,
    owner,
    bids,
    asks,
    eventQueue,
    clientId,
    programId,
  }) {
    return new TransactionInstruction({
      keys: [
        { pubkey: market, isSigner: false, isWritable: false },
        { pubkey: bids, isSigner: false, isWritable: true },
        { pubkey: asks, isSigner: false, isWritable: true },
        { pubkey: openOrders, isSigner: false, isWritable: true },
        { pubkey: owner, isSigner: true, isWritable: false },
        { pubkey: eventQueue, isSigner: false, isWritable: true },
      ],
      programId,
      data: encodeInstruction({
        cancelOrderByClientIdV2: { clientId },
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
    programId,
    referrerQuoteWallet = null,
  }) {
    const keys = [
      { pubkey: market, isSigner: false, isWritable: true },
      { pubkey: openOrders, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: false },
      { pubkey: baseVault, isSigner: false, isWritable: true },
      { pubkey: quoteVault, isSigner: false, isWritable: true },
      { pubkey: baseWallet, isSigner: false, isWritable: true },
      { pubkey: quoteWallet, isSigner: false, isWritable: true },
      { pubkey: vaultSigner, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ];
    if (referrerQuoteWallet) {
      keys.push({
        pubkey: referrerQuoteWallet,
        isSigner: false,
        isWritable: true,
      });
    }
    return new TransactionInstruction({
      keys,
      programId,
      data: encodeInstruction({
        settleFunds: {},
      }),
    });
  }

  static closeOpenOrders({ market, openOrders, owner, solWallet, programId }) {
    const keys = [
      { pubkey: openOrders, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: false },
      { pubkey: solWallet, isSigner: false, isWritable: true },
      { pubkey: market, isSigner: false, isWritable: false },
    ];
    return new TransactionInstruction({
      keys,
      programId,
      data: encodeInstruction({
        closeOpenOrders: {},
      }),
    });
  }

  static initOpenOrders({
    market,
    openOrders,
    owner,
    programId,
    marketAuthority,
  }) {
    const keys = [
      { pubkey: openOrders, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: false },
      { pubkey: market, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    ].concat(
      marketAuthority
        ? { pubkey: marketAuthority, isSigner: false, isWritable: false }
        : [],
    );
    return new TransactionInstruction({
      keys,
      programId,
      data: encodeInstruction({
        initOpenOrders: {},
      }),
    });
  }

  static prune({
    market,
    bids,
    asks,
    eventQueue,
    pruneAuthority,
    openOrders,
    openOrdersOwner,
    programId,
    limit,
  }) {
    const keys = [
      { pubkey: market, isSigner: false, isWritable: true },
      { pubkey: bids, isSigner: false, isWritable: true },
      { pubkey: asks, isSigner: false, isWritable: true },
      // Keep signer false so that one can use a PDA.
      { pubkey: pruneAuthority, isSigner: false, isWritable: false },
      { pubkey: openOrders, isSigner: false, isWritable: true },
      { pubkey: openOrdersOwner, isSigner: false, isWritable: false },
      { pubkey: eventQueue, isSigner: false, isWritable: true },
    ];
    return new TransactionInstruction({
      keys,
      programId,
      data: encodeInstruction({
        prune: { limit },
      }),
    });
  }
}

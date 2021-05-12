import { Idl } from '@project-serum/anchor';

// Idl for client generation.
export const IDL: Idl = {
  version: '0.0.0',
  name: 'swap',
  instructions: [
    {
      name: 'initAccount',
      accounts: [
        {
          name: 'openOrders',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'authority',
          isMut: false,
          isSigner: true,
        },
        {
          name: 'market',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'dexProgram',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'rent',
          isMut: false,
          isSigner: false,
        },
      ],
      args: [],
    },
    {
      name: 'closeAccount',
      accounts: [
        {
          name: 'openOrders',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'authority',
          isMut: false,
          isSigner: true,
        },
        {
          name: 'destination',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'market',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'dexProgram',
          isMut: false,
          isSigner: false,
        },
      ],
      args: [],
    },
    {
      name: 'swap',
      accounts: [
        {
          name: 'market',
          accounts: [
            {
              name: 'market',
              isMut: true,
              isSigner: false,
            },
            {
              name: 'openOrders',
              isMut: true,
              isSigner: false,
            },
            {
              name: 'requestQueue',
              isMut: true,
              isSigner: false,
            },
            {
              name: 'eventQueue',
              isMut: true,
              isSigner: false,
            },
            {
              name: 'bids',
              isMut: true,
              isSigner: false,
            },
            {
              name: 'asks',
              isMut: true,
              isSigner: false,
            },
            {
              name: 'orderPayerTokenAccount',
              isMut: true,
              isSigner: false,
            },
            {
              name: 'coinVault',
              isMut: true,
              isSigner: false,
            },
            {
              name: 'pcVault',
              isMut: true,
              isSigner: false,
            },
            {
              name: 'vaultSigner',
              isMut: false,
              isSigner: false,
            },
            {
              name: 'coinWallet',
              isMut: true,
              isSigner: false,
            },
          ],
        },
        {
          name: 'authority',
          isMut: false,
          isSigner: true,
        },
        {
          name: 'pcWallet',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'dexProgram',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'tokenProgram',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'rent',
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: 'side',
          type: {
            defined: 'Side',
          },
        },
        {
          name: 'amount',
          type: 'u64',
        },
        {
          name: 'minExchangeRate',
          type: {
            defined: 'ExchangeRate',
          },
        },
      ],
    },
    {
      name: 'swapTransitive',
      accounts: [
        {
          name: 'from',
          accounts: [
            {
              name: 'market',
              isMut: true,
              isSigner: false,
            },
            {
              name: 'openOrders',
              isMut: true,
              isSigner: false,
            },
            {
              name: 'requestQueue',
              isMut: true,
              isSigner: false,
            },
            {
              name: 'eventQueue',
              isMut: true,
              isSigner: false,
            },
            {
              name: 'bids',
              isMut: true,
              isSigner: false,
            },
            {
              name: 'asks',
              isMut: true,
              isSigner: false,
            },
            {
              name: 'orderPayerTokenAccount',
              isMut: true,
              isSigner: false,
            },
            {
              name: 'coinVault',
              isMut: true,
              isSigner: false,
            },
            {
              name: 'pcVault',
              isMut: true,
              isSigner: false,
            },
            {
              name: 'vaultSigner',
              isMut: false,
              isSigner: false,
            },
            {
              name: 'coinWallet',
              isMut: true,
              isSigner: false,
            },
          ],
        },
        {
          name: 'to',
          accounts: [
            {
              name: 'market',
              isMut: true,
              isSigner: false,
            },
            {
              name: 'openOrders',
              isMut: true,
              isSigner: false,
            },
            {
              name: 'requestQueue',
              isMut: true,
              isSigner: false,
            },
            {
              name: 'eventQueue',
              isMut: true,
              isSigner: false,
            },
            {
              name: 'bids',
              isMut: true,
              isSigner: false,
            },
            {
              name: 'asks',
              isMut: true,
              isSigner: false,
            },
            {
              name: 'orderPayerTokenAccount',
              isMut: true,
              isSigner: false,
            },
            {
              name: 'coinVault',
              isMut: true,
              isSigner: false,
            },
            {
              name: 'pcVault',
              isMut: true,
              isSigner: false,
            },
            {
              name: 'vaultSigner',
              isMut: false,
              isSigner: false,
            },
            {
              name: 'coinWallet',
              isMut: true,
              isSigner: false,
            },
          ],
        },
        {
          name: 'authority',
          isMut: false,
          isSigner: true,
        },
        {
          name: 'pcWallet',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'dexProgram',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'tokenProgram',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'rent',
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: 'amount',
          type: 'u64',
        },
        {
          name: 'minExchangeRate',
          type: {
            defined: 'ExchangeRate',
          },
        },
      ],
    },
  ],
  types: [
    {
      name: 'Side',
      type: {
        kind: 'enum',
        variants: [
          {
            name: 'Bid',
          },
          {
            name: 'Ask',
          },
        ],
      },
    },
    {
      name: 'ExchangeRate',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'rate',
            type: 'u64',
          },
          {
            name: 'fromDecimals',
            type: 'u8',
          },
          {
            name: 'quoteDecimals',
            type: 'u8',
          },
          {
            name: 'strict',
            type: 'bool',
          },
        ],
      },
    },
  ],
  events: [
    {
      name: 'DidSwap',
      fields: [
        {
          name: 'given_amount',
          type: 'u64',
          index: false,
        },
        {
          name: 'min_exchange_rate',
          type: {
            defined: 'ExchangeRate',
          },
          index: false,
        },
        {
          name: 'from_amount',
          type: 'u64',
          index: false,
        },
        {
          name: 'to_amount',
          type: 'u64',
          index: false,
        },
        {
          name: 'quote_amount',
          type: 'u64',
          index: false,
        },
        {
          name: 'spill_amount',
          type: 'u64',
          index: false,
        },
        {
          name: 'from_mint',
          type: 'publicKey',
          index: false,
        },
        {
          name: 'to_mint',
          type: 'publicKey',
          index: false,
        },
        {
          name: 'quote_mint',
          type: 'publicKey',
          index: false,
        },
        {
          name: 'authority',
          type: 'publicKey',
          index: false,
        },
      ],
    },
  ],
  errors: [
    {
      code: 100,
      name: 'SwapTokensCannotMatch',
      msg: 'The tokens being swapped must have different mints',
    },
    {
      code: 101,
      name: 'SlippageExceeded',
      msg: 'Slippage tolerance exceeded',
    },
    {
      code: 102,
      name: 'ZeroSwap',
      msg: 'No tokens received when swapping',
    },
  ],
};

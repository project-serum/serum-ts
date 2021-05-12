import { Idl } from '@project-serum/anchor';

// Idl for client generation.
export const IDL: Idl = {
  version: '0.0.0',
  name: 'swap',
  instructions: [
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
          name: 'minExpectedSwapAmount',
          type: 'u64',
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
          name: 'minExpectedSwapAmount',
          type: 'u64',
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
          name: 'min_expected_swap_amount',
          type: 'u64',
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
  ],
};

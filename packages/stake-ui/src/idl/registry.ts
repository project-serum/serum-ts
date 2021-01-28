import { Idl } from '@project-serum/anchor';

const idl: Idl = {
  version: '0.0.0',
  name: 'registry',
  instructions: [
    {
      name: 'initialize',
      accounts: [
        {
          name: 'registrar',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'rewardEventQ',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'poolMint',
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
          name: 'mint',
          type: 'publicKey',
        },
        {
          name: 'authority',
          type: 'publicKey',
        },
        {
          name: 'nonce',
          type: 'u8',
        },
        {
          name: 'withdrawalTimelock',
          type: 'i64',
        },
        {
          name: 'stakeRate',
          type: 'u64',
        },
        {
          name: 'rewardQLen',
          type: 'u32',
        },
      ],
    },
    {
      name: 'updateRegistrar',
      accounts: [
        {
          name: 'registrar',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'authority',
          isMut: false,
          isSigner: true,
        },
      ],
      args: [
        {
          name: 'newAuthority',
          type: {
            option: 'publicKey',
          },
        },
        {
          name: 'withdrawalTimelock',
          type: {
            option: 'i64',
          },
        },
      ],
    },
    {
      name: 'createMember',
      accounts: [
        {
          name: 'registrar',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'member',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'beneficiary',
          isMut: false,
          isSigner: true,
        },
        {
          name: 'balances',
          accounts: [
            {
              name: 'spt',
              isMut: true,
              isSigner: false,
            },
            {
              name: 'vault',
              isMut: true,
              isSigner: false,
            },
            {
              name: 'vaultStake',
              isMut: true,
              isSigner: false,
            },
            {
              name: 'vaultPw',
              isMut: true,
              isSigner: false,
            },
          ],
        },
        {
          name: 'balancesLocked',
          accounts: [
            {
              name: 'spt',
              isMut: true,
              isSigner: false,
            },
            {
              name: 'vault',
              isMut: true,
              isSigner: false,
            },
            {
              name: 'vaultStake',
              isMut: true,
              isSigner: false,
            },
            {
              name: 'vaultPw',
              isMut: true,
              isSigner: false,
            },
          ],
        },
        {
          name: 'memberSigner',
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
          name: 'nonce',
          type: 'u8',
        },
      ],
    },
    {
      name: 'updateMember',
      accounts: [
        {
          name: 'member',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'beneficiary',
          isMut: false,
          isSigner: true,
        },
      ],
      args: [
        {
          name: 'metadata',
          type: {
            option: 'publicKey',
          },
        },
      ],
    },
    {
      name: 'deposit',
      accounts: [
        {
          name: 'member',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'beneficiary',
          isMut: false,
          isSigner: true,
        },
        {
          name: 'vault',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'depositor',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'depositorAuthority',
          isMut: false,
          isSigner: true,
        },
        {
          name: 'tokenProgram',
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: 'amount',
          type: 'u64',
        },
      ],
    },
    {
      name: 'depositLocked',
      accounts: [
        {
          name: 'vesting',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'vestingVault',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'depositorAuthority',
          isMut: false,
          isSigner: true,
        },
        {
          name: 'tokenProgram',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'memberVault',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'memberSigner',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'registry',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'registrar',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'member',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'beneficiary',
          isMut: false,
          isSigner: true,
        },
      ],
      args: [
        {
          name: 'amount',
          type: 'u64',
        },
      ],
    },
    {
      name: 'stake',
      accounts: [
        {
          name: 'registrar',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'rewardEventQ',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'poolMint',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'member',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'beneficiary',
          isMut: false,
          isSigner: true,
        },
        {
          name: 'balances',
          accounts: [
            {
              name: 'spt',
              isMut: true,
              isSigner: false,
            },
            {
              name: 'vault',
              isMut: true,
              isSigner: false,
            },
            {
              name: 'vaultStake',
              isMut: true,
              isSigner: false,
            },
            {
              name: 'vaultPw',
              isMut: true,
              isSigner: false,
            },
          ],
        },
        {
          name: 'balancesLocked',
          accounts: [
            {
              name: 'spt',
              isMut: true,
              isSigner: false,
            },
            {
              name: 'vault',
              isMut: true,
              isSigner: false,
            },
            {
              name: 'vaultStake',
              isMut: true,
              isSigner: false,
            },
            {
              name: 'vaultPw',
              isMut: true,
              isSigner: false,
            },
          ],
        },
        {
          name: 'memberSigner',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'registrarSigner',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'clock',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'tokenProgram',
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: 'sptAmount',
          type: 'u64',
        },
        {
          name: 'locked',
          type: 'bool',
        },
      ],
    },
    {
      name: 'startUnstake',
      accounts: [
        {
          name: 'registrar',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'rewardEventQ',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'poolMint',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'pendingWithdrawal',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'member',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'beneficiary',
          isMut: false,
          isSigner: true,
        },
        {
          name: 'balances',
          accounts: [
            {
              name: 'spt',
              isMut: true,
              isSigner: false,
            },
            {
              name: 'vault',
              isMut: true,
              isSigner: false,
            },
            {
              name: 'vaultStake',
              isMut: true,
              isSigner: false,
            },
            {
              name: 'vaultPw',
              isMut: true,
              isSigner: false,
            },
          ],
        },
        {
          name: 'balancesLocked',
          accounts: [
            {
              name: 'spt',
              isMut: true,
              isSigner: false,
            },
            {
              name: 'vault',
              isMut: true,
              isSigner: false,
            },
            {
              name: 'vaultStake',
              isMut: true,
              isSigner: false,
            },
            {
              name: 'vaultPw',
              isMut: true,
              isSigner: false,
            },
          ],
        },
        {
          name: 'memberSigner',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'tokenProgram',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'clock',
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
          name: 'sptAmount',
          type: 'u64',
        },
        {
          name: 'locked',
          type: 'bool',
        },
      ],
    },
    {
      name: 'endUnstake',
      accounts: [
        {
          name: 'registrar',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'member',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'beneficiary',
          isMut: false,
          isSigner: true,
        },
        {
          name: 'pendingWithdrawal',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'vault',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'vaultPw',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'memberSigner',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'clock',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'tokenProgram',
          isMut: false,
          isSigner: false,
        },
      ],
      args: [],
    },
    {
      name: 'withdraw',
      accounts: [
        {
          name: 'registrar',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'member',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'beneficiary',
          isMut: false,
          isSigner: true,
        },
        {
          name: 'vault',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'memberSigner',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'depositor',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'tokenProgram',
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: 'amount',
          type: 'u64',
        },
      ],
    },
    {
      name: 'withdrawLocked',
      accounts: [
        {
          name: 'vesting',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'vestingVault',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'vestingSigner',
          isMut: false,
          isSigner: true,
        },
        {
          name: 'tokenProgram',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'memberVault',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'memberSigner',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'registry',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'registrar',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'member',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'beneficiary',
          isMut: false,
          isSigner: true,
        },
      ],
      args: [
        {
          name: 'amount',
          type: 'u64',
        },
      ],
    },
    {
      name: 'dropReward',
      accounts: [
        {
          name: 'registrar',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'rewardEventQ',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'poolMint',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'vendor',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'vendorVault',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'depositor',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'depositorAuthority',
          isMut: false,
          isSigner: true,
        },
        {
          name: 'tokenProgram',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'clock',
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
          name: 'kind',
          type: {
            defined: 'RewardVendorKind',
          },
        },
        {
          name: 'total',
          type: 'u64',
        },
        {
          name: 'expiryTs',
          type: 'i64',
        },
        {
          name: 'expiryReceiver',
          type: 'publicKey',
        },
        {
          name: 'nonce',
          type: 'u8',
        },
      ],
    },
    {
      name: 'claimReward',
      accounts: [
        {
          name: 'cmn',
          accounts: [
            {
              name: 'registrar',
              isMut: false,
              isSigner: false,
            },
            {
              name: 'member',
              isMut: true,
              isSigner: false,
            },
            {
              name: 'beneficiary',
              isMut: false,
              isSigner: true,
            },
            {
              name: 'balances',
              accounts: [
                {
                  name: 'spt',
                  isMut: true,
                  isSigner: false,
                },
                {
                  name: 'vault',
                  isMut: true,
                  isSigner: false,
                },
                {
                  name: 'vaultStake',
                  isMut: true,
                  isSigner: false,
                },
                {
                  name: 'vaultPw',
                  isMut: true,
                  isSigner: false,
                },
              ],
            },
            {
              name: 'balancesLocked',
              accounts: [
                {
                  name: 'spt',
                  isMut: true,
                  isSigner: false,
                },
                {
                  name: 'vault',
                  isMut: true,
                  isSigner: false,
                },
                {
                  name: 'vaultStake',
                  isMut: true,
                  isSigner: false,
                },
                {
                  name: 'vaultPw',
                  isMut: true,
                  isSigner: false,
                },
              ],
            },
            {
              name: 'vendor',
              isMut: false,
              isSigner: false,
            },
            {
              name: 'vault',
              isMut: true,
              isSigner: false,
            },
            {
              name: 'vendorSigner',
              isMut: false,
              isSigner: false,
            },
            {
              name: 'tokenProgram',
              isMut: false,
              isSigner: false,
            },
            {
              name: 'clock',
              isMut: false,
              isSigner: false,
            },
          ],
        },
        {
          name: 'to',
          isMut: true,
          isSigner: false,
        },
      ],
      args: [],
    },
    {
      name: 'claimRewardLocked',
      accounts: [
        {
          name: 'cmn',
          accounts: [
            {
              name: 'registrar',
              isMut: false,
              isSigner: false,
            },
            {
              name: 'member',
              isMut: true,
              isSigner: false,
            },
            {
              name: 'beneficiary',
              isMut: false,
              isSigner: true,
            },
            {
              name: 'balances',
              accounts: [
                {
                  name: 'spt',
                  isMut: true,
                  isSigner: false,
                },
                {
                  name: 'vault',
                  isMut: true,
                  isSigner: false,
                },
                {
                  name: 'vaultStake',
                  isMut: true,
                  isSigner: false,
                },
                {
                  name: 'vaultPw',
                  isMut: true,
                  isSigner: false,
                },
              ],
            },
            {
              name: 'balancesLocked',
              accounts: [
                {
                  name: 'spt',
                  isMut: true,
                  isSigner: false,
                },
                {
                  name: 'vault',
                  isMut: true,
                  isSigner: false,
                },
                {
                  name: 'vaultStake',
                  isMut: true,
                  isSigner: false,
                },
                {
                  name: 'vaultPw',
                  isMut: true,
                  isSigner: false,
                },
              ],
            },
            {
              name: 'vendor',
              isMut: false,
              isSigner: false,
            },
            {
              name: 'vault',
              isMut: true,
              isSigner: false,
            },
            {
              name: 'vendorSigner',
              isMut: false,
              isSigner: false,
            },
            {
              name: 'tokenProgram',
              isMut: false,
              isSigner: false,
            },
            {
              name: 'clock',
              isMut: false,
              isSigner: false,
            },
          ],
        },
        {
          name: 'registry',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'lockupProgram',
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: 'nonce',
          type: 'u8',
        },
      ],
    },
    {
      name: 'expireReward',
      accounts: [
        {
          name: 'registrar',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'vendor',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'vault',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'vendorSigner',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'expiryReceiver',
          isMut: false,
          isSigner: true,
        },
        {
          name: 'expiryReceiverToken',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'tokenProgram',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'clock',
          isMut: false,
          isSigner: false,
        },
      ],
      args: [],
    },
  ],
  state: {
    struct: {
      name: 'Registry',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'lockupProgram',
            type: 'publicKey',
          },
        ],
      },
    },
    methods: [
      {
        name: 'new',
        accounts: [
          {
            name: 'lockupProgram',
            isMut: false,
            isSigner: false,
          },
        ],
        args: [],
      },
    ],
  },
  accounts: [
    {
      name: 'Registrar',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'authority',
            type: 'publicKey',
          },
          {
            name: 'nonce',
            type: 'u8',
          },
          {
            name: 'withdrawalTimelock',
            type: 'i64',
          },
          {
            name: 'rewardEventQ',
            type: 'publicKey',
          },
          {
            name: 'mint',
            type: 'publicKey',
          },
          {
            name: 'poolMint',
            type: 'publicKey',
          },
          {
            name: 'stakeRate',
            type: 'u64',
          },
        ],
      },
    },
    {
      name: 'Member',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'registrar',
            type: 'publicKey',
          },
          {
            name: 'beneficiary',
            type: 'publicKey',
          },
          {
            name: 'metadata',
            type: 'publicKey',
          },
          {
            name: 'balances',
            type: {
              defined: 'BalanceSandbox',
            },
          },
          {
            name: 'balancesLocked',
            type: {
              defined: 'BalanceSandbox',
            },
          },
          {
            name: 'rewardsCursor',
            type: 'u32',
          },
          {
            name: 'lastStakeTs',
            type: 'i64',
          },
          {
            name: 'nonce',
            type: 'u8',
          },
        ],
      },
    },
    {
      name: 'PendingWithdrawal',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'registrar',
            type: 'publicKey',
          },
          {
            name: 'member',
            type: 'publicKey',
          },
          {
            name: 'burned',
            type: 'bool',
          },
          {
            name: 'pool',
            type: 'publicKey',
          },
          {
            name: 'startTs',
            type: 'i64',
          },
          {
            name: 'endTs',
            type: 'i64',
          },
          {
            name: 'amount',
            type: 'u64',
          },
          {
            name: 'locked',
            type: 'bool',
          },
        ],
      },
    },
    {
      name: 'RewardQueue',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'head',
            type: 'u32',
          },
          {
            name: 'tail',
            type: 'u32',
          },
          {
            name: 'events',
            type: {
              vec: {
                defined: 'RewardEvent',
              },
            },
          },
        ],
      },
    },
    {
      name: 'RewardVendor',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'registrar',
            type: 'publicKey',
          },
          {
            name: 'vault',
            type: 'publicKey',
          },
          {
            name: 'mint',
            type: 'publicKey',
          },
          {
            name: 'nonce',
            type: 'u8',
          },
          {
            name: 'poolTokenSupply',
            type: 'u64',
          },
          {
            name: 'rewardEventQCursor',
            type: 'u32',
          },
          {
            name: 'startTs',
            type: 'i64',
          },
          {
            name: 'expiryTs',
            type: 'i64',
          },
          {
            name: 'expiryReceiver',
            type: 'publicKey',
          },
          {
            name: 'from',
            type: 'publicKey',
          },
          {
            name: 'total',
            type: 'u64',
          },
          {
            name: 'expired',
            type: 'bool',
          },
          {
            name: 'kind',
            type: {
              defined: 'RewardVendorKind',
            },
          },
        ],
      },
    },
  ],
  types: [
    {
      name: 'BalanceSandbox',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'spt',
            type: 'publicKey',
          },
          {
            name: 'vault',
            type: 'publicKey',
          },
          {
            name: 'vaultStake',
            type: 'publicKey',
          },
          {
            name: 'vaultPw',
            type: 'publicKey',
          },
        ],
      },
    },
    {
      name: 'RewardEvent',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'vendor',
            type: 'publicKey',
          },
          {
            name: 'ts',
            type: 'i64',
          },
          {
            name: 'locked',
            type: 'bool',
          },
        ],
      },
    },
    {
      name: 'RewardVendorKind',
      type: {
        kind: 'enum',
        variants: [
          {
            name: 'Unlocked',
          },
          {
            name: 'Locked',
            fields: [
              {
                name: 'end_ts',
                type: 'i64',
              },
              {
                name: 'period_count',
                type: 'u64',
              },
            ],
          },
        ],
      },
    },
  ],
  errors: [
    {
      code: 100,
      name: 'RewardQAlreadyInitialized',
      msg: 'The given reward queue has already been initialized.',
    },
    {
      code: 101,
      name: 'InvalidNonce',
      msg: "The nonce given doesn't derive a valid program address.",
    },
    {
      code: 102,
      name: 'InvalidPoolMintAuthority',
      msg: 'Invalid pool mint authority',
    },
    {
      code: 103,
      name: 'InvalidMemberSigner',
      msg: "Member signer doesn't match the derived address.",
    },
    {
      code: 104,
      name: 'InvalidVaultDeposit',
      msg: 'The given vault owner must match the signing depositor.',
    },
    {
      code: 105,
      name: 'InvalidDepositor',
      msg: "The signing depositor doesn't match either of the balance accounts",
    },
    {
      code: 106,
      name: 'InvalidVault',
      msg: 'The vault given does not match the vault expected.',
    },
    {
      code: 107,
      name: 'InvalidVaultOwner',
      msg: 'Invalid vault owner.',
    },
    {
      code: 108,
      name: 'Unknown',
      msg: 'An unknown error has occured.',
    },
    {
      code: 109,
      name: 'UnstakeTimelock',
      msg: 'The unstake timelock has not yet expired.',
    },
    {
      code: 110,
      name: 'InsufficientReward',
      msg: 'Reward vendors must have at least one token unit per pool token',
    },
    {
      code: 111,
      name: 'InvalidExpiry',
      msg: 'Reward expiry must be after the current clock timestamp.',
    },
    {
      code: 112,
      name: 'VendorExpired',
      msg: 'The reward vendor has been expired.',
    },
    {
      code: 113,
      name: 'CursorAlreadyProcessed',
      msg: 'This reward has already been processed.',
    },
    {
      code: 114,
      name: 'NotStakedDuringDrop',
      msg: 'The account was not staked at the time of this reward.',
    },
    {
      code: 115,
      name: 'VendorNotYetExpired',
      msg: 'The vendor is not yet eligible for expiry.',
    },
    {
      code: 116,
      name: 'RewardsNeedsProcessing',
      msg: 'Please collect your reward before otherwise using the program.',
    },
    {
      code: 117,
      name: 'ExpectedLockedVendor',
      msg: 'Locked reward vendor expected but an unlocked vendor was given.',
    },
    {
      code: 118,
      name: 'ExpectedUnlockedVendor',
      msg: 'Unlocked reward vendor expected but a locked vendor was given.',
    },
    {
      code: 119,
      name: 'InvalidVestingSigner',
      msg: 'Locked deposit from an invalid deposit authority.',
    },
  ],
};

export default idl;

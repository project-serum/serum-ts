import { Idl } from '@project-serum/anchor';

const idl: Idl = {
  version: '0.0.0',
  name: 'lockup',
  instructions: [
    {
      name: 'createVesting',
      accounts: [
        {
          name: 'vesting',
          isMut: true,
          isSigner: false,
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
        {
          name: 'rent',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'clock',
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: 'beneficiary',
          type: 'publicKey',
        },
        {
          name: 'depositAmount',
          type: 'u64',
        },
        {
          name: 'nonce',
          type: 'u8',
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
          name: 'periodCount',
          type: 'u64',
        },
        {
          name: 'realizor',
          type: {
            option: {
              defined: 'Realizor',
            },
          },
        },
      ],
    },
    {
      name: 'withdraw',
      accounts: [
        {
          name: 'vesting',
          isMut: true,
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
          name: 'vestingSigner',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'token',
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
      args: [
        {
          name: 'amount',
          type: 'u64',
        },
      ],
    },
    {
      name: 'whitelistWithdraw',
      accounts: [
        {
          name: 'transfer',
          accounts: [
            {
              name: 'lockup',
              isMut: false,
              isSigner: false,
            },
            {
              name: 'beneficiary',
              isMut: false,
              isSigner: true,
            },
            {
              name: 'whitelistedProgram',
              isMut: false,
              isSigner: false,
            },
            {
              name: 'vesting',
              isMut: true,
              isSigner: false,
            },
            {
              name: 'vault',
              isMut: true,
              isSigner: false,
            },
            {
              name: 'vestingSigner',
              isMut: false,
              isSigner: false,
            },
            {
              name: 'tokenProgram',
              isMut: false,
              isSigner: false,
            },
            {
              name: 'whitelistedProgramVault',
              isMut: true,
              isSigner: false,
            },
            {
              name: 'whitelistedProgramVaultAuthority',
              isMut: false,
              isSigner: false,
            },
          ],
        },
      ],
      args: [
        {
          name: 'instructionData',
          type: 'bytes',
        },
        {
          name: 'amount',
          type: 'u64',
        },
      ],
    },
    {
      name: 'whitelistDeposit',
      accounts: [
        {
          name: 'transfer',
          accounts: [
            {
              name: 'lockup',
              isMut: false,
              isSigner: false,
            },
            {
              name: 'beneficiary',
              isMut: false,
              isSigner: true,
            },
            {
              name: 'whitelistedProgram',
              isMut: false,
              isSigner: false,
            },
            {
              name: 'vesting',
              isMut: true,
              isSigner: false,
            },
            {
              name: 'vault',
              isMut: true,
              isSigner: false,
            },
            {
              name: 'vestingSigner',
              isMut: false,
              isSigner: false,
            },
            {
              name: 'tokenProgram',
              isMut: false,
              isSigner: false,
            },
            {
              name: 'whitelistedProgramVault',
              isMut: true,
              isSigner: false,
            },
            {
              name: 'whitelistedProgramVaultAuthority',
              isMut: false,
              isSigner: false,
            },
          ],
        },
      ],
      args: [
        {
          name: 'instructionData',
          type: 'bytes',
        },
      ],
    },
    {
      name: 'availableForWithdrawal',
      accounts: [
        {
          name: 'vesting',
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
      name: 'Lockup',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'authority',
            type: 'publicKey',
          },
          {
            name: 'whitelist',
            type: {
              vec: {
                defined: 'WhitelistEntry',
              },
            },
          },
        ],
      },
    },
    methods: [
      {
        name: 'new',
        accounts: [
          {
            name: 'authority',
            isMut: false,
            isSigner: true,
          },
        ],
        args: [],
      },
      {
        name: 'whitelistAdd',
        accounts: [
          {
            name: 'authority',
            isMut: false,
            isSigner: true,
          },
        ],
        args: [
          {
            name: 'entry',
            type: {
              defined: 'WhitelistEntry',
            },
          },
        ],
      },
      {
        name: 'whitelistDelete',
        accounts: [
          {
            name: 'authority',
            isMut: false,
            isSigner: true,
          },
        ],
        args: [
          {
            name: 'entry',
            type: {
              defined: 'WhitelistEntry',
            },
          },
        ],
      },
      {
        name: 'setAuthority',
        accounts: [
          {
            name: 'authority',
            isMut: false,
            isSigner: true,
          },
        ],
        args: [
          {
            name: 'newAuthority',
            type: 'publicKey',
          },
        ],
      },
    ],
  },
  accounts: [
    {
      name: 'Vesting',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'beneficiary',
            type: 'publicKey',
          },
          {
            name: 'mint',
            type: 'publicKey',
          },
          {
            name: 'vault',
            type: 'publicKey',
          },
          {
            name: 'grantor',
            type: 'publicKey',
          },
          {
            name: 'outstanding',
            type: 'u64',
          },
          {
            name: 'startBalance',
            type: 'u64',
          },
          {
            name: 'createdTs',
            type: 'i64',
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
            name: 'periodCount',
            type: 'u64',
          },
          {
            name: 'whitelistOwned',
            type: 'u64',
          },
          {
            name: 'nonce',
            type: 'u8',
          },
          {
            name: 'realizor',
            type: {
              option: {
                defined: 'Realizor',
              },
            },
          },
        ],
      },
    },
  ],
  types: [
    {
      name: 'Realizor',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'program',
            type: 'publicKey',
          },
          {
            name: 'metadata',
            type: 'publicKey',
          },
        ],
      },
    },
    {
      name: 'WhitelistEntry',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'programId',
            type: 'publicKey',
          },
        ],
      },
    },
  ],
  errors: [
    {
      code: 100,
      name: 'InvalidTimestamp',
      msg: 'Vesting end must be greater than the current unix timestamp.',
    },
    {
      code: 101,
      name: 'InvalidPeriod',
      msg: 'The number of vesting periods must be greater than zero.',
    },
    {
      code: 102,
      name: 'InvalidDepositAmount',
      msg: 'The vesting deposit amount must be greater than zero.',
    },
    {
      code: 103,
      name: 'InvalidWhitelistEntry',
      msg: 'The Whitelist entry is not a valid program address.',
    },
    {
      code: 104,
      name: 'InvalidProgramAddress',
      msg: 'Invalid program address. Did you provide the correct nonce?',
    },
    {
      code: 105,
      name: 'InvalidVaultOwner',
      msg: 'Invalid vault owner.',
    },
    {
      code: 106,
      name: 'InvalidVaultAmount',
      msg: 'Vault amount must be zero.',
    },
    {
      code: 107,
      name: 'InsufficientWithdrawalBalance',
      msg: 'Insufficient withdrawal balance.',
    },
    {
      code: 108,
      name: 'WhitelistFull',
      msg: 'Whitelist is full',
    },
    {
      code: 109,
      name: 'WhitelistEntryAlreadyExists',
      msg: 'Whitelist entry already exists',
    },
    {
      code: 110,
      name: 'InsufficientWhitelistDepositAmount',
      msg: 'Balance must go up when performing a whitelist deposit',
    },
    {
      code: 111,
      name: 'WhitelistDepositOverflow',
      msg: 'Cannot deposit more than withdrawn',
    },
    {
      code: 112,
      name: 'WhitelistWithdrawLimit',
      msg: 'Tried to withdraw over the specified limit',
    },
    {
      code: 113,
      name: 'WhitelistEntryNotFound',
      msg: 'Whitelist entry not found.',
    },
    {
      code: 114,
      name: 'Unauthorized',
      msg: 'You do not have sufficient permissions to perform this action.',
    },
    {
      code: 115,
      name: 'UnableToWithdrawWhileStaked',
      msg: 'You are unable to realize projected rewards until unstaking.',
    },
    {
      code: 116,
      name: 'InvalidLockRealizor',
      msg: "The given lock realizor doesn't match the vesting account.",
    },
    {
      code: 117,
      name: 'UnrealizedVesting',
      msg: 'You have not realized this vesting account.',
    },
    {
      code: 118,
      name: 'InvalidSchedule',
      msg: 'Invalid vesting schedule given.',
    },
  ],
};

export default idl;

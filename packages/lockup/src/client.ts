import BN from 'bn.js';
import * as bs58 from 'bs58';
import {
  TransactionSignature,
  Account,
  AccountMeta,
  SystemProgram,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SendOptions,
  Connection,
  SYSVAR_RENT_PUBKEY,
  SYSVAR_CLOCK_PUBKEY,
} from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@project-serum/serum/lib/token-instructions';
import {
  Provider,
  Wallet,
  NodeWallet,
  ProgramAccount,
  networks,
  getTokenAccount,
  simulateTransaction,
} from '@project-serum/common';
import * as instruction from './instruction';
import * as accounts from './accounts';
import { Safe, SIZE as SAFE_SIZE } from './accounts/safe';
import { Vesting } from './accounts/vesting';
import {
  Whitelist,
  WhitelistEntry,
  SIZE as WHITELIST_SIZE,
} from './accounts/whitelist';
import * as transactionIx from './transaction-instruction';

type Config = {
  provider: Provider;
  programId: PublicKey;
  safe: PublicKey;
};

// For all requests requiring an optional `Account` object, if none is provided,
// the Client's provider Account will be used.
//
// For example,, when creating a vesting account, the beneficiary will default
// to the provider.
export default class Client {
  readonly provider: Provider;
  readonly programId: PublicKey;
  readonly safe: PublicKey;
  readonly accounts: Accounts;

  constructor(cfg: Config) {
    this.provider = cfg.provider;
    this.programId = cfg.programId;
    this.safe = cfg.safe;
    this.accounts = new Accounts(cfg.provider, cfg.safe, cfg.programId);
  }

  // Connects to the devnet deployment of the lockup program.
  static devnet(wallet?: Wallet, opts?: SendOptions): Client {
    if (wallet === undefined) {
      wallet = NodeWallet.local();
    }
    opts = opts || Provider.defaultOptions();
    const connection = new Connection(
      'https://devnet.solana.com',
      opts.preflightCommitment,
    );
    const provider = new Provider(connection, wallet, opts);
    return new Client({
      provider,
      programId: networks.devnet.lockupProgramId,
      safe: networks.devnet.safe,
    });
  }

  static localhost(wallet?: Wallet, opts?: SendOptions): Client {
    if (wallet === undefined) {
      wallet = NodeWallet.local();
    }
    opts = opts || Provider.defaultOptions();
    const connection = new Connection(
      'http://localhost:8899',
      opts.preflightCommitment,
    );
    const provider = new Provider(connection, wallet, opts);
    return new Client({
      provider,
      programId: networks.localhost.lockupProgramId,
      safe: networks.localhost.safe,
    });
  }

  static async initialize(
    provider: Provider,
    req: InitializeRequest,
  ): Promise<[Client, InitializeResponse]> {
    let { programId, authority } = req;
    if (authority === undefined) {
      authority = provider.wallet.publicKey;
    }
    const safe = new Account();
    const whitelist = new Account();

    let tx = new Transaction();
    tx.add(
      // Create Safe.
      SystemProgram.createAccount({
        fromPubkey: provider.wallet.publicKey,
        newAccountPubkey: safe.publicKey,
        space: SAFE_SIZE,
        lamports: await provider.connection.getMinimumBalanceForRentExemption(
          SAFE_SIZE,
        ),
        programId: programId,
      }),
      // Create Whitelist.
      SystemProgram.createAccount({
        fromPubkey: provider.wallet.publicKey,
        newAccountPubkey: whitelist.publicKey,
        space: WHITELIST_SIZE,
        lamports: await provider.connection.getMinimumBalanceForRentExemption(
          WHITELIST_SIZE,
        ),
        programId: programId,
      }),
      // Initialize Safe.
      new TransactionInstruction({
        keys: [
          { pubkey: safe.publicKey, isWritable: true, isSigner: false },
          { pubkey: whitelist.publicKey, isWritable: true, isSigner: false },
          { pubkey: SYSVAR_RENT_PUBKEY, isWritable: false, isSigner: false },
        ],
        programId: programId,
        data: instruction.encode({
          initialize: {
            authority,
          },
        }),
      }),
    );

    const signers = [safe, whitelist];

    const txSig = await provider.send(tx, signers);

    const client = new Client({
      safe: safe.publicKey,
      provider,
      programId,
    });

    return [
      client,
      {
        tx: txSig,
        safe: safe.publicKey,
        whitelist: whitelist.publicKey,
      },
    ];
  }

  async createVesting(
    req: CreateVestingRequest,
  ): Promise<CreateVestingResponse> {
    let {
      beneficiary,
      endTs,
      periodCount,
      depositAmount,
      depositor,
      depositorAuthority,
      mint,
    } = req;

    if (beneficiary === undefined) {
      beneficiary = new PublicKey(Buffer.alloc(32));
    }

    if (mint === undefined) {
      const dTokenAccount = await getTokenAccount(this.provider, depositor);
      mint = dTokenAccount.mint;
    }

    const depositorAuthorityPubkey =
      depositorAuthority === undefined
        ? this.provider.wallet.publicKey
        : depositorAuthority.publicKey;

    const vesting = new Account();
    const vault = new Account();

    let createVestingIxs = await transactionIx.createVesting(
      this.provider,
      this.programId,
      this.safe,
      vesting.publicKey,
      vault.publicKey,
      mint,
      depositor,
      depositorAuthorityPubkey,
      beneficiary,
      endTs,
      periodCount,
      depositAmount,
    );

    const tx = new Transaction();
    tx.add(...createVestingIxs);
    let signers = [vesting, vault, depositorAuthority];
    let txSig = await this.provider.send(tx, signers);

    return {
      tx: txSig,
      vesting: vesting.publicKey,
    };
  }

  async claim(req: ClaimRequest): Promise<ClaimResponse> {
    let { beneficiary, vesting } = req;

    const beneficiaryAddress =
      beneficiary === undefined
        ? this.provider.wallet.publicKey
        : beneficiary.publicKey;

    const vaultAuthority = await this.accounts.vaultAuthority(
      this.programId,
      this.safe,
      beneficiaryAddress,
    );

    const tx = new Transaction();
    tx.add(
      new TransactionInstruction({
        keys: [
          { pubkey: beneficiaryAddress, isWritable: false, isSigner: true },
          { pubkey: vesting, isWritable: true, isSigner: false },
          { pubkey: this.safe, isWritable: false, isSigner: false },
          { pubkey: vaultAuthority, isWritable: false, isSigner: false },
          { pubkey: TOKEN_PROGRAM_ID, isWritable: false, isSigner: false },
        ],
        programId: this.programId,
        data: instruction.encode({
          claim: {},
        }),
      }),
    );

    let signers = [beneficiary];
    let txSig = await this.provider.send(tx, signers);

    return {
      tx: txSig,
    };
  }

  async withdraw(req: WithdrawRequest): Promise<WithdrawResponse> {
    let { amount, beneficiary, vesting, tokenAccount } = req;

    const beneficiaryAddress =
      beneficiary === undefined
        ? this.provider.wallet.publicKey
        : beneficiary.publicKey;

    const vestingAcc = await this.accounts.vesting(vesting);
    const vault = vestingAcc.vault;
    const vaultAuthority = await this.accounts.vaultAuthority(
      this.programId,
      this.safe,
      beneficiaryAddress,
    );

    const tx = new Transaction();
    tx.add(
      new TransactionInstruction({
        keys: [
          { pubkey: beneficiaryAddress, isWritable: false, isSigner: true },
          { pubkey: vesting, isWritable: true, isSigner: false },
          { pubkey: tokenAccount, isWritable: true, isSigner: false },
          { pubkey: vault, isWritable: true, isSigner: false },
          { pubkey: vaultAuthority, isWritable: false, isSigner: false },
          { pubkey: this.safe, isWritable: false, isSigner: false },
          { pubkey: TOKEN_PROGRAM_ID, isWritable: false, isSigner: false },
          { pubkey: SYSVAR_CLOCK_PUBKEY, isWritable: false, isSigner: false },
        ],
        programId: this.programId,
        data: instruction.encode({
          withdraw: {
            amount,
          },
        }),
      }),
    );

    let signers = [beneficiary];
    let txSig = await this.provider.send(tx, signers);

    return {
      tx: txSig,
    };
  }

  async whitelistWithdraw(
    req: WhitelistWithdrawRequest,
  ): Promise<WhitelistWithdrawResponse> {
    let {
      amount,
      instructionData,
      beneficiary,
      vesting,
      whitelistProgram,
      whitelistProgramVault,
      whitelistProgramVaultAuthority,
      relayAccounts,
      relaySigners,
      safe,
    } = req;

    const beneficiaryAddress =
      beneficiary === undefined
        ? this.provider.wallet.publicKey
        : beneficiary.publicKey;

    if (safe === undefined) {
      safe = await this.accounts.safe();
    }
    const vestingAcc = await this.accounts.vesting(vesting);
    const vault = vestingAcc.vault;
    const vaultAuthority = await this.accounts.vaultAuthority(
      this.programId,
      this.safe,
      beneficiaryAddress,
    );

    const tx = new Transaction();
    tx.add(
      new TransactionInstruction({
        keys: [
          { pubkey: beneficiaryAddress, isWritable: false, isSigner: true },
          { pubkey: this.safe, isWritable: false, isSigner: false },
          { pubkey: safe.whitelist, isWritable: false, isSigner: false },
          { pubkey: whitelistProgram, isWritable: false, isSigner: false },
          // Relay accounts.
          { pubkey: vesting, isWritable: true, isSigner: false },
          { pubkey: vault, isWritable: true, isSigner: false },
          { pubkey: vaultAuthority, isWritable: false, isSigner: false },
          { pubkey: TOKEN_PROGRAM_ID, isWritable: false, isSigner: false },
          { pubkey: whitelistProgramVault, isWritable: true, isSigner: false },
          {
            pubkey: whitelistProgramVaultAuthority,
            isWritable: false,
            isSigner: false,
          },
        ].concat(relayAccounts),
        programId: this.programId,
        data: instruction.encode({
          whitelistWithdraw: {
            amount,
            instructionData,
          },
        }),
      }),
    );

    let signers = [beneficiary].concat(relaySigners);
    let txSig = await this.provider.send(tx, signers);

    return {
      tx: txSig,
    };
  }

  async whitelistDeposit(
    req: WhitelistDepositRequest,
  ): Promise<WhitelistDepositResponse> {
    let {
      instructionData,
      beneficiary,
      vesting,
      whitelistProgram,
      whitelistProgramVault,
      whitelistProgramVaultAuthority,
      relayAccounts,
      relaySigners,
      safe,
    } = req;

    const beneficiaryAddress =
      beneficiary === undefined
        ? this.provider.wallet.publicKey
        : beneficiary.publicKey;

    if (safe === undefined) {
      safe = await this.accounts.safe();
    }

    const vestingAcc = await this.accounts.vesting(vesting);
    const vault = vestingAcc.vault;
    const vaultAuthority = await this.accounts.vaultAuthority(
      this.programId,
      this.safe,
      beneficiaryAddress,
    );

    const tx = new Transaction();
    tx.add(
      new TransactionInstruction({
        keys: [
          { pubkey: beneficiaryAddress, isWritable: false, isSigner: true },
          { pubkey: this.safe, isWritable: false, isSigner: false },
          { pubkey: safe.whitelist, isWritable: false, isSigner: false },
          { pubkey: whitelistProgram, isWritable: false, isSigner: false },
          // Relay accounts.
          { pubkey: vesting, isWritable: true, isSigner: false },
          { pubkey: vault, isWritable: true, isSigner: false },
          { pubkey: vaultAuthority, isWritable: false, isSigner: false },
          { pubkey: TOKEN_PROGRAM_ID, isWritable: false, isSigner: false },
          { pubkey: whitelistProgramVault, isWritable: true, isSigner: false },
          {
            pubkey: whitelistProgramVaultAuthority,
            isWritable: false,
            isSigner: false,
          },
        ].concat(relayAccounts),
        programId: this.programId,
        data: instruction.encode({
          whitelistDeposit: {
            instructionData,
          },
        }),
      }),
    );

    let signers = [beneficiary].concat(relaySigners);
    let txSig = await this.provider.send(tx, signers);

    return {
      tx: txSig,
    };
  }

  async whitelistAdd(req: WhitelistAddRequest): Promise<WhitelistAddResponse> {
    let { entry, authority } = req;

    const authorityAddress =
      authority === undefined
        ? this.provider.wallet.publicKey
        : authority.publicKey;

    const safe = await this.accounts.safe(this.safe);

    const tx = new Transaction();
    tx.add(
      new TransactionInstruction({
        keys: [
          { pubkey: authorityAddress, isWritable: false, isSigner: true },
          { pubkey: this.safe, isWritable: false, isSigner: false },
          { pubkey: safe.whitelist, isWritable: true, isSigner: false },
        ],
        programId: this.programId,
        data: instruction.encode({
          whitelistAdd: {
            entry,
          },
        }),
      }),
    );

    let signers = [authority];
    let txSig = await this.provider.send(tx, signers);

    return {
      tx: txSig,
    };
  }

  async whitelistDelete(
    req: WhitelistDeleteRequest,
  ): Promise<WhitelistDeleteResponse> {
    let { entry, authority } = req;

    const authorityAddress =
      authority === undefined
        ? this.provider.wallet.publicKey
        : authority.publicKey;

    const safe = await this.accounts.safe(this.safe);

    const tx = new Transaction();
    tx.add(
      new TransactionInstruction({
        keys: [
          { pubkey: authorityAddress, isWritable: false, isSigner: true },
          { pubkey: this.safe, isWritable: false, isSigner: false },
          { pubkey: safe.whitelist, isWritable: true, isSigner: false },
        ],
        programId: this.programId,
        data: instruction.encode({
          whitelistDelete: {
            entry,
          },
        }),
      }),
    );

    let signers = [authority];
    let txSig = await this.provider.send(tx, signers);

    return {
      tx: txSig,
    };
  }

  async setAuthority(req: SetAuthorityRequest): Promise<SetAuthorityResponse> {
    throw new Error('not implemented');
  }
}

class Accounts {
  constructor(
    readonly provider: Provider,
    private safeAddress: PublicKey,
    private programId: PublicKey,
  ) {}

  async safe(safeAddress?: PublicKey): Promise<Safe> {
    if (safeAddress === undefined) {
      safeAddress = this.safeAddress;
    }
    const accountInfo = await this.provider.connection.getAccountInfo(
      safeAddress,
    );
    if (accountInfo === null) {
      throw new Error(`Safe does not exist ${safeAddress}`);
    }
    return accounts.safe.decode(accountInfo.data);
  }

  async vesting(address: PublicKey): Promise<Vesting> {
    const accountInfo = await this.provider.connection.getAccountInfo(address);
    if (accountInfo === null) {
      throw new Error(`Safe does not exist ${address}`);
    }
    return accounts.vesting.decode(accountInfo.data);
  }

  async whitelist(address?: PublicKey): Promise<Whitelist> {
    if (address === undefined) {
      address = (await this.safe(this.safeAddress)).whitelist;
    }
    const accountInfo = await this.provider.connection.getAccountInfo(address);
    if (accountInfo === null) {
      throw new Error(`Safe does not exist ${address}`);
    }
    return accounts.whitelist.decode(accountInfo.data);
  }

  async vaultAuthority(
    programId: PublicKey,
    safeAddress: PublicKey,
    beneficiary: PublicKey,
  ): Promise<PublicKey> {
    const [pubkey, _nonce] = await PublicKey.findProgramAddress(
      [safeAddress.toBuffer(), beneficiary.toBuffer()],
      programId,
    );
    return pubkey;
  }

  async availableForWithdrawal(vesting: PublicKey): Promise<BN> {
    let tx = new Transaction();
    tx.add(
      new TransactionInstruction({
        keys: [
          { pubkey: vesting, isWritable: false, isSigner: false },
          { pubkey: SYSVAR_CLOCK_PUBKEY, isWritable: false, isSigner: false },
        ],
        programId: this.programId,
        data: instruction.encode({
          availableForWithdrawal: {},
        }),
      }),
    );
    tx.setSigners(...[this.provider.wallet.publicKey]);
    let resp = await simulateTransaction(
      this.provider.connection,
      tx,
      'recent',
    );
    if (resp.value.err) {
      throw new Error(`RPC error: ${resp.value.err.toString()}`);
    }
    let log = resp.value.logs![1].slice('Program log: '.length);
    return new BN(JSON.parse(log).result);
  }

  // Fetch all vesting accounts with the given beneficiary.
  async allVestings(
    beneficiary: PublicKey,
  ): Promise<ProgramAccount<accounts.Vesting>[]> {
    const vestingBytes = accounts.vesting
      .encode({
        ...accounts.vesting.defaultVesting(),
        initialized: true,
        safe: this.safeAddress,
        beneficiary,
      })
      .slice(0, 65);
    let filters = [
      {
        memcmp: {
          offset: 0,
          bytes: bs58.encode(vestingBytes),
        },
      },
      {
        dataSize: accounts.vesting.SIZE,
      },
    ];

    // @ts-ignore
    let resp = await this.provider.connection._rpcRequest(
      'getProgramAccounts',
      [
        this.programId.toBase58(),
        {
          commitment: this.provider.connection.commitment,
          filters,
        },
      ],
    );
    if (resp.error) {
      throw new Error(
        'failed to get vesting accounts for ' +
          beneficiary.toBase58() +
          ': ' +
          resp.error.message,
      );
    }

    return (
      resp.result
        // @ts-ignore
        .map(({ pubkey, account: { data } }) => {
          data = bs58.decode(data);
          return {
            publicKey: new PublicKey(pubkey),
            account: accounts.vesting.decode(data),
          };
        })
    );
  }
}

type InitializeRequest = {
  programId: PublicKey;
  authority?: PublicKey;
};

type InitializeResponse = {
  tx: TransactionSignature;
  safe: PublicKey;
  whitelist: PublicKey;
};

type CreateVestingRequest = {
  beneficiary?: PublicKey;
  endTs: BN;
  periodCount: BN;
  depositAmount: BN;
  depositor: PublicKey;
  depositorAuthority?: Account;
  mint?: PublicKey;
};

type CreateVestingResponse = {
  tx: TransactionSignature;
  vesting: PublicKey;
};

type ClaimRequest = {
  vesting: PublicKey;
  beneficiary?: Account;
};

type ClaimResponse = {
  tx: TransactionSignature;
};

type WithdrawRequest = {
  amount: BN;
  vesting: PublicKey;
  tokenAccount: PublicKey;
  beneficiary?: Account;
};

type WithdrawResponse = {
  tx: TransactionSignature;
};

type WhitelistWithdrawRequest = {
  amount: BN;
  instructionData: Buffer;
  vesting: PublicKey;
  whitelistProgram: PublicKey;
  whitelistProgramVault: PublicKey;
  whitelistProgramVaultAuthority: PublicKey;
  relayAccounts: Array<AccountMeta>;
  relaySigners: Array<Account>;
  beneficiary?: Account;
  safe?: Safe;
};

type WhitelistWithdrawResponse = {
  tx: TransactionSignature;
};

type WhitelistDepositRequest = {
  instructionData: Buffer;
  vesting: PublicKey;
  whitelistProgram: PublicKey;
  whitelistProgramVault: PublicKey;
  whitelistProgramVaultAuthority: PublicKey;
  relayAccounts: Array<AccountMeta>;
  relaySigners: Array<Account>;
  beneficiary?: Account;
  safe?: Safe;
};

type WhitelistDepositResponse = {
  tx: TransactionSignature;
};

type WhitelistAddRequest = {
  entry: WhitelistEntry;
  authority?: Account;
};

type WhitelistAddResponse = {
  tx: TransactionSignature;
};

type WhitelistDeleteRequest = {
  entry: WhitelistEntry;
  authority?: Account;
};

type WhitelistDeleteResponse = {
  tx: TransactionSignature;
};

type SetAuthorityRequest = {};

type SetAuthorityResponse = {};

type MigrateRequest = {};

type MigrateResponse = {};

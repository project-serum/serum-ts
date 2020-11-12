import BN from 'bn.js';
import {
  TransactionSignature,
  Account,
  AccountMeta,
  SystemProgram,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SYSVAR_RENT_PUBKEY,
  SYSVAR_CLOCK_PUBKEY,
} from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@project-serum/serum/lib/token-instructions';
import {
  createMint,
  createTokenAccount,
  Provider,
} from '@project-serum/common';
import * as instruction from './instruction';
import * as accounts from './accounts';
import { NeedsAssignment } from './accounts/vesting';
import { Safe, SIZE as SAFE_SIZE } from './accounts/safe';
import { Vesting, SIZE as VESTING_SIZE } from './accounts/vesting';
import {
  Whitelist,
  WhitelistEntry,
  SIZE as WHITELIST_SIZE,
} from './accounts/whitelist';

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
    this.accounts = new Accounts(cfg.provider, cfg.safe);
  }

  static async initialize(
    provider: Provider,
    req: InitializeRequest,
  ): Promise<[Client, InitializeResponse]> {
    let { programId, mint, authority } = req;
    if (authority === undefined) {
      authority = provider.wallet.publicKey;
    }
    const safe = new Account();
    const whitelist = new Account();

    const [vaultAuthority, vaultNonce] = await PublicKey.findProgramAddress(
      [safe.publicKey.toBuffer()],
      programId,
    );
    const vault = await createTokenAccount(provider, mint, vaultAuthority);

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
          { pubkey: vault, isWritable: false, isSigner: false },
          { pubkey: mint, isWritable: false, isSigner: false },
          { pubkey: SYSVAR_RENT_PUBKEY, isWritable: false, isSigner: false },
        ],
        programId: programId,
        data: instruction.encode({
          initialize: {
            authority,
            nonce: vaultNonce,
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
      needsAssignment,
      depositor,
      depositorAuthority,
    } = req;

    if (beneficiary === undefined) {
      beneficiary = new PublicKey(Buffer.alloc(32));
    }

    const depositorAuthorityPubkey =
      depositorAuthority === undefined
        ? this.provider.wallet.publicKey
        : depositorAuthority.publicKey;

    const vesting = new Account();

    const safe = await this.accounts.safe(this.safe);
    const vault = safe.vault;
    const vaultAuthority = await this.accounts.vaultAuthority(
      this.programId,
      this.safe,
      safe,
    );
    const lockedTokenMint = await createMint(this.provider, vaultAuthority);

    const tx = new Transaction();
    tx.add(
      // Allocate account.
      SystemProgram.createAccount({
        fromPubkey: this.provider.wallet.publicKey,
        newAccountPubkey: vesting.publicKey,
        space: VESTING_SIZE,
        lamports: await this.provider.connection.getMinimumBalanceForRentExemption(
          VESTING_SIZE,
        ),
        programId: this.programId,
      }),
      // Create Vesting.
      new TransactionInstruction({
        keys: [
          { pubkey: vesting.publicKey, isWritable: true, isSigner: false },
          { pubkey: depositor, isWritable: true, isSigner: false },
          {
            pubkey: depositorAuthorityPubkey,
            isWritable: false,
            isSigner: true,
          },
          { pubkey: vault, isWritable: true, isSigner: false },
          { pubkey: this.safe, isWritable: false, isSigner: false },
          { pubkey: lockedTokenMint, isWritable: true, isSigner: false },
          { pubkey: vaultAuthority, isWritable: false, isSigner: false },
          { pubkey: TOKEN_PROGRAM_ID, isWritable: false, isSigner: false },
          { pubkey: SYSVAR_RENT_PUBKEY, isWritable: false, isSigner: false },
          { pubkey: SYSVAR_CLOCK_PUBKEY, isWritable: false, isSigner: false },
        ],
        programId: this.programId,
        data: instruction.encode({
          createVesting: {
            beneficiary,
            endTs,
            periodCount,
            depositAmount,
            needsAssignment,
          },
        }),
      }),
    );

    let signers = [vesting, depositorAuthority];

    let txSig = await this.provider.send(tx, signers);

    return {
      tx: txSig,
      vesting: vesting.publicKey,
      lockedTokenMint,
    };
  }

  async claim(req: ClaimRequest): Promise<ClaimResponse> {
    let { beneficiary, vesting, lockedTokenAccount, lockedTokenMint } = req;

    const beneficiaryAddress =
      beneficiary === undefined
        ? this.provider.wallet.publicKey
        : beneficiary.publicKey;

    if (lockedTokenMint === undefined) {
      lockedTokenMint = (await this.accounts.vesting(this.safe)).lockedNftMint;
    }

    if (lockedTokenAccount === undefined) {
      lockedTokenAccount = await createTokenAccount(
        this.provider,
        lockedTokenMint,
        beneficiaryAddress,
      );
    }

    const vaultAuthority = await this.accounts.vaultAuthority(
      this.programId,
      this.safe,
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
          { pubkey: lockedTokenMint, isWritable: true, isSigner: false },
          { pubkey: lockedTokenAccount, isWritable: true, isSigner: false },
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
      lockedTokenAccount,
    };
  }

  async redeem(req: RedeemRequest): Promise<RedeemResponse> {
    let { amount, beneficiary, vesting, tokenAccount } = req;

    const beneficiaryAddress =
      beneficiary === undefined
        ? this.provider.wallet.publicKey
        : beneficiary.publicKey;

    const vestingAcc = await this.accounts.vesting(vesting);

    const safe = await this.accounts.safe(this.safe);
    const vault = safe.vault;
    const vaultAuthority = await this.accounts.vaultAuthority(
      this.programId,
      this.safe,
      safe,
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
          {
            pubkey: vestingAcc.lockedNftToken,
            isWritable: true,
            isSigner: false,
          },
          {
            pubkey: vestingAcc.lockedNftMint,
            isWritable: true,
            isSigner: false,
          },
          { pubkey: TOKEN_PROGRAM_ID, isWritable: false, isSigner: false },
          { pubkey: SYSVAR_CLOCK_PUBKEY, isWritable: false, isSigner: false },
        ],
        programId: this.programId,
        data: instruction.encode({
          redeem: {
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
      whitelistProgramVaultAuthority,
      relayAccounts,
      relaySigners,
    } = req;

    const beneficiaryAddress =
      beneficiary === undefined
        ? this.provider.wallet.publicKey
        : beneficiary.publicKey;

    const safe = await this.accounts.safe(this.safe);
    const vault = safe.vault;
    const vaultAuthority = await this.accounts.vaultAuthority(
      this.programId,
      this.safe,
      safe,
    );

    const tx = new Transaction();
    tx.add(
      new TransactionInstruction({
        keys: [
          { pubkey: beneficiaryAddress, isWritable: false, isSigner: true },
          { pubkey: vesting, isWritable: true, isSigner: false },
          { pubkey: this.safe, isWritable: false, isSigner: false },
          { pubkey: safe.whitelist, isWritable: false, isSigner: false },
          { pubkey: whitelistProgram, isWritable: false, isSigner: false },
          {
            pubkey: whitelistProgramVaultAuthority,
            isWritable: false,
            isSigner: false,
          },
          // Relay accounts.
          { pubkey: vault, isWritable: true, isSigner: false },
          { pubkey: vaultAuthority, isWritable: false, isSigner: false },
          { pubkey: TOKEN_PROGRAM_ID, isWritable: false, isSigner: false },
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
      whitelistProgramVaultAuthority,
      relayAccounts,
      relaySigners,
    } = req;

    const beneficiaryAddress =
      beneficiary === undefined
        ? this.provider.wallet.publicKey
        : beneficiary.publicKey;

    const safe = await this.accounts.safe(this.safe);
    const vault = safe.vault;
    const vaultAuthority = await this.accounts.vaultAuthority(
      this.programId,
      this.safe,
      safe,
    );

    const tx = new Transaction();
    tx.add(
      new TransactionInstruction({
        keys: [
          { pubkey: beneficiaryAddress, isWritable: false, isSigner: true },
          { pubkey: vesting, isWritable: true, isSigner: false },
          { pubkey: this.safe, isWritable: false, isSigner: false },
          { pubkey: safe.whitelist, isWritable: false, isSigner: false },
          { pubkey: whitelistProgram, isWritable: false, isSigner: false },
          // Relay accounts.
          { pubkey: vault, isWritable: true, isSigner: false },
          { pubkey: vaultAuthority, isWritable: false, isSigner: false },
          { pubkey: TOKEN_PROGRAM_ID, isWritable: false, isSigner: false },
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

  async migrate(req: MigrateRequest): Promise<MigrateResponse> {
    throw new Error('not implemented');
  }
}

class Accounts {
  constructor(readonly provider: Provider, private safeAddress: PublicKey) {}

  async safe(safeAddress: PublicKey): Promise<Safe> {
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
    safe?: Safe,
  ): Promise<PublicKey> {
    if (safe === undefined) {
      safe = await this.safe(safeAddress);
    }
    return PublicKey.createProgramAddress(
      [safeAddress.toBuffer(), Buffer.from([safe.nonce])],
      programId,
    );
  }
}

type InitializeRequest = {
  programId: PublicKey;
  mint: PublicKey;
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
  needsAssignment: NeedsAssignment | null;
  depositor: PublicKey;
  depositorAuthority?: Account;
};

type CreateVestingResponse = {
  tx: TransactionSignature;
  vesting: PublicKey;
  lockedTokenMint: PublicKey;
};

type ClaimRequest = {
  vesting: PublicKey;
  lockedTokenMint: PublicKey;
  lockedTokenAccount?: PublicKey;
  beneficiary?: Account;
};

type ClaimResponse = {
  tx: TransactionSignature;
  lockedTokenAccount: PublicKey;
};

type RedeemRequest = {
  amount: BN;
  vesting: PublicKey;
  tokenAccount: PublicKey;
  beneficiary?: Account;
};

type RedeemResponse = {
  tx: TransactionSignature;
};

type WhitelistWithdrawRequest = {
  amount: BN;
  instructionData: Buffer;
  vesting: PublicKey;
  whitelistProgram: PublicKey;
  whitelistProgramVaultAuthority: PublicKey;
  relayAccounts: Array<AccountMeta>;
  relaySigners: Array<Account>;
  beneficiary?: Account;
};

type WhitelistWithdrawResponse = {
  tx: TransactionSignature;
};

type WhitelistDepositRequest = {
  instructionData: Buffer;
  vesting: PublicKey;
  whitelistProgram: PublicKey;
  whitelistProgramVaultAuthority: PublicKey;
  relayAccounts: Array<AccountMeta>;
  relaySigners: Array<Account>;
  beneficiary?: Account;
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

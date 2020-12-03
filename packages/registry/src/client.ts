import BN from 'bn.js';
import * as bs58 from 'bs58';
import {
  TransactionSignature,
  Account,
  AccountMeta,
  SystemProgram,
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SendOptions,
  SYSVAR_RENT_PUBKEY,
  SYSVAR_CLOCK_PUBKEY,
} from '@solana/web3.js';
import { AccountInfo, MintInfo } from '@solana/spl-token';
import { TOKEN_PROGRAM_ID } from '@project-serum/serum/lib/token-instructions';
import {
  createTokenAccountInstrs,
  createMint,
  createTokenAccount,
  getTokenAccount,
  getMintInfo,
  SPL_SHARED_MEMORY_ID,
  Provider,
  Wallet,
  NodeWallet,
  ProgramAccount,
  networks,
} from '@project-serum/common';
import {
  Client as LockupClient,
  txIx as lockupTxIx,
  accounts as lockupAccounts,
} from '@project-serum/lockup';
import * as instruction from './instruction';
import * as accounts from './accounts';
import { LockedRewardVendor } from './accounts/locked-vendor';
import { UnlockedRewardVendor } from './accounts/unlocked-vendor';
import {
  Registrar,
  SIZE as REGISTRAR_SIZE,
  STAKE_POOL_NAME,
  MEGA_STAKE_POOL_NAME,
} from './accounts/registrar';
import { PendingWithdrawal } from './accounts/pending-withdrawal';
import { Entity } from './accounts/entity';
import { Member } from './accounts/member';
import { RewardEventQueue } from './accounts/reward-event-q';
import * as metaEntity from './meta-entity';
import EventEmitter from 'eventemitter3';

// TODO: handle susbcription state within client object.
let REWARD_Q_LISTENER = -1;

type Config = {
  provider: Provider;
  programId: PublicKey;
  metaEntityProgramId: PublicKey;
  registrar: PublicKey;
  rewardEventQueue: PublicKey;
};

export default class Client {
  readonly provider: Provider;
  readonly programId: PublicKey;
  readonly metaEntityProgramId: PublicKey;
  readonly accounts: Accounts;
  readonly registrar: PublicKey;
  readonly rewardEventQueue: PublicKey;

  constructor(cfg: Config) {
    this.provider = cfg.provider;
    this.programId = cfg.programId;
    this.metaEntityProgramId = cfg.metaEntityProgramId;
    this.accounts = new Accounts(
      cfg.provider,
      cfg.registrar,
      cfg.programId,
      cfg.metaEntityProgramId,
    );
    this.registrar = cfg.registrar;
    this.rewardEventQueue = cfg.rewardEventQueue;
  }

  // Connects to the devnet deployment of the program.
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
      programId: networks.devnet.registryProgramId,
      registrar: networks.devnet.registrar,
      metaEntityProgramId: networks.devnet.metaEntityProgramId,
      rewardEventQueue: networks.devnet.rewardEventQueue,
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
      programId: networks.localhost.registryProgramId,
      registrar: networks.localhost.registrar,
      metaEntityProgramId: networks.localhost.metaEntityProgramId,
      rewardEventQueue: networks.localhost.rewardEventQueue,
    });
  }

  // Initializes both the registry and its associated staking pool.
  static async initialize(
    provider: Provider,
    req: InitializeRequest,
  ): Promise<[Client, InitializeResponse]> {
    let {
      programId,
      metaEntityProgramId,
      mint,
      megaMint,
      withdrawalTimelock,
      deactivationTimelock,
      rewardActivationThreshold,
      maxStakePerEntity,
      authority,
      registrar,
    } = req;
    if (authority === undefined) {
      authority = provider.wallet.publicKey;
    }
    if (registrar === undefined) {
      registrar = new Account();
    }

    const rewardEventQueue = new Account();
    const pool = new Account();
    const megaPool = new Account();

    // Create program vault authorities.
    const [vaultAuthority, vaultNonce] = await PublicKey.findProgramAddress(
      [registrar.publicKey.toBuffer()],
      programId,
    );

    // Create program vaults.
    const vault = await createTokenAccount(provider, mint, vaultAuthority);
    const megaVault = await createTokenAccount(
      provider,
      megaMint,
      vaultAuthority,
    );
    const poolVault = await createTokenAccount(provider, mint, vaultAuthority);
    const megaPoolVault = await createTokenAccount(
      provider,
      mint,
      vaultAuthority,
    );

    // Create pool tokens.
    const poolMint = await createMint(provider, vaultAuthority);
    const megaPoolMint = await createMint(provider, vaultAuthority);

    const tx = new Transaction();
    tx.add(
      // Create reward event queue.
      SystemProgram.createAccount({
        fromPubkey: provider.wallet.publicKey,
        newAccountPubkey: rewardEventQueue.publicKey,
        space: accounts.RewardEventQueue.accountSize(),
        lamports: await provider.connection.getMinimumBalanceForRentExemption(
          accounts.RewardEventQueue.accountSize(),
        ),
        programId: programId,
      }),
      // Create registrar.
      SystemProgram.createAccount({
        fromPubkey: provider.wallet.publicKey,
        newAccountPubkey: registrar.publicKey,
        space: REGISTRAR_SIZE,
        lamports: await provider.connection.getMinimumBalanceForRentExemption(
          REGISTRAR_SIZE,
        ),
        programId: programId,
      }),
      // Iniitalize registrar.
      new TransactionInstruction({
        keys: [
          { pubkey: registrar.publicKey, isWritable: true, isSigner: false },
          { pubkey: vault, isWritable: false, isSigner: false },
          { pubkey: megaVault, isWritable: false, isSigner: false },
          { pubkey: poolVault, isWritable: false, isSigner: false },
          { pubkey: megaPoolVault, isWritable: false, isSigner: false },
          { pubkey: poolMint, isWritable: false, isSigner: false },
          { pubkey: megaPoolMint, isWritable: false, isSigner: false },

          {
            pubkey: rewardEventQueue.publicKey,
            isWritable: true,
            isSigner: false,
          },
          { pubkey: SYSVAR_RENT_PUBKEY, isWritable: false, isSigner: false },
        ],
        programId: programId,
        data: instruction.encode({
          initialize: {
            authority,
            nonce: vaultNonce,
            withdrawalTimelock,
            deactivationTimelock,
            rewardActivationThreshold,
            maxStakePerEntity,
          },
        }),
      }),
    );

    const createSigners = [rewardEventQueue, registrar];

    const sig = await provider.send(tx, createSigners);

    const client = new Client({
      registrar: registrar.publicKey,
      provider,
      programId,
      metaEntityProgramId,
      rewardEventQueue: rewardEventQueue.publicKey,
    });

    return [
      client,
      {
        tx: sig,
        registrar: registrar.publicKey,
        pool: pool.publicKey,
        megaPool: megaPool.publicKey,
      },
    ];
  }

  async updateRegistrar(
    req: UpdateRegistrarRequest,
  ): Promise<UpdateRegistrarResponse> {
    let {
      authority,
      newAuthority,
      withdrawalTimelock,
      deactivationTimelock,
      rewardActivationThreshold,
      maxStakePerEntity,
    } = req;
    let authorityPubkey =
      authority === undefined
        ? this.provider.wallet.publicKey
        : authority.publicKey;

    const tx = new Transaction();
    tx.add(
      new TransactionInstruction({
        keys: [
          { pubkey: this.registrar, isWritable: true, isSigner: false },
          { pubkey: authorityPubkey, isWritable: false, isSigner: true },
        ],
        programId: this.programId,
        data: instruction.encode({
          updateRegistrar: {
            newAuthority,
            withdrawalTimelock,
            deactivationTimelock,
            rewardActivationThreshold,
            maxStakePerEntity,
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

  async createEntity(req: CreateEntityRequest): Promise<CreateEntityResponse> {
    let { leader, name, about, imageUrl } = req;
    const leaderPubkey =
      leader === undefined ? this.provider.wallet.publicKey : leader.publicKey;

    const metadataAccount = new Account();
    const mqueue = new Account();
    const entity = new Account();

    const metadataInstrs = await metaEntity.transaction.initializeInstrs({
      mqueue,
      programId: this.metaEntityProgramId,
      authority: leaderPubkey,
      name,
      about,
      provider: this.provider,
      metadataAccount,
      imageUrl,
      entity: entity.publicKey,
    });

    const tx = new Transaction();
    tx.add(
      ...metadataInstrs,
      SystemProgram.createAccount({
        fromPubkey: this.provider.wallet.publicKey,
        newAccountPubkey: entity.publicKey,
        lamports: await this.provider.connection.getMinimumBalanceForRentExemption(
          accounts.entity.SIZE,
        ),
        space: accounts.entity.SIZE,
        programId: this.programId,
      }),
    );
    tx.add(
      new TransactionInstruction({
        keys: [
          { pubkey: entity.publicKey, isWritable: true, isSigner: false },
          { pubkey: leaderPubkey, isWritable: false, isSigner: true },
          { pubkey: this.registrar, isWritable: false, isSigner: false },
          { pubkey: SYSVAR_RENT_PUBKEY, isWritable: false, isSigner: false },
        ],
        programId: this.programId,
        data: instruction.encode({
          createEntity: {
            metadata: metadataAccount.publicKey,
          },
        }),
      }),
    );

    let signers = [metadataAccount, mqueue, entity, leader];
    let txSig = await this.provider.send(tx, signers);

    return {
      tx: txSig,
      entity: entity.publicKey,
      metadata: metadataAccount.publicKey,
    };
  }

  async updateEntity(req: UpdateEntityRequest): Promise<UpdateEntityResponse> {
    let { leader, newLeader, entity } = req;
    const leaderPubkey =
      leader === undefined ? this.provider.wallet.publicKey : leader.publicKey;

    const tx = new Transaction();
    tx.add(
      new TransactionInstruction({
        keys: [
          { pubkey: entity, isWritable: true, isSigner: false },
          { pubkey: leaderPubkey, isWritable: false, isSigner: true },
          { pubkey: this.registrar, isWritable: false, isSigner: false },
        ],
        programId: this.programId,
        data: instruction.encode({
          updateEntity: {
            leader: newLeader,
          },
        }),
      }),
    );

    let signers = [leader];

    let txSig = await this.provider.send(tx, signers);

    return {
      tx: txSig,
    };
  }

  async createMember(req: CreateMemberRequest): Promise<CreateMemberResponse> {
    let {
      beneficiary,
      entity,
      delegate,
      poolTokenMint,
      megaPoolTokenMint,
      registrar,
    } = req;

    const beneficiaryPubkey =
      beneficiary === undefined
        ? this.provider.wallet.publicKey
        : beneficiary.publicKey;

    if (poolTokenMint === undefined) {
      if (registrar === undefined) {
        registrar = await this.accounts.registrar();
      }
      poolTokenMint = registrar.poolMint;
    }
    if (megaPoolTokenMint === undefined) {
      if (registrar === undefined) {
        registrar = await this.accounts.registrar();
      }
      megaPoolTokenMint = registrar.poolMintMega;
    }

    const member = new Account();

    const registrySigner = await this.accounts.vaultAuthority(
      this.programId,
      this.registrar,
      registrar,
    );

    const spt = new Account();
    const sptMega = new Account();

    const createSptInstrs = await createTokenAccountInstrs(
      this.provider,
      spt.publicKey,
      poolTokenMint,
      registrySigner,
    );
    const createMsptInstrs = await createTokenAccountInstrs(
      this.provider,
      sptMega.publicKey,
      megaPoolTokenMint,
      registrySigner,
    );

    const tx = new Transaction();
    tx.add(
      SystemProgram.createAccount({
        fromPubkey: this.provider.wallet.publicKey,
        newAccountPubkey: member.publicKey,
        lamports: await this.provider.connection.getMinimumBalanceForRentExemption(
          accounts.member.SIZE,
        ),
        space: accounts.member.SIZE,
        programId: this.programId,
      }),
    );

    tx.add(
      ...createSptInstrs,
      ...createMsptInstrs,
      new TransactionInstruction({
        keys: [
          { pubkey: beneficiaryPubkey, isWritable: false, isSigner: true },
          { pubkey: member.publicKey, isWritable: true, isSigner: false },
          { pubkey: entity, isWritable: true, isSigner: false },
          { pubkey: this.registrar, isWritable: false, isSigner: false },
          { pubkey: registrySigner, isWritable: false, isSigner: false },
          { pubkey: spt.publicKey, isWritable: false, isSigner: false },
          { pubkey: sptMega.publicKey, isWritable: false, isSigner: false },
          { pubkey: TOKEN_PROGRAM_ID, isWritable: false, isSigner: false },
          { pubkey: SYSVAR_RENT_PUBKEY, isWritable: false, isSigner: false },
        ],
        programId: this.programId,
        data: instruction.encode({
          createMember: {
            delegate: delegate,
          },
        }),
      }),
    );

    let signers = [spt, sptMega, member, beneficiary];

    let txSig = await this.provider.send(tx, signers);

    return {
      tx: txSig,
      member: member.publicKey,
      spt: spt.publicKey,
      sptMega: sptMega.publicKey,
    };
  }

  async updateMember(req: UpdateMemberRequest): Promise<UpdateMemberResponse> {
    let { member, beneficiary, delegate } = req;

    const beneficiaryPubkey =
      beneficiary === undefined
        ? this.provider.wallet.publicKey
        : beneficiary.publicKey;

    const tx = new Transaction();
    tx.add(
      new TransactionInstruction({
        keys: [
          { pubkey: member, isWritable: true, isSigner: false },
          { pubkey: beneficiaryPubkey, isWritable: false, isSigner: true },
        ],
        programId: this.programId,
        data: instruction.encode({
          updateMember: {
            delegate,
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

  async deposit(req: DepositRequest): Promise<DepositResponse> {
    let {
      entity,
      member,
      beneficiary,
      depositor,
      depositorAuthority,
      amount,
      vault,
      vaultOwner,
    } = req;

    const beneficiaryPubkey =
      beneficiary === undefined
        ? this.provider.wallet.publicKey
        : beneficiary.publicKey;
    const depositorAuthorityPubkey =
      depositorAuthority === undefined
        ? this.provider.wallet.publicKey
        : depositorAuthority.publicKey;

    if (entity === undefined) {
      let m = await this.accounts.member(member);
      entity = m.entity;
    }
    if (vault === undefined || vaultOwner == undefined) {
      const v = await this.vaultFor(depositor);
      vault = v.vaultAddress as PublicKey;
      vaultOwner = v.vault.owner;
    }

    const tx = new Transaction();
    tx.add(
      new TransactionInstruction({
        keys: [
          // Whitelist relay interface.
          { pubkey: depositor, isWritable: true, isSigner: false },
          {
            pubkey: depositorAuthorityPubkey,
            isWritable: true,
            isSigner: true,
          },
          { pubkey: TOKEN_PROGRAM_ID, isWritable: false, isSigner: false },
          { pubkey: vault, isWritable: true, isSigner: false },
          { pubkey: vaultOwner, isWritable: false, isSigner: false },
          // Program specific.
          { pubkey: member, isWritable: true, isSigner: false },
          { pubkey: beneficiaryPubkey, isWritable: false, isSigner: true },
          { pubkey: entity, isWritable: true, isSigner: false },
          { pubkey: this.registrar, isWritable: false, isSigner: false },
          { pubkey: SYSVAR_CLOCK_PUBKEY, isWritable: false, isSigner: false },
        ],
        programId: this.programId,
        data: instruction.encode({
          deposit: {
            amount,
          },
        }),
      }),
    );

    let signers = [depositorAuthority, beneficiary];
    let txSig = await this.provider.send(tx, signers);

    return {
      tx: txSig,
    };
  }

  private async vaultFor(
    depositor: PublicKey,
  ): Promise<{ vaultAddress: PublicKey; vault: AccountInfo }> {
    let vaultAddress = undefined;
    let vault = undefined;

    let depositorAcc = await getTokenAccount(this.provider, depositor);

    let r = await this.accounts.registrar(this.registrar);

    let vaultAcc = await this.accounts.depositVault(this.registrar);
    if (vaultAcc.mint.equals(depositorAcc.mint)) {
      vaultAddress = r.vault;
      vault = vaultAcc;
    }
    let megaVaultAcc = await this.accounts.depositMegaVault(this.registrar);
    if (megaVaultAcc.mint.equals(depositorAcc.mint)) {
      vaultAddress = r.megaVault;
      vault = megaVaultAcc;
    }

    if (vaultAddress === undefined) {
      throw new Error(`Invalid depositor account: ${depositor}`);
    }

    if (vault === undefined) {
      throw new Error(`Invalid mint for depositor account: ${depositor}`);
    }

    return {
      vaultAddress,
      vault,
    };
  }

  async withdraw(req: WithdrawRequest): Promise<WithdrawResponse> {
    let {
      entity,
      member,
      beneficiary,
      depositor,
      depositorAuthority,
      amount,
      vault,
      vaultOwner,
    } = req;
    if (entity === undefined) {
      let m = await this.accounts.member(member);
      entity = m.entity;
    }
    if (vault === undefined || vaultOwner === undefined) {
      let v = await this.vaultFor(depositor);
      vault = v.vaultAddress;
      vaultOwner = v.vault.owner;
    }

    const beneficiaryPubkey =
      beneficiary === undefined
        ? this.provider.wallet.publicKey
        : beneficiary.publicKey;
    const depositorAuthorityPubkey =
      depositorAuthority === undefined
        ? this.provider.wallet.publicKey
        : depositorAuthority.publicKey;

    const tx = new Transaction();
    tx.add(
      new TransactionInstruction({
        keys: [
          // Whitelist relay interface.
          { pubkey: depositor, isWritable: true, isSigner: false },
          {
            pubkey: depositorAuthorityPubkey,
            isWritable: false,
            isSigner: true,
          },
          { pubkey: TOKEN_PROGRAM_ID, isWritable: false, isSigner: false },
          { pubkey: vault, isWritable: true, isSigner: false },
          { pubkey: vaultOwner, isWritable: false, isSigner: false },
          // Program specific.
          { pubkey: member, isWritable: true, isSigner: false },
          { pubkey: beneficiaryPubkey, isWritable: false, isSigner: true },
          { pubkey: entity, isWritable: true, isSigner: false },
          { pubkey: this.registrar, isWritable: false, isSigner: false },
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

    let signers = [depositorAuthority, beneficiary];
    let txSig = await this.provider.send(tx, signers);

    return {
      tx: txSig,
    };
  }

  async stake(req: StakeRequest): Promise<StakeResponse> {
    let { member, beneficiary, entity, amount, spt, registrar, isMega } = req;

    const beneficiaryPubkey =
      beneficiary === undefined
        ? this.provider.wallet.publicKey
        : beneficiary.publicKey;

    if (entity === undefined) {
      let m = await this.accounts.member(member);
      entity = m.entity;
    }

    if (registrar === undefined) {
      registrar = await this.accounts.registrar();
    }

    const vaultAuthority = await this.accounts.vaultAuthority(
      this.programId,
      this.registrar,
      registrar,
    );

    const [vault, poolVault, poolMint] = (() => {
      if (isMega) {
        return [
          registrar.megaVault,
          registrar.poolVaultMega,
          registrar.poolMintMega,
        ];
      } else {
        return [registrar.vault, registrar.poolVault, registrar.poolMint];
      }
    })();

    const tx = new Transaction();
    tx.add(
      new TransactionInstruction({
        keys: [
          { pubkey: member, isWritable: true, isSigner: false },
          { pubkey: beneficiaryPubkey, isWritable: false, isSigner: true },
          { pubkey: entity, isWritable: true, isSigner: false },
          { pubkey: this.registrar, isWritable: false, isSigner: false },

          { pubkey: vault, isWritable: true, isSigner: false },
          { pubkey: vaultAuthority, isWritable: false, isSigner: false },
          { pubkey: poolVault, isWritable: true, isSigner: false },
          { pubkey: poolMint, isWritable: true, isSigner: false },
          { pubkey: spt, isWritable: true, isSigner: false },

          { pubkey: SYSVAR_CLOCK_PUBKEY, isWritable: false, isSigner: false },
          { pubkey: TOKEN_PROGRAM_ID, isWritable: false, isSigner: false },
        ],
        programId: this.programId,
        data: instruction.encode({
          stake: {
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

  async startStakeWithdrawal(
    req: StartStakeWithdrawalRequest,
  ): Promise<StartStakeWithdrawalResponse> {
    let {
      pendingWithdrawal,
      member,
      beneficiary,
      entity,
      amount,
      spt,
      registrar,
      isMega,
    } = req;

    const beneficiaryPubkey =
      beneficiary === undefined
        ? this.provider.wallet.publicKey
        : beneficiary.publicKey;

    if (pendingWithdrawal === undefined) {
      pendingWithdrawal = new Account();
    }
    if (entity === undefined) {
      let m = await this.accounts.member(member);
      entity = m.entity;
    }

    if (registrar === undefined) {
      registrar = await this.accounts.registrar();
    }

    const vaultAuthority = await this.accounts.vaultAuthority(
      this.programId,
      this.registrar,
      registrar,
    );

    const [vault, poolVault, poolMint] = (() => {
      if (isMega) {
        return [
          registrar.megaVault,
          registrar.poolVaultMega,
          registrar.poolMintMega,
        ];
      } else {
        return [registrar.vault, registrar.poolVault, registrar.poolMint];
      }
    })();

    const tx = new Transaction();
    tx.add(
      SystemProgram.createAccount({
        fromPubkey: this.provider.wallet.publicKey,
        newAccountPubkey: pendingWithdrawal.publicKey,
        lamports: await this.provider.connection.getMinimumBalanceForRentExemption(
          accounts.pendingWithdrawal.SIZE,
        ),
        space: accounts.pendingWithdrawal.SIZE,
        programId: this.programId,
      }),
    );
    tx.add(
      new TransactionInstruction({
        keys: [
          {
            pubkey: pendingWithdrawal.publicKey,
            isWritable: true,
            isSigner: false,
          },
          { pubkey: member, isWritable: true, isSigner: false },
          { pubkey: beneficiaryPubkey, isWritable: false, isSigner: true },
          { pubkey: entity, isWritable: true, isSigner: false },
          { pubkey: this.registrar, isWritable: false, isSigner: false },

          { pubkey: vault, isWritable: true, isSigner: false },
          { pubkey: vaultAuthority, isWritable: false, isSigner: false },
          { pubkey: poolVault, isWritable: true, isSigner: false },
          { pubkey: poolMint, isWritable: true, isSigner: false },
          { pubkey: spt, isWritable: true, isSigner: false },

          { pubkey: SYSVAR_CLOCK_PUBKEY, isWritable: false, isSigner: false },
          { pubkey: TOKEN_PROGRAM_ID, isWritable: false, isSigner: false },
          { pubkey: SYSVAR_RENT_PUBKEY, isWritable: false, isSigner: false },
        ],
        programId: this.programId,
        data: instruction.encode({
          startStakeWithdrawal: {
            amount,
          },
        }),
      }),
    );

    let signers = [beneficiary, pendingWithdrawal];
    let txSig = await this.provider.send(tx, signers);

    return {
      tx: txSig,
      pendingWithdrawal: pendingWithdrawal.publicKey,
    };
  }

  async endStakeWithdrawal(
    req: EndStakeWithdrawalRequest,
  ): Promise<EndStakeWithdrawalResponse> {
    let { member, entity, beneficiary, pendingWithdrawal } = req;

    if (entity === undefined) {
      entity = (await this.accounts.member(member)).entity;
    }
    const beneficiaryPubkey =
      beneficiary === undefined
        ? this.provider.wallet.publicKey
        : beneficiary.publicKey;

    const tx = new Transaction();
    tx.add(
      new TransactionInstruction({
        keys: [
          { pubkey: pendingWithdrawal, isWritable: true, isSigner: false },
          { pubkey: member, isWritable: true, isSigner: false },
          { pubkey: beneficiaryPubkey, isWritable: false, isSigner: true },
          { pubkey: entity, isWritable: true, isSigner: false },
          { pubkey: this.registrar, isWritable: false, isSigner: false },
          { pubkey: SYSVAR_CLOCK_PUBKEY, isWritable: false, isSigner: false },
        ],
        programId: this.programId,
        data: instruction.encode({
          endStakeWithdrawal: {},
        }),
      }),
    );

    let signers = [beneficiary];
    let txSig = await this.provider.send(tx, signers);

    return {
      tx: txSig,
    };
  }

  async switchEntity(req: SwitchEntityRequest): Promise<SwitchEntityResponse> {
    let { member, entity, newEntity, beneficiary } = req;

    if (entity === undefined) {
      entity = (await this.accounts.member(member)).entity;
    }

    const beneficiaryPubkey =
      beneficiary === undefined
        ? this.provider.wallet.publicKey
        : beneficiary.publicKey;

    const tx = new Transaction();
    tx.add(
      new TransactionInstruction({
        keys: [
          { pubkey: member, isWritable: true, isSigner: false },
          { pubkey: beneficiaryPubkey, isWritable: false, isSigner: true },
          { pubkey: this.registrar, isWritable: false, isSigner: false },
          { pubkey: entity, isWritable: true, isSigner: false },
          { pubkey: newEntity, isWritable: true, isSigner: false },
          { pubkey: SYSVAR_CLOCK_PUBKEY, isWritable: false, isSigner: false },
        ],
        programId: this.programId,
        data: instruction.encode({
          switchEntity: {},
        }),
      }),
    );

    let signers = [beneficiary];
    let txSig = await this.provider.send(tx, signers);

    return {
      tx: txSig,
    };
  }

  async sendMessage(req: SendMessageRequest): Promise<SendMessageResponse> {
    const { from, ts, content, mqueue } = req;
    const tx = new Transaction();
    tx.add(
      new TransactionInstruction({
        keys: [{ pubkey: mqueue, isWritable: true, isSigner: false }],
        programId: this.metaEntityProgramId,
        data: metaEntity.instruction.encode({
          sendMessage: {
            msg: {
              from,
              ts,
              content,
            },
          },
        }),
      }),
    );

    let signers: any = [];
    let txSig = await this.provider.send(tx, signers);

    return {
      tx: txSig,
    };
  }

  async dropLockedReward(
    req: DropLockedRewardRequest,
  ): Promise<DropLockedRewardResponse> {
    let {
      total,
      endTs,
      expiryTs,
      expiryReceiver,
      depositor,
      depositorMint,
      pool,
      poolTokenMint,
      periodCount,
    } = req;
    const vendor = new Account();
    const vendorVault = new Account();

    const [vendorVaultAuthority, nonce] = await PublicKey.findProgramAddress(
      [this.registrar.toBuffer(), vendor.publicKey.toBuffer()],
      this.programId,
    );

    const createLockedVendorVaultInstrs = await createTokenAccountInstrs(
      this.provider,
      vendorVault.publicKey,
      depositorMint,
      vendorVaultAuthority,
    );

    const tx = new Transaction();
    tx.add(
      // Create LockedRewardVendor token vault.
      ...createLockedVendorVaultInstrs,
      // Create LockedRewardVendor account.
      SystemProgram.createAccount({
        fromPubkey: this.provider.wallet.publicKey,
        newAccountPubkey: vendor.publicKey,
        lamports: await this.provider.connection.getMinimumBalanceForRentExemption(
          accounts.lockedRewardVendor.SIZE,
        ),
        space: accounts.lockedRewardVendor.SIZE,
        programId: this.programId,
      }),
      new TransactionInstruction({
        keys: [
          { pubkey: this.rewardEventQueue, isWritable: true, isSigner: false },
          { pubkey: this.registrar, isWritable: false, isSigner: false },
          { pubkey: depositor, isWritable: true, isSigner: false },
          {
            pubkey: this.provider.wallet.publicKey,
            isWritable: false,
            isSigner: false,
          },
          { pubkey: pool, isWritable: false, isSigner: false },
          { pubkey: poolTokenMint, isWritable: false, isSigner: false },
          { pubkey: vendor.publicKey, isWritable: true, isSigner: false },
          {
            pubkey: vendorVault.publicKey,
            isWritable: true,
            isSigner: false,
          },
          { pubkey: TOKEN_PROGRAM_ID, isWritable: false, isSigner: false },
          { pubkey: SYSVAR_CLOCK_PUBKEY, isWritable: false, isSigner: false },
        ],
        programId: this.programId,
        data: instruction.encode({
          dropLockedReward: {
            total,
            endTs,
            expiryTs,
            expiryReceiver,
            periodCount,
            nonce,
          },
        }),
      }),
    );

    let signers: any = [vendor, vendorVault];
    let txSig = await this.provider.send(tx, signers);
    return {
      tx: txSig,
    };
  }

  async dropUnlockedReward(
    req: DropUnlockedRewardRequest,
  ): Promise<DropUnlockedRewardResponse> {
    let {
      total,
      expiryTs,
      expiryReceiver,
      depositor,
      depositorMint,
      pool,
      poolTokenMint,
    } = req;
    const vendor = new Account();
    const vendorVault = new Account();

    const [vendorVaultAuthority, nonce] = await PublicKey.findProgramAddress(
      [this.registrar.toBuffer(), vendor.publicKey.toBuffer()],
      this.programId,
    );

    const createUnlockedVendorVaultInstrs = await createTokenAccountInstrs(
      this.provider,
      vendorVault.publicKey,
      depositorMint,
      vendorVaultAuthority,
    );

    const tx = new Transaction();
    tx.add(
      // Create UnlockedRewardVendor token vault.
      ...createUnlockedVendorVaultInstrs,
      // Create UnlockedRewardVendor account.
      SystemProgram.createAccount({
        fromPubkey: this.provider.wallet.publicKey,
        newAccountPubkey: vendor.publicKey,
        lamports: await this.provider.connection.getMinimumBalanceForRentExemption(
          accounts.unlockedRewardVendor.SIZE,
        ),
        space: accounts.unlockedRewardVendor.SIZE,
        programId: this.programId,
      }),
      new TransactionInstruction({
        keys: [
          { pubkey: this.rewardEventQueue, isWritable: true, isSigner: false },
          { pubkey: this.registrar, isWritable: false, isSigner: false },
          { pubkey: depositor, isWritable: true, isSigner: false },
          {
            pubkey: this.provider.wallet.publicKey,
            isWritable: false,
            isSigner: false,
          },
          { pubkey: pool, isWritable: false, isSigner: false },
          { pubkey: poolTokenMint, isWritable: false, isSigner: false },
          { pubkey: vendor.publicKey, isWritable: true, isSigner: false },
          {
            pubkey: vendorVault.publicKey,
            isWritable: true,
            isSigner: false,
          },
          { pubkey: TOKEN_PROGRAM_ID, isWritable: false, isSigner: false },
          { pubkey: SYSVAR_CLOCK_PUBKEY, isWritable: false, isSigner: false },
        ],
        programId: this.programId,
        data: instruction.encode({
          dropUnlockedReward: {
            total,
            expiryTs,
            expiryReceiver,
            nonce,
          },
        }),
      }),
    );

    let signers: any = [vendor, vendorVault];
    let txSig = await this.provider.send(tx, signers);
    return {
      tx: txSig,
    };
  }

  async claimLockedReward(
    req: ClaimLockedRewardRequest,
  ): Promise<ClaimLockedRewardResponse> {
    let {
      cursor,
      member,
      vendor,
      vendorVault,
      vendorSigner,
      safe,
      lockupProgramId,
      mint,
    } = req;

    const vesting = new Account();
    const vestingVault = new Account();

    const { nonce, ixs } = await lockupTxIx.allocVestingIxs(
      this.provider,
      lockupProgramId,
      safe,
      vesting.publicKey,
      vestingVault.publicKey,
      mint,
      this.provider.wallet.publicKey,
    );

    const tx = new Transaction();
    tx.add(
      ...ixs,
      new TransactionInstruction({
        keys: [
          { pubkey: member, isWritable: true, isSigner: false },
          { pubkey: this.registrar, isWritable: false, isSigner: false },
          { pubkey: vendor, isWritable: false, isSigner: false },
          { pubkey: vendorVault, isWritable: true, isSigner: false },
          { pubkey: vendorSigner, isWritable: false, isSigner: false },
          { pubkey: safe, isWritable: false, isSigner: false },
          { pubkey: lockupProgramId, isWritable: false, isSigner: false },
          { pubkey: vesting.publicKey, isWritable: true, isSigner: false },
          { pubkey: vestingVault.publicKey, isWritable: true, isSigner: false },
          { pubkey: TOKEN_PROGRAM_ID, isWritable: false, isSigner: false },
          { pubkey: SYSVAR_RENT_PUBKEY, isWritable: false, isSigner: false },
          { pubkey: SYSVAR_CLOCK_PUBKEY, isWritable: false, isSigner: false },
        ],
        programId: this.programId,
        data: instruction.encode({
          claimLockedReward: {
            cursor,
            nonce,
          },
        }),
      }),
    );

    let signers: any = [vesting, vestingVault];
    let txSig = await this.provider.send(tx, signers);
    return {
      tx: txSig,
    };
  }

  async claimUnlockedReward(
    req: ClaimUnlockedRewardRequest,
  ): Promise<ClaimUnlockedRewardResponse> {
    let { cursor, member, vendor, vendorVault, vendorSigner, token } = req;

    const tx = new Transaction();
    tx.add(
      new TransactionInstruction({
        keys: [
          { pubkey: member, isWritable: true, isSigner: false },
          { pubkey: this.registrar, isWritable: false, isSigner: false },
          { pubkey: vendor, isWritable: false, isSigner: false },
          { pubkey: vendorVault, isWritable: true, isSigner: false },
          { pubkey: vendorSigner, isWritable: false, isSigner: false },
          { pubkey: token, isWritable: true, isSigner: false },
          { pubkey: TOKEN_PROGRAM_ID, isWritable: false, isSigner: false },
        ],
        programId: this.programId,
        data: instruction.encode({
          claimUnlockedReward: {
            cursor,
          },
        }),
      }),
    );

    let signers: any = [];
    let txSig = await this.provider.send(tx, signers);
    return {
      tx: txSig,
    };
  }

  async depositLocked(
    req: DepositLockedRequest,
  ): Promise<DepositLockedResponse> {
    const {
      amount,
      vesting,
      safe,
      lockupClient,
      registrar,
      entity,
      member,
      vault,
    } = req;
    const registryVaultAuthority = await this.accounts.vaultAuthority(
      this.programId,
      this.registrar,
      registrar,
    );
    const instructionData = instruction.encode({
      deposit: {
        amount,
      },
    });
    const relayAccounts = [
      { pubkey: member, isWritable: true, isSigner: false },
      {
        pubkey: this.provider.wallet.publicKey,
        isWritable: false,
        isSigner: true,
      },
      { pubkey: entity, isWritable: true, isSigner: false },
      { pubkey: this.registrar, isWritable: false, isSigner: false },
      { pubkey: SYSVAR_CLOCK_PUBKEY, isWritable: false, isSigner: false },
    ];
    const relaySigners: Account[] = [];

    const { tx } = await lockupClient.whitelistWithdraw({
      amount,
      instructionData,
      vesting,
      whitelistProgram: this.programId,
      whitelistProgramVault: vault,
      whitelistProgramVaultAuthority: registryVaultAuthority,
      relayAccounts,
      relaySigners,
      safe,
    });
    return { tx };
  }

  async withdrawLocked(
    req: WithdrawLockedRequest,
  ): Promise<WithdrawLockedResponse> {
    const {
      amount,
      vesting,
      safe,
      lockupClient,
      registrar,
      member,
      entity,
      vault,
    } = req;

    const registryVaultAuthority = await this.accounts.vaultAuthority(
      this.programId,
      this.registrar,
      registrar,
    );
    const instructionData = instruction.encode({
      withdraw: {
        amount,
      },
    });
    const relayAccounts = [
      { pubkey: member, isWritable: true, isSigner: false },
      {
        pubkey: this.provider.wallet.publicKey,
        isWritable: false,
        isSigner: true,
      },
      { pubkey: entity, isWritable: true, isSigner: false },
      { pubkey: this.registrar, isWritable: false, isSigner: false },
      { pubkey: SYSVAR_CLOCK_PUBKEY, isWritable: false, isSigner: false },
    ];
    const relaySigners: Account[] = [];

    const { tx } = await lockupClient.whitelistDeposit({
      instructionData,
      vesting,
      whitelistProgram: this.programId,
      whitelistProgramVault: vault,
      whitelistProgramVaultAuthority: registryVaultAuthority,
      relayAccounts,
      relaySigners,
      safe,
    });

    return { tx };
  }
}

class Accounts {
  constructor(
    readonly provider: Provider,
    readonly registrarAddress: PublicKey,
    readonly programId: PublicKey,
    readonly metaEntityProgramId: PublicKey,
  ) {}

  async registrar(address?: PublicKey): Promise<Registrar> {
    if (address === undefined) {
      address = this.registrarAddress;
    }
    const accountInfo = await this.provider.connection.getAccountInfo(address);
    if (accountInfo === null) {
      throw new Error(`Registrar does not exist ${address}`);
    }
    return accounts.registrar.decode(accountInfo.data);
  }

  async entity(address: PublicKey): Promise<Entity> {
    const accountInfo = await this.provider.connection.getAccountInfo(address);
    if (accountInfo === null) {
      throw new Error(`Entity does not exist ${address}`);
    }
    return accounts.entity.decode(accountInfo.data);
  }

  async vaultAuthority(
    programId: PublicKey,
    registrarAddr: PublicKey,
    registrar?: Registrar,
  ): Promise<PublicKey> {
    if (registrar === undefined) {
      registrar = await this.registrar(registrarAddr);
    }
    return PublicKey.createProgramAddress(
      [registrarAddr.toBuffer(), Buffer.from([registrar.nonce])],
      programId,
    );
  }

  async member(address: PublicKey): Promise<Member> {
    const accountInfo = await this.provider.connection.getAccountInfo(address);
    if (accountInfo === null) {
      throw new Error(`Member does not exist ${address}`);
    }
    return accounts.member.decode(accountInfo.data);
  }

  async depositVault(registrarAddr: PublicKey): Promise<AccountInfo> {
    let r = await this.registrar(registrarAddr);
    return getTokenAccount(this.provider, r.vault);
  }

  async depositMegaVault(registrarAddr: PublicKey): Promise<AccountInfo> {
    let r = await this.registrar(registrarAddr);
    return getTokenAccount(this.provider, r.megaVault);
  }

  async metadata(
    address: PublicKey,
  ): Promise<metaEntity.accounts.metadata.Metadata> {
    const accountInfo = await this.provider.connection.getAccountInfo(address);
    if (accountInfo === null) {
      throw new Error(`Entity does not exist ${address}`);
    }
    return metaEntity.accounts.metadata.decode(accountInfo.data);
  }

  async pendingWithdrawal(address: PublicKey): Promise<PendingWithdrawal> {
    const accountInfo = await this.provider.connection.getAccountInfo(address);
    if (accountInfo === null) {
      throw new Error(`PendingWithdrawal does not exist ${address}`);
    }
    return accounts.pendingWithdrawal.decode(accountInfo.data);
  }

  async poolTokenMint(registrar?: Registrar): Promise<MintInfo> {
    if (registrar === undefined) {
      registrar = await this.registrar();
    }
    return await getMintInfo(this.provider, registrar.poolMint);
  }

  async poolVault(registrar: PublicKey | Registrar): Promise<AccountInfo> {
    if (registrar instanceof PublicKey) {
      registrar = await this.registrar(registrar);
    }
    return getTokenAccount(this.provider, registrar.poolVault);
  }

  async megaPoolVault(registrar: PublicKey | Registrar): Promise<AccountInfo> {
    if (registrar instanceof PublicKey) {
      registrar = await this.registrar(registrar);
    }
    return getTokenAccount(this.provider, registrar.poolVaultMega);
  }

  async megaPoolTokenMint(registrar?: Registrar): Promise<MintInfo> {
    if (registrar === undefined) {
      registrar = await this.registrar();
    }
    return await getMintInfo(this.provider, registrar.poolMintMega);
  }

  async allEntities(): Promise<ProgramAccount<Entity>[]> {
    const entityBytes = accounts.entity
      .encode({
        ...accounts.entity.defaultEntity(),
        initialized: true,
        registrar: this.registrarAddress,
      })
      .slice(0, 33);
    let filters = [
      {
        memcmp: {
          offset: 0,
          bytes: bs58.encode(entityBytes),
        },
      },
      {
        dataSize: accounts.entity.SIZE,
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
      throw new Error('failed to get entity accounts');
    }
    return (
      resp.result
        // @ts-ignore
        .map(({ pubkey, account: { data } }) => {
          data = bs58.decode(data);
          return {
            publicKey: new PublicKey(pubkey),
            account: accounts.entity.decode(data),
          };
        })
    );
  }

  async membersWithBeneficiary(
    publicKey: PublicKey,
  ): Promise<ProgramAccount<Member>[]> {
    const memberBytes = accounts.member
      .encode({
        ...accounts.member.defaultMember(),
        initialized: true,
        registrar: this.registrarAddress,
        beneficiary: publicKey,
      })
      .slice(0, 65);
    let filters = [
      {
        memcmp: {
          offset: 0,
          bytes: bs58.encode(memberBytes),
        },
      },
      {
        dataSize: accounts.member.SIZE,
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
        'failed to get member accounts owned by ' +
          publicKey.toBase58() +
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
            account: accounts.member.decode(data),
          };
        })
    );
  }

  async pendingWithdrawalsForMember(
    member: PublicKey,
  ): Promise<ProgramAccount<PendingWithdrawal>[]> {
    const pendingWithdrawalBytes = accounts.pendingWithdrawal
      .encode({
        ...accounts.pendingWithdrawal.defaultPendingWithdrawal(),
        initialized: true,
        member,
      })
      .slice(0, 33);
    let filters = [
      {
        memcmp: {
          offset: 0,
          bytes: bs58.encode(pendingWithdrawalBytes),
        },
      },
      {
        dataSize: accounts.pendingWithdrawal.SIZE,
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
        'failed to get pending withdrawals for ' +
          member.toBase58() +
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
            account: accounts.pendingWithdrawal.decode(data),
          };
        })
    );
  }

  async allMetadata(): Promise<
    ProgramAccount<metaEntity.accounts.metadata.Metadata>[]
  > {
    const metadataBytes = metaEntity.accounts.metadata
      .encode({
        ...metaEntity.accounts.metadata.defaultMetadata(),
        initialized: true,
      })
      .slice(0, 1);
    // @ts-ignore
    let resp = await this.provider.connection._rpcRequest(
      'getProgramAccounts',
      [
        this.metaEntityProgramId.toBase58(),
        {
          commitment: this.provider.connection.commitment,
          filters: [
            {
              memcmp: {
                offset: 0,
                bytes: bs58.encode(metadataBytes),
              },
            },
            {
              dataSize: metaEntity.accounts.metadata.SIZE,
            },
          ],
        },
      ],
    );
    if (resp.error) {
      throw new Error('failed to get metadata accounts');
    }
    return (
      resp.result
        // @ts-ignore
        .map(({ pubkey, account: { data } }) => {
          data = bs58.decode(data);
          return {
            publicKey: new PublicKey(pubkey),
            account: metaEntity.accounts.metadata.decode(data),
          };
        })
    );
  }

  rewardEventQueueConnect(address: PublicKey): EventEmitter {
    const ee = new EventEmitter();

    let rewardEventQueue = null;

    REWARD_Q_LISTENER = this.provider.connection.onAccountChange(
      address,
      acc => {
        rewardEventQueue = new RewardEventQueue(acc.data);
        ee.emit('change', {
          publicKey: this.rewardEventQueue,
          account: rewardEventQueue,
        });
      },
      'recent',
    );

    this.rewardEventQueue(address).then(rewardEventQueue => {
      ee.emit('connected', rewardEventQueue);
    });

    return ee;
  }

  rewardEventQueueDisconnect() {
    if (REWARD_Q_LISTENER !== -1) {
      this.provider.connection
        .removeAccountChangeListener(REWARD_Q_LISTENER)
        .catch(console.error);
    }
  }

  async rewardEventQueue(
    address: PublicKey,
  ): Promise<ProgramAccount<RewardEventQueue>> {
    const accountInfo = await this.provider.connection.getAccountInfo(address);
    if (accountInfo === null) {
      throw new Error(`Reward event queue dopes not exit ${address}`);
    }
    return {
      publicKey: address,
      account: new RewardEventQueue(accountInfo.data),
    };
  }

  mqueueConnect(address: PublicKey): EventEmitter {
    const ee = new EventEmitter();

    let mqueue = null;

    this.provider.connection.onAccountChange(
      address,
      acc => {
        // todo: emit message by message instead of the entire queue.
        mqueue = new metaEntity.accounts.mqueue.MQueue(acc.data);
        ee.emit('mqueue', mqueue);
      },
      'recent',
    );

    this.mqueue(address).then(mq => {
      ee.emit('connected', mq.account.messages());
    });

    return ee;
  }

  async mqueue(
    address: PublicKey,
  ): Promise<ProgramAccount<metaEntity.accounts.mqueue.MQueue>> {
    const accountInfo = await this.provider.connection.getAccountInfo(address);
    if (accountInfo === null) {
      throw new Error(`MQueue does not exist ${address}`);
    }
    return {
      publicKey: address,
      account: new metaEntity.accounts.mqueue.MQueue(accountInfo.data),
    };
  }

  async lockedRewardVendor(
    address: PublicKey,
  ): Promise<ProgramAccount<LockedRewardVendor>> {
    const accountInfo = await this.provider.connection.getAccountInfo(address);
    if (accountInfo === null) {
      throw new Error(`Vendor does not exist ${address}`);
    }
    return {
      publicKey: address,
      account: accounts.lockedRewardVendor.decode(accountInfo.data),
    };
  }

  async rewardVendorAuthority(
    vendor: PublicKey,
    nonce: number,
  ): Promise<PublicKey> {
    return PublicKey.createProgramAddress(
      [
        this.registrarAddress.toBuffer(),
        vendor.toBuffer(),
        Buffer.from([nonce]),
      ],
      this.programId,
    );
  }

  async unlockedRewardVendor(
    address: PublicKey,
  ): Promise<ProgramAccount<UnlockedRewardVendor>> {
    const accountInfo = await this.provider.connection.getAccountInfo(address);
    if (accountInfo === null) {
      throw new Error(`Vendor does not exist ${address}`);
    }
    return {
      publicKey: address,
      account: accounts.unlockedRewardVendor.decode(accountInfo.data),
    };
  }
}

type InitializeRequest = {
  programId: PublicKey;
  metaEntityProgramId: PublicKey;
  mint: PublicKey;
  megaMint: PublicKey;
  withdrawalTimelock: BN;
  deactivationTimelock: BN;
  rewardActivationThreshold: BN;
  maxStakePerEntity: BN;
  authority?: PublicKey;
  registrar?: Account;
};

type InitializeResponse = {
  tx: TransactionSignature;
  registrar: PublicKey;
  pool: PublicKey;
  megaPool: PublicKey;
};

type UpdateRegistrarRequest = {
  authority?: Account;
  newAuthority: PublicKey | null;
  withdrawalTimelock: BN | null;
  deactivationTimelock: BN | null;
  rewardActivationThreshold: BN | null;
  maxStakePerEntity: BN | null;
};

type UpdateRegistrarResponse = {
  tx: TransactionSignature;
};

type CreateEntityRequest = {
  leader?: Account;
  name: string;
  about: string;
  imageUrl: string;
};

type CreateEntityResponse = {
  tx: TransactionSignature;
  entity: PublicKey;
  metadata: PublicKey;
};

type UpdateEntityRequest = {
  leader?: Account;
  newLeader: PublicKey;
  entity: PublicKey;
};

type UpdateEntityResponse = {
  tx: TransactionSignature;
};

type CreateMemberRequest = {
  entity: PublicKey;
  delegate: PublicKey;
  beneficiary?: Account;
  poolTokenMint?: PublicKey;
  megaPoolTokenMint?: PublicKey;
  registrar?: Registrar;
};

type CreateMemberResponse = {
  tx: TransactionSignature;
  member: PublicKey;
  spt: PublicKey;
  sptMega: PublicKey;
};

type UpdateMemberRequest = {
  member: PublicKey;
  beneficiary?: Account;
  delegate: PublicKey | null;
};

type UpdateMemberResponse = {
  tx: TransactionSignature;
};

type SwitchEntityRequest = {
  member: PublicKey;
  entity?: PublicKey;
  newEntity: PublicKey;
  beneficiary?: Account;
};

type SwitchEntityResponse = {
  tx: TransactionSignature;
};

type DepositRequest = {
  member: PublicKey;
  depositor: PublicKey;
  amount: BN;
  entity?: PublicKey;
  beneficiary?: Account;
  depositorAuthority?: Account;
  vault?: PublicKey;
  vaultOwner?: PublicKey;
};

type DepositResponse = {
  tx: TransactionSignature;
};

type WithdrawRequest = {
  member: PublicKey;
  depositor: PublicKey;
  amount: BN;
  entity?: PublicKey;
  beneficiary?: Account;
  depositorAuthority?: Account;
  vault?: PublicKey;
  vaultOwner?: PublicKey;
};

type WithdrawResponse = {
  tx: TransactionSignature;
};

type StakeRequest = {
  member: PublicKey;
  beneficiary?: Account;
  entity?: PublicKey;
  amount: BN;
  spt: PublicKey;
  isMega?: boolean;
  registrar?: Registrar;
};

type StakeResponse = {
  tx: TransactionSignature;
};

type StartStakeWithdrawalRequest = {
  pendingWithdrawal?: Account;
  member: PublicKey;
  beneficiary?: Account;
  entity?: PublicKey;
  amount: BN;
  spt: PublicKey;
  isMega?: boolean;
  registrar?: Registrar;
};

type StartStakeWithdrawalResponse = {
  tx: TransactionSignature;
  pendingWithdrawal: PublicKey;
};

type EndStakeWithdrawalRequest = {
  member: PublicKey;
  pendingWithdrawal: PublicKey;
  entity?: PublicKey;
  beneficiary?: Account;
};

type EndStakeWithdrawalResponse = {
  tx: TransactionSignature;
};

type SendMessageRequest = {
  from: PublicKey;
  content: string;
  ts: BN;
  mqueue: PublicKey;
};

type SendMessageResponse = {
  tx: TransactionSignature;
};

type DropRewardRequest = {
  pool: PublicKey;
  srmDepositor: PublicKey;
  msrmDepositor?: PublicKey;
  srmAmount: BN;
  msrmAmount?: BN;
  poolSrmVault: PublicKey;
  poolMsrmVault?: PublicKey;
};

type DropRewardResponse = {
  tx: TransactionSignature;
};

type DropLockedRewardRequest = {
  total: BN;
  endTs: BN;
  expiryTs: BN;
  expiryReceiver: PublicKey;
  depositor: PublicKey;
  depositorMint: PublicKey;
  pool: PublicKey;
  poolTokenMint: PublicKey;
  periodCount: BN;
};

type DropLockedRewardResponse = {
  tx: TransactionSignature;
};

type DropUnlockedRewardRequest = {
  total: BN;
  expiryTs: BN;
  expiryReceiver: PublicKey;
  depositor: PublicKey;
  depositorMint: PublicKey;
  pool: PublicKey;
  poolTokenMint: PublicKey;
};

type DropUnlockedRewardResponse = {
  tx: TransactionSignature;
};

type ClaimLockedRewardRequest = {
  cursor: number;
  member: PublicKey;
  vendor: PublicKey;
  vendorVault: PublicKey;
  vendorSigner: PublicKey;
  safe: PublicKey;
  lockupProgramId: PublicKey;
  mint: PublicKey;
};

type ClaimLockedRewardResponse = {
  tx: TransactionSignature;
};

type ClaimUnlockedRewardRequest = {
  cursor: number;
  member: PublicKey;
  vendor: PublicKey;
  vendorVault: PublicKey;
  vendorSigner: PublicKey;
  token: PublicKey;
};

type ClaimUnlockedRewardResponse = {
  tx: TransactionSignature;
};

type DepositLockedRequest = {
  amount: BN;
  vesting: PublicKey;
  safe: lockupAccounts.Safe;
  lockupClient: LockupClient;
  registrar: Registrar;
  entity: PublicKey;
  member: PublicKey;
  vault: PublicKey;
};

type DepositLockedResponse = {
  tx: TransactionSignature;
};

type WithdrawLockedRequest = {
  amount: BN;
  vesting: PublicKey;
  safe: lockupAccounts.Safe;
  lockupClient: LockupClient;
  registrar: Registrar;
  member: PublicKey;
  entity: PublicKey;
  vault: PublicKey;
};

type WithdrawLockedResponse = {
  tx: TransactionSignature;
};

import BN from 'bn.js';
import {
  TransactionSignature,
  Account,
  SystemProgram,
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SendOptions,
  SYSVAR_RENT_PUBKEY,
  SYSVAR_CLOCK_PUBKEY,
} from '@solana/web3.js';
import { AccountInfo } from '@solana/spl-token';
import { TOKEN_PROGRAM_ID } from '@project-serum/serum/lib/token-instructions';
import {
  createTokenAccountInstrs,
  createMint,
  getTokenAccount,
  Provider,
  SendTxRequest,
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
import * as instruction from '../instruction';
import * as accounts from '../accounts';
import { LockedRewardVendor } from '../accounts/locked-vendor';
import { UnlockedRewardVendor } from '../accounts/unlocked-vendor';
import { Registrar, SIZE as REGISTRAR_SIZE } from '../accounts/registrar';
import { PendingWithdrawal } from '../accounts/pending-withdrawal';
import { Member } from '../accounts/member';
import * as metaEntity from '../meta-entity';
import Accounts from './accounts';

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
      maxStakePerEntity,
      authority,
      registrar,
      stakeRate,
      stakeRateMega,
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
            mint,
            megaMint,
            nonce: vaultNonce,
            withdrawalTimelock,
            deactivationTimelock,
            maxStakePerEntity,
            stakeRate,
            stakeRateMega,
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
    let { beneficiary, entity, delegate, registrar } = req;

    const beneficiaryPubkey =
      beneficiary === undefined
        ? this.provider.wallet.publicKey
        : beneficiary.publicKey;

    if (registrar === undefined) {
      registrar = await this.accounts.registrar();
    }

    const member = new Account();

    const registrySigner = await this.accounts.vaultAuthority(
      this.programId,
      this.registrar,
      registrar,
    );

    const [mainTxs, main] = await this.createBalanceSandbox(
      registrar,
      registrySigner,
      beneficiaryPubkey,
    );
    const [lockedTxs, locked] = await this.createBalanceSandbox(
      registrar,
      registrySigner,
      delegate,
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
      new TransactionInstruction({
        keys: [
          { pubkey: beneficiaryPubkey, isWritable: false, isSigner: true },
          { pubkey: member.publicKey, isWritable: true, isSigner: false },
          { pubkey: entity, isWritable: true, isSigner: false },
          { pubkey: this.registrar, isWritable: false, isSigner: false },
          { pubkey: registrySigner, isWritable: false, isSigner: false },
          { pubkey: TOKEN_PROGRAM_ID, isWritable: false, isSigner: false },
          { pubkey: SYSVAR_RENT_PUBKEY, isWritable: false, isSigner: false },
          // Main.
          { pubkey: beneficiaryPubkey, isWritable: false, isSigner: false },
          { pubkey: main.spt, isWritable: true, isSigner: false },
          { pubkey: main.sptMega, isWritable: true, isSigner: false },
          { pubkey: main.vault, isWritable: false, isSigner: false },
          { pubkey: main.vaultMega, isWritable: false, isSigner: false },
          { pubkey: main.vaultStake, isWritable: false, isSigner: false },
          { pubkey: main.vaultStakeMega, isWritable: false, isSigner: false },
          {
            pubkey: main.vaultPendingWithdrawal,
            isWritable: false,
            isSigner: false,
          },
          {
            pubkey: main.vaultPendingWithdrawalMega,
            isWritable: false,
            isSigner: false,
          },
          // Locked.
          { pubkey: delegate, isWritable: false, isSigner: false },
          { pubkey: locked.spt, isWritable: true, isSigner: false },
          { pubkey: locked.sptMega, isWritable: true, isSigner: false },
          { pubkey: locked.vault, isWritable: false, isSigner: false },
          { pubkey: locked.vaultMega, isWritable: false, isSigner: false },
          { pubkey: locked.vaultStake, isWritable: false, isSigner: false },
          { pubkey: locked.vaultStakeMega, isWritable: false, isSigner: false },
          {
            pubkey: locked.vaultPendingWithdrawal,
            isWritable: false,
            isSigner: false,
          },
          {
            pubkey: locked.vaultPendingWithdrawalMega,
            isWritable: false,
            isSigner: false,
          },
        ],
        programId: this.programId,
        data: instruction.encode({
          createMember: {},
        }),
      }),
    );

    let signers = [member, beneficiary];

    const allTxs = [...mainTxs, ...lockedTxs, { tx, signers }];

    let txSigs = await this.provider.sendAll(allTxs);

    return {
      txs: txSigs,
      member: member.publicKey,
      balances: [main, locked],
    };
  }

  private async createBalanceSandbox(
    r: Registrar,
    registrySigner: PublicKey,
    owner: PublicKey,
  ): Promise<[Array<SendTxRequest>, accounts.BalanceSandbox]> {
    const spt = new Account();
    const sptMega = new Account();
    const vault = new Account();
    const vaultMega = new Account();
    const vaultStake = new Account();
    const vaultStakeMega = new Account();
    const vaultPw = new Account();
    const vaultPwMega = new Account();

    const lamports = await this.provider.connection.getMinimumBalanceForRentExemption(
      165,
    );

    const createSptIx = await createTokenAccountInstrs(
      this.provider,
      spt.publicKey,
      r.poolMint,
      registrySigner,
      lamports,
    );
    const createMsptIx = await createTokenAccountInstrs(
      this.provider,
      sptMega.publicKey,
      r.poolMintMega,
      registrySigner,
      lamports,
    );
    const createVaultIx = await createTokenAccountInstrs(
      this.provider,
      vault.publicKey,
      r.mint,
      registrySigner,
      lamports,
    );
    const createVaultMegaIx = await createTokenAccountInstrs(
      this.provider,
      vaultMega.publicKey,
      r.megaMint,
      registrySigner,
      lamports,
    );
    const createVaultStakeIx = await createTokenAccountInstrs(
      this.provider,
      vaultStake.publicKey,
      r.mint,
      registrySigner,
      lamports,
    );
    const createVaultStakeMegaIx = await createTokenAccountInstrs(
      this.provider,
      vaultStakeMega.publicKey,
      r.megaMint,
      registrySigner,
      lamports,
    );
    const createVaultPwIx = await createTokenAccountInstrs(
      this.provider,
      vaultPw.publicKey,
      r.mint,
      registrySigner,
      lamports,
    );
    const createVaultPwMegaIx = await createTokenAccountInstrs(
      this.provider,
      vaultPwMega.publicKey,
      r.megaMint,
      registrySigner,
      lamports,
    );
    let tx0 = new Transaction();
    tx0.add(
      ...createSptIx,
      ...createMsptIx,
      ...createVaultIx,
      ...createVaultMegaIx,
    );
    let signers0 = [spt, sptMega, vault, vaultMega];

    const tx1 = new Transaction();
    tx1.add(
      ...createVaultStakeIx,
      ...createVaultStakeMegaIx,
      ...createVaultPwIx,
      ...createVaultPwMegaIx,
    );
    let signers1 = [vaultStake, vaultStakeMega, vaultPw, vaultPwMega];

    const txs = [
      { tx: tx0, signers: signers0 },
      { tx: tx1, signers: signers1 },
    ];

    return [
      txs,
      {
        owner,
        spt: spt.publicKey,
        sptMega: sptMega.publicKey,
        vault: vault.publicKey,
        vaultMega: vaultMega.publicKey,
        vaultStake: vaultStake.publicKey,
        vaultStakeMega: vaultStakeMega.publicKey,
        vaultPendingWithdrawal: vaultPw.publicKey,
        vaultPendingWithdrawalMega: vaultPwMega.publicKey,
      },
    ];
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
      const v = await this.vaultFor(depositor, member, beneficiaryPubkey);
      vault = v.vaultAddress as PublicKey;
      vaultOwner = v.vault.owner;
    }

    // Dummy account to pass into the instruction, since it conforms to the
    // lockup program's whitelist withdraw/deposit interface.
    const dummyAccountMeta = {
      pubkey: SYSVAR_CLOCK_PUBKEY,
      isWritable: false,
      isSigner: false,
    };

    const tx = new Transaction();
    tx.add(
      new TransactionInstruction({
        keys: [
          // Whitelist relay interface.
          dummyAccountMeta,
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

    const beneficiaryPubkey =
      beneficiary === undefined
        ? this.provider.wallet.publicKey
        : beneficiary.publicKey;
    const depositorAuthorityPubkey =
      depositorAuthority === undefined
        ? this.provider.wallet.publicKey
        : depositorAuthority.publicKey;

    if (vault === undefined || vaultOwner === undefined) {
      let v = await this.vaultFor(depositor, member, beneficiaryPubkey);
      vault = v.vaultAddress;
      vaultOwner = v.vault.owner;
    }

    // Dummy account to pass into the instruction, since it conforms to the
    // lockup program's whitelist withdraw/deposit interface.
    const dummyAccountMeta = {
      pubkey: SYSVAR_CLOCK_PUBKEY,
      isWritable: false,
      isSigner: false,
    };

    const tx = new Transaction();
    tx.add(
      new TransactionInstruction({
        keys: [
          // Whitelist relay interface.
          dummyAccountMeta,
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

  private async vaultFor(
    depositor: PublicKey,
    member: PublicKey,
    balanceId: PublicKey,
  ): Promise<{ vaultAddress: PublicKey; vault: AccountInfo }> {
    let vaultAddress = undefined;
    let vault = undefined;

    let depositorAcc = await getTokenAccount(this.provider, depositor);
    let balances = (await this.accounts.member(member)).balances
      .filter(b => b.owner.equals(balanceId))
      .pop();

    if (balances === undefined) {
      throw new Error(`Invalid balance ID: ${balanceId}`);
    }

    let vaultAcc = await this.accounts.depositVault(member, balanceId);
    if (vaultAcc.mint.equals(depositorAcc.mint)) {
      vaultAddress = balances.vault;
      vault = vaultAcc;
    }

    let megaVaultAcc = await this.accounts.depositMegaVault(member, balanceId);
    if (megaVaultAcc.mint.equals(depositorAcc.mint)) {
      vaultAddress = balances.vaultMega;
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

  async stake(req: StakeRequest): Promise<StakeResponse> {
    let {
      member,
      beneficiary,
      amount,
      spt,
      registrar,
      isMega,
      balanceId,
    } = req;

    const beneficiaryPubkey =
      beneficiary === undefined
        ? this.provider.wallet.publicKey
        : beneficiary.publicKey;

    if (member instanceof PublicKey) {
      const account = await this.accounts.member(member);
      member = {
        publicKey: member,
        account,
      };
    }

    if (registrar === undefined) {
      registrar = await this.accounts.registrar();
    }

    const vaultAuthority = await this.accounts.vaultAuthority(
      this.programId,
      this.registrar,
      registrar,
    );

    const balances = member.account.balances
      .filter(b => b.owner.equals(balanceId))
      .pop();

    if (balances === undefined) throw new Error('balance not found');

    const [vault, vaultStake, poolMint] = (() => {
      if (isMega) {
        return [
          balances.vaultMega,
          balances.vaultStakeMega,
          registrar.poolMintMega,
        ];
      } else {
        return [balances.vault, balances.vaultStake, registrar.poolMint];
      }
    })();

    const tx = new Transaction();
    tx.add(
      new TransactionInstruction({
        keys: [
          { pubkey: member.publicKey, isWritable: true, isSigner: false },
          { pubkey: beneficiaryPubkey, isWritable: false, isSigner: true },
          { pubkey: member.account.entity, isWritable: true, isSigner: false },
          { pubkey: this.registrar, isWritable: false, isSigner: false },

          { pubkey: vault, isWritable: true, isSigner: false },
          { pubkey: vaultAuthority, isWritable: false, isSigner: false },
          { pubkey: vaultStake, isWritable: true, isSigner: false },
          { pubkey: poolMint, isWritable: true, isSigner: false },
          { pubkey: spt, isWritable: true, isSigner: false },
          {
            pubkey: registrar.rewardEventQueue,
            isWritable: false,
            isSigner: false,
          },

          { pubkey: SYSVAR_CLOCK_PUBKEY, isWritable: false, isSigner: false },
          { pubkey: TOKEN_PROGRAM_ID, isWritable: false, isSigner: false },
        ].concat(
          member.account.balances
            .map(b => {
              return [
                { pubkey: b.owner, isWritable: false, isSigner: false },
                { pubkey: b.spt, isWritable: false, isSigner: false },
                {
                  pubkey: b.sptMega,
                  isWritable: false,
                  isSigner: false,
                },
              ];
            })
            // @ts-ignore
            .flat(),
        ),
        programId: this.programId,
        data: instruction.encode({
          stake: {
            amount,
            balanceId,
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
      amount,
      spt,
      registrar,
      isMega,
      balanceId,
    } = req;

    const beneficiaryPubkey =
      beneficiary === undefined
        ? this.provider.wallet.publicKey
        : beneficiary.publicKey;

    if (member instanceof PublicKey) {
      const account = await this.accounts.member(member);
      member = {
        publicKey: member,
        account,
      };
    }

    if (pendingWithdrawal === undefined) {
      pendingWithdrawal = new Account();
    }

    if (registrar === undefined) {
      registrar = await this.accounts.registrar();
    }

    const entity = member.account.entity;

    const vaultAuthority = await this.accounts.vaultAuthority(
      this.programId,
      this.registrar,
      registrar,
    );

    const bId = balanceId.equals(this.provider.wallet.publicKey) ? 0 : 1;

    const [vaultPw, poolVault, poolMint] = (() => {
      if (isMega) {
        return [
          member.account.balances[bId].vaultPendingWithdrawalMega,
          member.account.balances[bId].vaultStakeMega,
          registrar.poolMintMega,
        ];
      } else {
        return [
          member.account.balances[bId].vaultPendingWithdrawal,
          member.account.balances[bId].vaultStake,
          registrar.poolMint,
        ];
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
          { pubkey: member.publicKey, isWritable: true, isSigner: false },
          { pubkey: beneficiaryPubkey, isWritable: false, isSigner: true },
          { pubkey: entity, isWritable: true, isSigner: false },
          { pubkey: this.registrar, isWritable: false, isSigner: false },
          { pubkey: vaultPw, isWritable: true, isSigner: false },
          { pubkey: vaultAuthority, isWritable: false, isSigner: false },
          { pubkey: poolVault, isWritable: true, isSigner: false },
          { pubkey: poolMint, isWritable: true, isSigner: false },
          { pubkey: spt, isWritable: true, isSigner: false },

          { pubkey: SYSVAR_CLOCK_PUBKEY, isWritable: false, isSigner: false },
          { pubkey: TOKEN_PROGRAM_ID, isWritable: false, isSigner: false },
          { pubkey: SYSVAR_RENT_PUBKEY, isWritable: false, isSigner: false },
          {
            pubkey: registrar.rewardEventQueue,
            isWritable: false,
            isSigner: false,
          },
        ].concat(
          member.account.balances
            .map(b => {
              return [
                { pubkey: b.owner, isWritable: false, isSigner: false },
                { pubkey: b.spt, isWritable: false, isSigner: false },
                {
                  pubkey: b.sptMega,
                  isWritable: false,
                  isSigner: false,
                },
              ];
            })
            // @ts-ignore
            .flat(),
        ),
        programId: this.programId,
        data: instruction.encode({
          startStakeWithdrawal: {
            amount,
            balanceId,
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
    let { member, beneficiary, pendingWithdrawal, registrar } = req;
    const beneficiaryPubkey =
      beneficiary === undefined
        ? this.provider.wallet.publicKey
        : beneficiary.publicKey;

    if (member instanceof PublicKey) {
      const account = await this.accounts.member(member);
      member = {
        publicKey: member,
        account,
      };
    }

    if (pendingWithdrawal instanceof PublicKey) {
      const account = await this.accounts.pendingWithdrawal(pendingWithdrawal);
      pendingWithdrawal = {
        publicKey: pendingWithdrawal,
        account,
      };
    }

    if (registrar === undefined) {
      registrar = await this.accounts.registrar();
    }

    let bId = pendingWithdrawal.account.balanceId.equals(
      this.provider.wallet.publicKey,
    )
      ? 0
      : 1;

    const [vault, vaultPw] = (() => {
      const isMega = pendingWithdrawal.account.pool.equals(
        registrar!.poolMintMega,
      );
      if (isMega) {
        return [
          member.account.balances[bId].vaultMega,
          member.account.balances[bId].vaultPendingWithdrawalMega,
        ];
      } else {
        return [
          member.account.balances[bId].vault,
          member.account.balances[bId].vaultPendingWithdrawal,
        ];
      }
    })();

    const vaultAuthority = await this.accounts.vaultAuthority(
      this.programId,
      this.registrar,
      registrar,
    );

    const tx = new Transaction();
    tx.add(
      new TransactionInstruction({
        keys: [
          {
            pubkey: pendingWithdrawal.publicKey,
            isWritable: true,
            isSigner: false,
          },
          { pubkey: member.publicKey, isWritable: true, isSigner: false },
          { pubkey: vault, isWritable: true, isSigner: false },
          { pubkey: vaultPw, isWritable: true, isSigner: false },
          { pubkey: vaultAuthority, isWritable: true, isSigner: false },
          { pubkey: beneficiaryPubkey, isWritable: false, isSigner: true },
          { pubkey: member.account.entity, isWritable: true, isSigner: false },
          { pubkey: TOKEN_PROGRAM_ID, isWritable: true, isSigner: false },
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
    let { member, newEntity, beneficiary, registrar } = req;

    const beneficiaryPubkey =
      beneficiary === undefined
        ? this.provider.wallet.publicKey
        : beneficiary.publicKey;

    if (member instanceof PublicKey) {
      const account = await this.accounts.member(member);
      member = {
        publicKey: member,
        account,
      };
    }

    if (registrar === undefined) {
      registrar = await this.accounts.registrar();
    }

    const vaultAuthority = await this.accounts.vaultAuthority(
      this.programId,
      this.registrar,
      registrar,
    );

    const tx = new Transaction();
    tx.add(
      new TransactionInstruction({
        keys: [
          { pubkey: member.publicKey, isWritable: true, isSigner: false },
          { pubkey: beneficiaryPubkey, isWritable: false, isSigner: true },
          { pubkey: this.registrar, isWritable: false, isSigner: false },
          { pubkey: member.account.entity, isWritable: true, isSigner: false },
          { pubkey: newEntity, isWritable: true, isSigner: false },
          { pubkey: SYSVAR_CLOCK_PUBKEY, isWritable: false, isSigner: false },
          { pubkey: vaultAuthority, isWritable: false, isSigner: false },
          {
            pubkey: registrar.rewardEventQueue,
            isWritable: false,
            isSigner: false,
          },
        ].concat(
          member.account.balances
            .map(b => {
              return [
                { pubkey: b.owner, isWritable: false, isSigner: false },
                { pubkey: b.spt, isWritable: false, isSigner: false },
                {
                  pubkey: b.sptMega,
                  isWritable: false,
                  isSigner: false,
                },
              ];
            })
            // @ts-ignore
            .flat(),
        ),
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

  async dropLockedReward(
    req: DropLockedRewardRequest,
  ): Promise<DropLockedRewardResponse> {
    let {
      total,
      endTs,
      expiryTs,
      depositor,
      depositorMint,
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
            expiryReceiver: this.provider.wallet.publicKey,
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
    let { total, expiryTs, depositor, depositorMint, poolTokenMint } = req;
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
            expiryReceiver: this.provider.wallet.publicKey,
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
      vendorSigner,
      safe,
      lockupProgramId,
      mint,
      poolMint,
    } = req;

    if (member instanceof PublicKey) {
      const account = await this.accounts.member(member);
      member = {
        publicKey: member,
        account,
      };
    }

    if (vendor instanceof PublicKey) {
      vendor = await this.accounts.lockedRewardVendor(vendor);
    }

    if (!poolMint) {
      const r = await this.accounts.registrar();
      poolMint = r.poolMint;
    }

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
          {
            pubkey: this.provider.wallet.publicKey,
            isWritable: false,
            isSigner: true,
          },
          { pubkey: member.account.entity, isWritable: false, isSigner: false },
          { pubkey: member.publicKey, isWritable: true, isSigner: false },
          { pubkey: this.registrar, isWritable: false, isSigner: false },
          { pubkey: vendor.publicKey, isWritable: false, isSigner: false },
          { pubkey: vendor.account.vault, isWritable: true, isSigner: false },
          { pubkey: vendorSigner, isWritable: false, isSigner: false },
          { pubkey: safe, isWritable: false, isSigner: false },
          { pubkey: lockupProgramId, isWritable: false, isSigner: false },
          { pubkey: vesting.publicKey, isWritable: true, isSigner: false },
          { pubkey: vestingVault.publicKey, isWritable: true, isSigner: false },
          { pubkey: TOKEN_PROGRAM_ID, isWritable: false, isSigner: false },
          { pubkey: SYSVAR_RENT_PUBKEY, isWritable: false, isSigner: false },
          { pubkey: SYSVAR_CLOCK_PUBKEY, isWritable: false, isSigner: false },
        ].concat(
          member.account.balances.map(b => {
            return (vendor as ProgramAccount<
              LockedRewardVendor
            >).account.pool.equals(poolMint!)
              ? {
                  pubkey: b.spt,
                  isWritable: false,
                  isSigner: false,
                }
              : {
                  pubkey: b.sptMega,
                  isWritable: false,
                  isSigner: false,
                };
          }),
        ),
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
    let { cursor, member, vendor, vendorSigner, token, poolMint } = req;

    if (member instanceof PublicKey) {
      const account = await this.accounts.member(member);
      member = {
        publicKey: member,
        account,
      };
    }

    if (vendor instanceof PublicKey) {
      vendor = await this.accounts.lockedRewardVendor(vendor);
    }

    if (!poolMint) {
      const r = await this.accounts.registrar();
      poolMint = r.poolMint;
    }

    const tx = new Transaction();
    tx.add(
      new TransactionInstruction({
        keys: [
          {
            pubkey: this.provider.wallet.publicKey,
            isWritable: false,
            isSigner: true,
          },
          { pubkey: member.account.entity, isWritable: false, isSigner: false },
          { pubkey: member.publicKey, isWritable: true, isSigner: false },
          { pubkey: this.registrar, isWritable: false, isSigner: false },
          { pubkey: vendor.publicKey, isWritable: false, isSigner: false },
          { pubkey: vendor.account.vault, isWritable: true, isSigner: false },
          { pubkey: vendorSigner, isWritable: false, isSigner: false },
          { pubkey: token, isWritable: true, isSigner: false },
          { pubkey: TOKEN_PROGRAM_ID, isWritable: false, isSigner: false },
          { pubkey: SYSVAR_CLOCK_PUBKEY, isWritable: false, isSigner: false },
        ].concat(
          member.account.balances.map(b => {
            return (vendor as ProgramAccount<
              UnlockedRewardVendor
            >).account.pool.equals(poolMint!)
              ? {
                  pubkey: b.spt,
                  isWritable: false,
                  isSigner: false,
                }
              : {
                  pubkey: b.sptMega,
                  isWritable: false,
                  isSigner: false,
                };
          }),
        ),
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
}

type InitializeRequest = {
  programId: PublicKey;
  metaEntityProgramId: PublicKey;
  mint: PublicKey;
  megaMint: PublicKey;
  withdrawalTimelock: BN;
  deactivationTimelock: BN;
  maxStakePerEntity: BN;
  stakeRate: BN;
  stakeRateMega: BN;
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
  txs: Array<TransactionSignature>;
  member: PublicKey;
  balances: [accounts.BalanceSandbox, accounts.BalanceSandbox];
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
  member: PublicKey | ProgramAccount<Member>;
  newEntity: PublicKey;
  beneficiary?: Account;
  registrar?: Registrar;
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
  member: PublicKey | ProgramAccount<Member>;
  beneficiary?: Account;
  amount: BN;
  spt: PublicKey;
  registrar?: Registrar;
  isMega?: boolean;
  balanceId: PublicKey;
};

type StakeResponse = {
  tx: TransactionSignature;
};

type StartStakeWithdrawalRequest = {
  member: PublicKey | ProgramAccount<Member>;
  amount: BN;
  spt: PublicKey;
  pendingWithdrawal?: Account;
  beneficiary?: Account;
  isMega?: boolean;
  registrar?: Registrar;
  balanceId: PublicKey;
};

type StartStakeWithdrawalResponse = {
  tx: TransactionSignature;
  pendingWithdrawal: PublicKey;
};

type EndStakeWithdrawalRequest = {
  member: PublicKey | ProgramAccount<Member>;
  pendingWithdrawal: PublicKey | ProgramAccount<PendingWithdrawal>;
  registrar?: Registrar;
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

type DropLockedRewardRequest = {
  total: BN;
  endTs: BN;
  expiryTs: BN;
  depositor: PublicKey;
  depositorMint: PublicKey;
  poolTokenMint: PublicKey;
  periodCount: BN;
};

type DropLockedRewardResponse = {
  tx: TransactionSignature;
};

type DropUnlockedRewardRequest = {
  total: BN;
  expiryTs: BN;
  depositor: PublicKey;
  depositorMint: PublicKey;
  poolTokenMint: PublicKey;
};

type DropUnlockedRewardResponse = {
  tx: TransactionSignature;
};

type ClaimLockedRewardRequest = {
  cursor: number;
  member: PublicKey | ProgramAccount<Member>;
  vendor: PublicKey | ProgramAccount<LockedRewardVendor>;
  vendorSigner: PublicKey;
  safe: PublicKey;
  lockupProgramId: PublicKey;
  mint: PublicKey;
  poolMint?: PublicKey;
};

type ClaimLockedRewardResponse = {
  tx: TransactionSignature;
};

type ClaimUnlockedRewardRequest = {
  cursor: number;
  member: PublicKey | ProgramAccount<Member>;
  vendor: PublicKey | ProgramAccount<UnlockedRewardVendor>;
  vendorSigner: PublicKey;
  token: PublicKey;
  poolMint?: PublicKey;
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

type BalanceSandboxAccounts = {
  tx0: TransactionSignature;
  tx1: TransactionSignature;
  spt: PublicKey;
  sptMega: PublicKey;
  vault: PublicKey;
  vaultMega: PublicKey;
  vaultStake: PublicKey;
  vaultStakeMega: PublicKey;
  vaultPw: PublicKey;
  vaultPwMega: PublicKey;
};

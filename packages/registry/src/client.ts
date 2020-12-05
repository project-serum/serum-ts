import BN from 'bn.js';
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
import { AccountInfo } from '@solana/spl-token';
import { TOKEN_PROGRAM_ID } from '@project-serum/serum/lib/token-instructions';
import {
  createMint,
  createTokenAccount,
  getTokenAccount,
  createAccountRentExempt,
  SPL_SHARED_MEMORY_ID,
  Provider,
  Wallet,
  NodeWallet,
} from '@project-serum/common';
import {
  encodePoolState,
  decodePoolState,
  PoolState,
  Basket,
  PoolInstructions,
} from '@project-serum/pool';
import * as instruction from './instruction';
import * as accounts from './accounts';
import {
  Registrar,
  SIZE as REGISTRAR_SIZE,
  STAKE_POOL_NAME,
  MEGA_STAKE_POOL_NAME,
} from './accounts/registrar';
import { PendingWithdrawal } from './accounts/pending-withdrawal';
import { Entity } from './accounts/entity';
import { Member } from './accounts/member';
import { Generation } from './accounts/generation';
import { SERUM_FEE_OWNER_ADDRESS } from '@project-serum/pool/dist/lib/instructions';

export const networks = {
  devnet: {
    url: 'https://devnet.solana.com',
    programId: new PublicKey('HM7psK4cwnn7DXmzhRPbABB9vcA5UR4jLgBwGx98Ntqj'),
    stakeProgramId: new PublicKey(
      'FFXx3NM8fXxa4TainZ5o26xrzLuoZQCMZ238cyQGmX8H',
    ),
    registrar: new PublicKey('AraER5NbsTzDQV2h6gGz3b7WHfYAejQQbKdn9aSHaqKi'),
    srm: new PublicKey('2gsgrFTjFsckJiPifzkHP3tznMuqVbh5TTUcVd3iMVQx'),
    msrm: new PublicKey('4gq1S2B4yheTmvy61oArkBqZx7iCid6pvYbn242epFCk'),
    god: new PublicKey('9PRbiYDXcFig3C6cu7VBFuypqbaPfqdq8knY85AgvrKw'),
    megaGod: new PublicKey('dMyk9X7KjyHFAhdDNyEad9k2SaUMQ8Yy42CjMxZfi4V'),
  },
};

type Config = {
  provider: Provider;
  programId: PublicKey;
  stakeProgramId: PublicKey;
  registrar: PublicKey;
};

export default class Client {
  readonly provider: Provider;
  readonly programId: PublicKey;
  readonly stakeProgramId: PublicKey;
  readonly accounts: Accounts;
  readonly registrar: PublicKey;

  constructor(cfg: Config) {
    this.provider = cfg.provider;
    this.programId = cfg.programId;
    this.stakeProgramId = cfg.stakeProgramId;
    this.accounts = new Accounts(cfg.provider, cfg.registrar);
    this.registrar = cfg.registrar;
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
      programId: networks.devnet.programId,
      stakeProgramId: networks.devnet.stakeProgramId,
      registrar: networks.devnet.registrar,
    });
  }

  // Initializes both the registry and its associated staking pool.
  static async initialize(
    provider: Provider,
    req: InitializeRequest,
  ): Promise<[Client, InitializeResponse]> {
    let {
      programId,
      stakeProgramId,
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
    const pool = new Account();
    const megaPool = new Account();

    // Create program vault authorities.
    const [vaultAuthority, vaultNonce] = await PublicKey.findProgramAddress(
      [registrar.publicKey.toBuffer()],
      programId,
    );
    const [
      poolVaultAuthority,
      poolVaultNonce,
    ] = await PublicKey.findProgramAddress(
      [pool.publicKey.toBuffer()],
      stakeProgramId,
    );
    const [
      megaPoolVaultAuthority,
      megaPoolVaultNonce,
    ] = await PublicKey.findProgramAddress(
      [megaPool.publicKey.toBuffer()],
      stakeProgramId,
    );

    // Create program vaults.
    const vault = await createTokenAccount(provider, mint, vaultAuthority);
    const megaVault = await createTokenAccount(
      provider,
      megaMint,
      vaultAuthority,
    );
    const poolVault = await createTokenAccount(
      provider,
      mint,
      poolVaultAuthority,
    );
    const megaPoolVault = await createTokenAccount(
      provider,
      mint,
      megaPoolVaultAuthority,
    );
    const megaPoolMegaVault = await createTokenAccount(
      provider,
      megaMint,
      megaPoolVaultAuthority,
    );

    // Create pool tokens.
    const poolMint = await createMint(provider, poolVaultAuthority);
    const megaPoolMint = await createMint(provider, megaPoolVaultAuthority);

    const poolFeesAccount = await createTokenAccount(
      provider,
      poolMint,
      SERUM_FEE_OWNER_ADDRESS,
    );
    const megaPoolFeesAccount = await createTokenAccount(
      provider,
      megaPoolMint,
      SERUM_FEE_OWNER_ADDRESS,
    );

    const createTx = new Transaction();
    createTx.add(
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
      // Create staking pool.
      SystemProgram.createAccount({
        fromPubkey: provider.wallet.publicKey,
        newAccountPubkey: pool.publicKey,
        space: POOL_STATE_SIZE,
        lamports: await provider.connection.getMinimumBalanceForRentExemption(
          POOL_STATE_SIZE,
        ),
        programId: stakeProgramId,
      }),
      // Create mega staking pool.
      SystemProgram.createAccount({
        fromPubkey: provider.wallet.publicKey,
        newAccountPubkey: megaPool.publicKey,
        space: MEGA_POOL_STATE_SIZE,
        lamports: await provider.connection.getMinimumBalanceForRentExemption(
          MEGA_POOL_STATE_SIZE,
        ),
        programId: stakeProgramId,
      }),
    );

    // Program specific accounts.
    const additionalAccounts = [
      { pubkey: vaultAuthority, isWritable: false, isSigner: false },
    ];
    const initTx = new Transaction();
    initTx.add(
      // Initialize pool.
      PoolInstructions.initialize(
        stakeProgramId,
        pool.publicKey,
        poolMint,
        STAKE_POOL_NAME,
        [poolVault],
        poolVaultAuthority,
        poolVaultNonce,
        poolFeesAccount,
        poolFeesAccount,
        150,
        additionalAccounts,
      ),
      // Initialize mega pool.
      PoolInstructions.initialize(
        stakeProgramId,
        megaPool.publicKey,
        megaPoolMint,
        MEGA_STAKE_POOL_NAME,
        [megaPoolVault, megaPoolMegaVault],
        megaPoolVaultAuthority,
        megaPoolVaultNonce,
        megaPoolFeesAccount,
        megaPoolFeesAccount,
        150,
        additionalAccounts,
      ),
      // Iniitalize registrar.
      new TransactionInstruction({
        keys: [
          { pubkey: registrar.publicKey, isWritable: true, isSigner: false },
          { pubkey: vault, isWritable: false, isSigner: false },
          { pubkey: megaVault, isWritable: false, isSigner: false },
          { pubkey: pool.publicKey, isWritable: false, isSigner: false },
          { pubkey: megaPool.publicKey, isWritable: false, isSigner: false },
          {
            pubkey: stakeProgramId,
            isWritable: false,
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

    const createSigners = [registrar, pool, megaPool];

    const createTxSig = await provider.send(createTx, createSigners);
    const initTxSig = await provider.send(initTx);

    const client = new Client({
      registrar: registrar.publicKey,
      provider,
      programId,
      stakeProgramId,
    });

    return [
      client,
      {
        createTx: createTxSig,
        initTx: initTxSig,
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
  // 800 922 0204
  async createEntity(req: CreateEntityRequest): Promise<CreateEntityResponse> {
    let { leader } = req;
    const leaderPubkey =
      leader === undefined ? this.provider.wallet.publicKey : leader.publicKey;

    const entity = new Account();

    const tx = new Transaction();
    tx.add(
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
          createEntity: {},
        }),
      }),
    );

    let signers = [entity, leader];
    let txSig = await this.provider.send(tx, signers);

    return {
      tx: txSig,
      entity: entity.publicKey,
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
    let { beneficiary, entity, delegate } = req;

    const beneficiaryPubkey =
      beneficiary === undefined
        ? this.provider.wallet.publicKey
        : beneficiary.publicKey;

    if (delegate === undefined) {
      delegate = new PublicKey(Buffer.alloc(32));
    }

    const member = new Account();
    const [_, nonce] = await PublicKey.findProgramAddress(
      [member.publicKey.toBuffer(), beneficiaryPubkey.toBuffer()],
      this.programId,
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
      new TransactionInstruction({
        keys: [
          { pubkey: beneficiaryPubkey, isWritable: false, isSigner: true },
          { pubkey: member.publicKey, isWritable: true, isSigner: false },
          { pubkey: entity, isWritable: true, isSigner: false },
          { pubkey: this.registrar, isWritable: false, isSigner: false },
          { pubkey: SYSVAR_RENT_PUBKEY, isWritable: false, isSigner: false },
        ],
        programId: this.programId,
        data: instruction.encode({
          createMember: {
            delegate: delegate,
            nonce,
          },
        }),
      }),
    );

    let signers = [member, beneficiary];

    let txSig = await this.provider.send(tx, signers);

    return {
      tx: txSig,
      member: member.publicKey,
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

  async deposit(req: DepositRequest): Promise<DepositResponse> {
    let {
      entity,
      member,
      beneficiary,
      depositor,
      depositorAuthority,
      amount,
      vault,
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
    if (vault === undefined) {
      vault = (await this.vaultFor(depositor)).vaultAddress as PublicKey;
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
          // Program specific.
          { pubkey: member, isWritable: true, isSigner: false },
          { pubkey: beneficiaryPubkey, isWritable: false, isSigner: true },
          { pubkey: entity, isWritable: true, isSigner: false },
          { pubkey: this.registrar, isWritable: false, isSigner: false },
          { pubkey: SYSVAR_CLOCK_PUBKEY, isWritable: false, isSigner: false },
          { pubkey: vault, isWritable: true, isSigner: false },
        ].concat(await this.poolAccounts()),
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

  private async poolFor(
    poolToken: PublicKey,
    r: Registrar,
  ): Promise<{ pool: PoolState; isMega: boolean }> {
    let poolTokenAcc = await getTokenAccount(this.provider, poolToken);
    let pool = await this.accounts.pool(r);
    if (pool.poolTokenMint.equals(poolTokenAcc.mint)) {
      return { pool, isMega: false };
    }
    let megaPool = await this.accounts.megaPool(r);
    if (megaPool.poolTokenMint.equals(poolTokenAcc.mint)) {
      return { pool: megaPool, isMega: true };
    }
    throw new Error(`Failed top find pool for ${poolToken}`);
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
    } = req;
    if (entity === undefined) {
      let m = await this.accounts.member(member);
      entity = m.entity;
    }
    let v = await this.vaultFor(depositor);
    if (vault === undefined) {
      vault = v.vaultAddress;
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
          { pubkey: v.vault.owner, isWritable: true, isSigner: false },
          // Program specific.
          { pubkey: member, isWritable: true, isSigner: false },
          { pubkey: beneficiaryPubkey, isWritable: false, isSigner: true },
          { pubkey: entity, isWritable: true, isSigner: false },
          { pubkey: this.registrar, isWritable: false, isSigner: false },
          { pubkey: SYSVAR_CLOCK_PUBKEY, isWritable: false, isSigner: false },
          { pubkey: v.vault.owner, isWritable: true, isSigner: false },
        ].concat(await this.poolAccounts()),
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
    let { member, beneficiary, entity, amount, stakeToken } = req;

    const beneficiaryPubkey =
      beneficiary === undefined
        ? this.provider.wallet.publicKey
        : beneficiary.publicKey;

    if (entity === undefined) {
      let m = await this.accounts.member(member);
      entity = m.entity;
    }

    const tx = new Transaction();
    tx.add(
      new TransactionInstruction({
        keys: [
          { pubkey: member, isWritable: true, isSigner: false },
          { pubkey: beneficiaryPubkey, isWritable: false, isSigner: true },
          { pubkey: entity, isWritable: true, isSigner: false },
          { pubkey: this.registrar, isWritable: false, isSigner: false },
          { pubkey: SYSVAR_CLOCK_PUBKEY, isWritable: false, isSigner: false },
          { pubkey: TOKEN_PROGRAM_ID, isWritable: false, isSigner: false },
        ].concat(await this.executePoolAccounts(stakeToken)),
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

  private async executePoolAccounts(
    poolToken: PublicKey,
    r?: Registrar,
  ): Promise<Array<AccountMeta>> {
    if (r === undefined) {
      r = await this.accounts.registrar(this.registrar);
    }
    const accs = await this.poolAccounts(r);

    let assetAccs = await (async (): Promise<Array<AccountMeta>> => {
      const { pool, isMega } = await this.poolFor(poolToken, r);
      let assetAccs = [r.vault];
      if (isMega) {
        assetAccs.push(r.megaVault);
      }
      return assetAccs.map(a => {
        return { pubkey: a, isWritable: true, isSigner: false };
      });
    })();

    let vaultAuthority = await this.accounts.vaultAuthority(
      this.programId,
      this.registrar,
      r,
    );

    return accs
      .concat([{ pubkey: poolToken, isWritable: true, isSigner: false }])
      .concat(assetAccs)
      .concat([{ pubkey: vaultAuthority, isWritable: false, isSigner: false }]);
  }

  private async poolAccounts(r?: Registrar): Promise<Array<AccountMeta>> {
    if (r === undefined) {
      r = await this.accounts.registrar(this.registrar);
    }
    let pool = await this.accounts.pool(r);
    let megaPool = await this.accounts.megaPool(r);
    let retbuf = await createAccountRentExempt(
      this.provider,
      SPL_SHARED_MEMORY_ID,
      MAX_BASKET_SIZE,
    );
    return [
      // Pids.
      { pubkey: this.stakeProgramId, isWritable: false, isSigner: false },
      { pubkey: SPL_SHARED_MEMORY_ID, isWritable: false, isSigner: false },
      { pubkey: retbuf.publicKey, isWritable: true, isSigner: false },
      // Pool.
      { pubkey: r.pool, isWritable: true, isSigner: false },
      { pubkey: pool.poolTokenMint, isWritable: true, isSigner: false },
      {
        pubkey: pool.assets[0].vaultAddress,
        isWritable: true,
        isSigner: false,
      },
      { pubkey: pool.vaultSigner, isWritable: false, isSigner: false },
      // Mega pool.
      { pubkey: r.megaPool, isWritable: true, isSigner: false },
      { pubkey: megaPool.poolTokenMint, isWritable: true, isSigner: false },
      {
        pubkey: megaPool.assets[0].vaultAddress,
        isWritable: true,
        isSigner: false,
      },
      {
        pubkey: megaPool.assets[1].vaultAddress,
        isWritable: true,
        isSigner: false,
      },
      { pubkey: megaPool.vaultSigner, isWritable: false, isSigner: false },
    ];
  }

  async markGeneration(
    req: MarkGenerationRequest,
  ): Promise<MarkGenerationResponse> {
    let { entity, generation } = req;

    if (generation === undefined) {
      generation = (
        await createAccountRentExempt(
          this.provider,
          this.programId,
          accounts.generation.SIZE,
        )
      ).publicKey;
    }
    const tx = new Transaction();
    tx.add(
      new TransactionInstruction({
        keys: [
          { pubkey: generation, isWritable: true, isSigner: false },
          { pubkey: entity, isWritable: false, isSigner: false },
          { pubkey: this.registrar, isWritable: false, isSigner: false },
        ],
        programId: this.programId,
        data: instruction.encode({
          markGeneration: {},
        }),
      }),
    );

    let txSig = await this.provider.send(tx);

    return {
      tx: txSig,
      generation,
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
      stakeToken,
      generation,
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

    let vaultAuthority = await this.accounts.vaultAuthority(
      this.programId,
      this.registrar,
    );

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
          { pubkey: vaultAuthority, isWritable: false, isSigner: false },
          { pubkey: TOKEN_PROGRAM_ID, isWritable: false, isSigner: false },
          { pubkey: SYSVAR_CLOCK_PUBKEY, isWritable: false, isSigner: false },
          { pubkey: SYSVAR_RENT_PUBKEY, isWritable: false, isSigner: false },
        ]
          .concat(await this.executePoolAccounts(stakeToken))
          .concat(
            generation === undefined
              ? []
              : [
                  {
                    pubkey: generation,
                    isWritable: false,
                    isSigner: false,
                  },
                ],
          ),
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

  // Allocates a staking pool token. Note that the token doesn't belong to
  // the user until `stake` has been called, at which point the Registry will
  // mint a balance to the token account and set the delegate to be the
  // beneficiary.
  async allocSpt(isMega: boolean): Promise<PublicKey> {
    const owner = await this.accounts.vaultAuthority(
      this.programId,
      this.registrar,
    );
    let pool = isMega
      ? await this.accounts.megaPool(this.registrar)
      : await this.accounts.pool(this.registrar);
    let spt = await createTokenAccount(
      this.provider,
      pool.poolTokenMint,
      owner,
    );

    return spt;
  }
}

class Accounts {
  constructor(
    readonly provider: Provider,
    readonly registrarAddress: PublicKey,
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

  async member(address: PublicKey): Promise<Member> {
    const accountInfo = await this.provider.connection.getAccountInfo(address);
    if (accountInfo === null) {
      throw new Error(`Member does not exist ${address}`);
    }
    return accounts.member.decode(accountInfo.data);
  }

  async pendingWithdrawal(address: PublicKey): Promise<PendingWithdrawal> {
    const accountInfo = await this.provider.connection.getAccountInfo(address);
    if (accountInfo === null) {
      throw new Error(`PendingWithdrawal does not exist ${address}`);
    }
    return accounts.pendingWithdrawal.decode(accountInfo.data);
  }

  async depositVault(registrarAddr: PublicKey): Promise<AccountInfo> {
    let r = await this.registrar(registrarAddr);
    return getTokenAccount(this.provider, r.vault);
  }

  async depositMegaVault(registrarAddr: PublicKey): Promise<AccountInfo> {
    let r = await this.registrar(registrarAddr);
    return getTokenAccount(this.provider, r.megaVault);
  }

  async pool(registrar: PublicKey | Registrar): Promise<PoolState> {
    if (registrar instanceof PublicKey) {
      registrar = await this.registrar(registrar);
    }
    let acc = await this.provider.connection.getAccountInfo(registrar.pool);
    if (acc === null) {
      throw new Error('Failed to find staking pool');
    }
    return decodePoolState(acc.data);
  }

  async poolVault(registrar: PublicKey | Registrar): Promise<AccountInfo> {
    const p = await this.pool(registrar);
    return getTokenAccount(this.provider, p.assets[0].vaultAddress);
  }

  async megaPoolVaults(
    registrar: PublicKey | Registrar,
  ): Promise<[AccountInfo, AccountInfo]> {
    const p = await this.pool(registrar);
    return Promise.all([
      getTokenAccount(this.provider, p.assets[0].vaultAddress),
      getTokenAccount(this.provider, p.assets[1].vaultAddress),
    ]);
  }

  async megaPool(registrar: PublicKey | Registrar): Promise<PoolState> {
    if (registrar instanceof PublicKey) {
      registrar = await this.registrar(registrar);
    }
    let acc = await this.provider.connection.getAccountInfo(registrar.megaPool);
    if (acc === null) {
      throw new Error('Failed to find staking pool');
    }
    return decodePoolState(acc.data);
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
}

type InitializeRequest = {
  programId: PublicKey;
  stakeProgramId: PublicKey;
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
  createTx: TransactionSignature;
  initTx: TransactionSignature;
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
};

type CreateEntityResponse = {
  tx: TransactionSignature;
  entity: PublicKey;
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
  beneficiary?: Account;
  entity: PublicKey;
  delegate?: PublicKey;
};

type CreateMemberResponse = {
  tx: TransactionSignature;
  member: PublicKey;
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
};

type WithdrawResponse = {
  tx: TransactionSignature;
};

type StakeRequest = {
  member: PublicKey;
  beneficiary?: Account;
  entity?: PublicKey;
  amount: BN;
  stakeToken: PublicKey;
};

type StakeResponse = {
  tx: TransactionSignature;
};

type MarkGenerationRequest = {
  entity: PublicKey;
  generation?: PublicKey;
};

type MarkGenerationResponse = {
  tx: TransactionSignature;
  generation: PublicKey;
};

type StartStakeWithdrawalRequest = {
  // Encourage the user to pass this in to encourage persisting this address
  // before invoking this function (so as not to lose the PendingWithdrawal
  // address).
  pendingWithdrawal?: Account;
  member: PublicKey;
  beneficiary?: Account;
  entity?: PublicKey;
  amount: BN;
  stakeToken: PublicKey;
  // generation must be provided if the entity is inactive.
  generation?: PublicKey;
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

// The maximum basket size. Used to create the "retbuf" shared memory account
// data to pass data back from the staking pool to the registry via CPI.
//
// The SRM pool has a basket with a single asset quantitiy. The MSRM pool,
// however, has two assets (SRM and MSRM) and so has a larger size.
const MAX_BASKET_SIZE: number = maxBasketSize();

const POOL_STATE_SIZE: number = poolStateSize(1);

const MEGA_POOL_STATE_SIZE: number = poolStateSize(2);

function maxBasketSize(): number {
  const b = {
    quantities: [new BN(0), new BN(0)],
  };
  const buffer = Buffer.alloc(1000);
  const len = Basket.encode(b, buffer);
  return len;
}

function poolStateSize(assetLen: number): number {
  return encodePoolState({
    poolTokenMint: new PublicKey(Buffer.alloc(32)),
    assets: [...Array(assetLen)].map(() => {
      return {
        mint: new PublicKey(Buffer.alloc(32)),
        vaultAddress: new PublicKey(Buffer.alloc(32)),
      };
    }),
    vaultSigner: new PublicKey(Buffer.alloc(32)),
    vaultSignerNonce: 0,
    accountParams: [...Array(assetLen)].map(() => {
      return {
        address: new PublicKey(Buffer.alloc(32)),
        writable: false,
      };
    }),
    name: STAKE_POOL_NAME,
    initializerFeeVault: new PublicKey(Buffer.alloc(32)),
    serumFeeVault: new PublicKey(Buffer.alloc(32)),
    feeRate: 150,
    adminKey: new PublicKey(Buffer.alloc(32)),
    customState: Buffer.from([]),
  }).length;
}

import { promisify } from 'util';
import { homedir } from 'os';
import { readFile } from 'fs';
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
  SYSVAR_RENT_PUBKEY,
  SYSVAR_CLOCK_PUBKEY,
} from '@solana/web3.js';
import { AccountInfo } from '@solana/spl-token';
import { TOKEN_PROGRAM_ID } from '@project-serum/serum/lib/token-instructions';
import {
  sendAndConfirmTransaction,
  createTokenAccount,
  getTokenAccount,
  createAccountRentExempt,
  SPL_SHARED_MEMORY_ID,
} from '@project-serum/common';
import { decodePoolState, PoolState, Basket } from '@project-serum/pool';
import * as instruction from './instruction';
import * as accounts from './accounts';
import { Registrar } from './accounts/registrar';
import { PendingWithdrawal } from './accounts/pending-withdrawal';
import { Entity } from './accounts/entity';
import { Member, Watchtower } from './accounts/member';

type Config = {
  connection: Connection;
  payer: Account;
  programId: PublicKey;
  stakeProgramId: PublicKey;
  registrar: PublicKey;
};

export default class Client {
  readonly connection: Connection;
  readonly payer: Account;
  readonly programId: PublicKey;
  readonly stakeProgramId: PublicKey;
  readonly accounts: Accounts;
  readonly registrar: PublicKey;

  constructor(cfg: Config) {
    this.connection = cfg.connection;
    this.payer = cfg.payer;
    this.programId = cfg.programId;
    this.stakeProgramId = cfg.stakeProgramId;
    this.accounts = new Accounts(cfg.connection);
    this.registrar = cfg.registrar;
  }

  static async local(
    programId: PublicKey,
    stakeProgramId: PublicKey,
    registrar: PublicKey,
  ): Promise<Client> {
    const connection = new Connection('http://localhost:8899', 'recent');
    const payer = new Account(
      Buffer.from(
        JSON.parse(
          await promisify(readFile)(homedir() + '/.config/solana/id.json', {
            encoding: 'utf-8',
          }),
        ),
      ),
    );
    return new Client({
      connection,
      payer,
      programId,
      stakeProgramId,
      registrar,
    });
  }

  async createEntity(req: CreateEntityRequest): Promise<CreateEntityResponse> {
    let { leader } = req;
    if (leader === undefined) {
      leader = this.payer;
    }

    const entity = new Account();

    const tx = new Transaction();
    tx.add(
      SystemProgram.createAccount({
        fromPubkey: this.payer.publicKey,
        newAccountPubkey: entity.publicKey,
        lamports: await this.connection.getMinimumBalanceForRentExemption(
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
          { pubkey: leader.publicKey, isWritable: false, isSigner: true },
          { pubkey: this.registrar, isWritable: false, isSigner: false },
          { pubkey: SYSVAR_RENT_PUBKEY, isWritable: false, isSigner: false },
        ],
        programId: this.programId,
        data: instruction.encode({
          createEntity: {},
        }),
      }),
    );

    let signers = [this.payer, entity, leader];

    let txSig = await sendAndConfirmTransaction(this.connection, tx, signers);

    return {
      tx: txSig,
      entity: entity.publicKey,
    };
  }

  async updateEntity(req: UpdateEntityRequest): Promise<UpdateEntityResponse> {
    let { leader, newLeader, entity } = req;
    if (leader === undefined) {
      leader = this.payer;
    }

    const tx = new Transaction();
    tx.add(
      new TransactionInstruction({
        keys: [
          { pubkey: entity, isWritable: true, isSigner: false },
          { pubkey: leader.publicKey, isWritable: false, isSigner: true },
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

    let signers = [this.payer, leader];

    let txSig = await sendAndConfirmTransaction(this.connection, tx, signers);

    return {
      tx: txSig,
    };
  }

  async createMember(req: CreateMemberRequest): Promise<CreateMemberResponse> {
    let { beneficiary, entity, delegate, watchtower, watchtowerDst } = req;
    if (beneficiary === undefined) {
      beneficiary = this.payer;
    }
    if (delegate === undefined) {
      delegate = new PublicKey(Buffer.alloc(32));
    }
    if (watchtower === undefined) {
      watchtower = new PublicKey(Buffer.alloc(32));
    }
    if (watchtowerDst === undefined) {
      watchtowerDst = new PublicKey(Buffer.alloc(32));
    }

    const member = new Account();
    const tx = new Transaction();
    tx.add(
      SystemProgram.createAccount({
        fromPubkey: this.payer.publicKey,
        newAccountPubkey: member.publicKey,
        lamports: await this.connection.getMinimumBalanceForRentExemption(
          accounts.member.SIZE,
        ),
        space: accounts.member.SIZE,
        programId: this.programId,
      }),
    );

    tx.add(
      new TransactionInstruction({
        keys: [
          { pubkey: beneficiary.publicKey, isWritable: false, isSigner: true },
          { pubkey: member.publicKey, isWritable: true, isSigner: false },
          { pubkey: entity, isWritable: true, isSigner: false },
          { pubkey: this.registrar, isWritable: false, isSigner: false },
          { pubkey: SYSVAR_RENT_PUBKEY, isWritable: false, isSigner: false },
        ],
        programId: this.programId,
        data: instruction.encode({
          createMember: {
            delegate: delegate,
            watchtower: {
              authority: watchtower,
              dst: watchtowerDst,
            },
          },
        }),
      }),
    );

    let signers = [this.payer, member, beneficiary];

    let txSig = await sendAndConfirmTransaction(this.connection, tx, signers);

    return {
      tx: txSig,
      member: member.publicKey,
    };
  }

  async updateMember(req: UpdateMemberRequest): Promise<UpdateMemberResponse> {
    let { member, beneficiary, delegate, watchtower } = req;
    if (beneficiary === undefined) {
      beneficiary = this.payer;
    }

    const tx = new Transaction();
    tx.add(
      new TransactionInstruction({
        keys: [
          { pubkey: member, isWritable: true, isSigner: false },
          { pubkey: beneficiary.publicKey, isWritable: false, isSigner: true },
        ],
        programId: this.programId,
        data: instruction.encode({
          updateMember: {
            watchtower,
            delegate,
          },
        }),
      }),
    );

    let signers = [this.payer, beneficiary];
    let txSig = await sendAndConfirmTransaction(this.connection, tx, signers);

    return {
      tx: txSig,
    };
  }

  async switchEntity(req: SwitchEntityRequest): Promise<SwitchEntityResponse> {
    let { member, entity, newEntity, beneficiary } = req;

    if (entity === undefined) {
      entity = (await this.accounts.member(member)).entity;
    }
    if (beneficiary === undefined) {
      beneficiary = this.payer;
    }

    const tx = new Transaction();
    tx.add(
      new TransactionInstruction({
        keys: [
          { pubkey: member, isWritable: true, isSigner: false },
          { pubkey: beneficiary.publicKey, isWritable: false, isSigner: true },
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

    let signers = [this.payer, beneficiary];
    let txSig = await sendAndConfirmTransaction(this.connection, tx, signers);

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

    if (beneficiary === undefined) {
      beneficiary = this.payer;
    }
    if (depositorAuthority === undefined) {
      depositorAuthority = beneficiary;
    }
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
            pubkey: depositorAuthority.publicKey,
            isWritable: true,
            isSigner: true,
          },
          { pubkey: TOKEN_PROGRAM_ID, isWritable: false, isSigner: false },
          // Program specific.
          { pubkey: member, isWritable: true, isSigner: false },
          { pubkey: beneficiary.publicKey, isWritable: false, isSigner: true },
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

    let signers = [this.payer, depositorAuthority, beneficiary];
    let txSig = await sendAndConfirmTransaction(this.connection, tx, signers);

    return {
      tx: txSig,
    };
  }

  private async vaultFor(
    depositor: PublicKey,
  ): Promise<{ vaultAddress: PublicKey; vault: AccountInfo }> {
    let vaultAddress = undefined;
    let vault = undefined;

    let depositorAcc = await getTokenAccount(this.connection, depositor);

    let r = await this.accounts.registrar(this.registrar);

    let vaultAcc = await this.accounts.vault(this.registrar);
    if (vaultAcc.mint.equals(depositorAcc.mint)) {
      vaultAddress = r.vault;
      vault = vaultAcc;
    }
    let megaVaultAcc = await this.accounts.megaVault(this.registrar);
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
    let poolTokenAcc = await getTokenAccount(this.connection, poolToken);
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

    if (beneficiary === undefined) {
      beneficiary = this.payer;
    }
    if (depositorAuthority === undefined) {
      depositorAuthority = beneficiary;
    }
    if (entity === undefined) {
      let m = await this.accounts.member(member);
      entity = m.entity;
    }
    let v = await this.vaultFor(depositor);
    if (vault === undefined) {
      vault = v.vaultAddress;
    }

    const tx = new Transaction();
    tx.add(
      new TransactionInstruction({
        keys: [
          // Whitelist relay interface.
          { pubkey: depositor, isWritable: true, isSigner: false },
          {
            pubkey: depositorAuthority.publicKey,
            isWritable: false,
            isSigner: true,
          },
          { pubkey: TOKEN_PROGRAM_ID, isWritable: false, isSigner: false },
          { pubkey: v.vault.owner, isWritable: true, isSigner: false },
          // Program specific.
          { pubkey: member, isWritable: true, isSigner: false },
          { pubkey: beneficiary.publicKey, isWritable: false, isSigner: true },
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

    let signers = [this.payer, depositorAuthority, beneficiary];
    let txSig = await sendAndConfirmTransaction(this.connection, tx, signers);

    return {
      tx: txSig,
    };
  }

  async stake(req: StakeRequest): Promise<StakeResponse> {
    let { member, beneficiary, entity, amount, stakeToken } = req;
    if (beneficiary === undefined) {
      beneficiary = this.payer;
    }
    if (entity === undefined) {
      let m = await this.accounts.member(member);
      entity = m.entity;
    }

    const tx = new Transaction();
    tx.add(
      new TransactionInstruction({
        keys: [
          { pubkey: member, isWritable: true, isSigner: false },
          { pubkey: beneficiary.publicKey, isWritable: false, isSigner: true },
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

    let signers = [this.payer, beneficiary];
    let txSig = await sendAndConfirmTransaction(this.connection, tx, signers);

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
      this.connection,
      this.payer,
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
    } = req;

    if (pendingWithdrawal === undefined) {
      pendingWithdrawal = new Account();
    }
    if (beneficiary === undefined) {
      beneficiary = this.payer;
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
        fromPubkey: this.payer.publicKey,
        newAccountPubkey: pendingWithdrawal.publicKey,
        lamports: await this.connection.getMinimumBalanceForRentExemption(
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
          { pubkey: beneficiary.publicKey, isWritable: false, isSigner: true },
          { pubkey: entity, isWritable: true, isSigner: false },
          { pubkey: this.registrar, isWritable: false, isSigner: false },
          { pubkey: vaultAuthority, isWritable: false, isSigner: false },
          { pubkey: TOKEN_PROGRAM_ID, isWritable: false, isSigner: false },
          { pubkey: SYSVAR_CLOCK_PUBKEY, isWritable: false, isSigner: false },
          { pubkey: SYSVAR_RENT_PUBKEY, isWritable: false, isSigner: false },
        ].concat(await this.executePoolAccounts(stakeToken)),
        programId: this.programId,
        data: instruction.encode({
          startStakeWithdrawal: {
            amount,
          },
        }),
      }),
    );

    let signers = [this.payer, beneficiary, pendingWithdrawal];
    let txSig = await sendAndConfirmTransaction(this.connection, tx, signers);

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
    if (beneficiary === undefined) {
      beneficiary = this.payer;
    }

    const tx = new Transaction();
    tx.add(
      new TransactionInstruction({
        keys: [
          { pubkey: pendingWithdrawal, isWritable: true, isSigner: false },
          { pubkey: member, isWritable: true, isSigner: false },
          { pubkey: beneficiary.publicKey, isWritable: false, isSigner: true },
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

    let signers = [this.payer, beneficiary];
    let txSig = await sendAndConfirmTransaction(this.connection, tx, signers);

    return {
      tx: txSig,
    };
  }

  async allocSpt(isMega: boolean, owner?: PublicKey): Promise<PublicKey> {
    if (owner === undefined) {
      owner = this.payer.publicKey;
    }
    let pool = isMega
      ? await this.accounts.megaPool(this.registrar)
      : await this.accounts.pool(this.registrar);
    let spt = await createTokenAccount(
      this.connection,
      this.payer,
      pool.poolTokenMint,
      owner,
    );

    return spt;
  }
}

class Accounts {
  constructor(readonly connection: Connection) {}

  async registrar(address: PublicKey): Promise<Registrar> {
    const accountInfo = await this.connection.getAccountInfo(address);
    if (accountInfo === null) {
      throw new Error(`Registrar does not exist ${address}`);
    }
    return accounts.registrar.decode(accountInfo.data);
  }

  async entity(address: PublicKey): Promise<Entity> {
    const accountInfo = await this.connection.getAccountInfo(address);
    if (accountInfo === null) {
      throw new Error(`Entity does not exist ${address}`);
    }
    return accounts.entity.decode(accountInfo.data);
  }

  async member(address: PublicKey): Promise<Member> {
    const accountInfo = await this.connection.getAccountInfo(address);
    if (accountInfo === null) {
      throw new Error(`Member does not exist ${address}`);
    }
    return accounts.member.decode(accountInfo.data);
  }

  async pendingWithdrawal(address: PublicKey): Promise<PendingWithdrawal> {
    const accountInfo = await this.connection.getAccountInfo(address);
    if (accountInfo === null) {
      throw new Error(`PendingWithdrawal does not exist ${address}`);
    }
    return accounts.pendingWithdrawal.decode(accountInfo.data);
  }

  async vault(registrarAddr: PublicKey): Promise<AccountInfo> {
    let r = await this.registrar(registrarAddr);
    return getTokenAccount(this.connection, r.vault);
  }

  async megaVault(registrarAddr: PublicKey): Promise<AccountInfo> {
    let r = await this.registrar(registrarAddr);
    return getTokenAccount(this.connection, r.megaVault);
  }

  async pool(registrar: PublicKey | Registrar): Promise<PoolState> {
    if (registrar instanceof PublicKey) {
      registrar = await this.registrar(registrar);
    }
    let acc = await this.connection.getAccountInfo(registrar.pool);
    if (acc === null) {
      throw new Error('Failed to find staking pool');
    }
    return decodePoolState(acc.data);
  }

  async poolVault(registrar: PublicKey | Registrar): Promise<AccountInfo> {
    const p = await this.pool(registrar);
    return getTokenAccount(this.connection, p.assets[0].vaultAddress);
  }

  async megaPoolVaults(
    registrar: PublicKey | Registrar,
  ): Promise<[AccountInfo, AccountInfo]> {
    const p = await this.pool(registrar);
    return Promise.all([
      getTokenAccount(this.connection, p.assets[0].vaultAddress),
      getTokenAccount(this.connection, p.assets[1].vaultAddress),
    ]);
  }

  async megaPool(registrar: PublicKey | Registrar): Promise<PoolState> {
    if (registrar instanceof PublicKey) {
      registrar = await this.registrar(registrar);
    }
    let acc = await this.connection.getAccountInfo(registrar.megaPool);
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
  watchtower?: PublicKey;
  watchtowerDst?: PublicKey;
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
  watchtower: Watchtower | null;
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

function maxBasketSize(): number {
  let b = {
    quantities: [new BN(0), new BN(0)],
  };
  const buffer = Buffer.alloc(1000);
  const len = Basket.encode(b, buffer);
  return len;
}

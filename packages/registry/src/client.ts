import { promisify } from 'util';
import { homedir } from 'os';
import { readFile } from 'fs';
import BN from 'bn.js';
import {
  TransactionSignature,
  Account,
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
  parseTokenAccount,
} from '@project-serum/common';
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
  registrar: PublicKey;
};

export default class Client {
  readonly connection: Connection;
  readonly payer: Account;
  readonly programId: PublicKey;
  readonly accounts: Accounts;
  readonly registrar: PublicKey;

  constructor(cfg: Config) {
    this.connection = cfg.connection;
    this.payer = cfg.payer;
    this.programId = cfg.programId;
    this.accounts = new Accounts(cfg.connection);
    this.registrar = cfg.registrar;
  }

  static async local(
    programId: PublicKey,
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
        ],
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

    let depositorAccInfo = await this.connection.getAccountInfo(depositor);
    if (depositorAccInfo === null) {
      throw new Error('Failed to find token account');
    }
    let depositorAcc = parseTokenAccount(depositorAccInfo.data);

    let r = await this.accounts.registrar(this.registrar);

    let vaultAcc = await this.accounts.vault(this.registrar);
    if (vaultAcc.mint == depositorAcc.mint) {
      vaultAddress = r.vault;
      vault = vaultAcc;
    }
    let megaVaultAcc = await this.accounts.megaVault(this.registrar);
    if (megaVaultAcc.mint == depositorAcc.mint) {
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
        ],
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
    // todo
    return {};
  }

  async startStakeWithdrawal(
    req: StartStakeWithdrawalRequest,
  ): Promise<StartStakeWithdrawalResponse> {
    // todo
    return {};
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
          { pubkey: SYSVAR_RENT_PUBKEY, isWritable: false, isSigner: false },
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
}

class Accounts {
  constructor(readonly connection: Connection) {}

  async registrar(address: PublicKey): Promise<Registrar> {
    const accountInfo = await this.connection.getAccountInfo(address);
    if (accountInfo == null) {
      throw new Error(`Registrar does not exist ${address}`);
    }
    return accounts.registrar.decode(accountInfo.data);
  }

  async entity(address: PublicKey): Promise<Entity> {
    const accountInfo = await this.connection.getAccountInfo(address);
    if (accountInfo == null) {
      throw new Error(`Entity does not exist ${address}`);
    }
    return accounts.entity.decode(accountInfo.data);
  }

  async member(address: PublicKey): Promise<Member> {
    const accountInfo = await this.connection.getAccountInfo(address);
    if (accountInfo == null) {
      throw new Error(`Member does not exist ${address}`);
    }
    return accounts.member.decode(accountInfo.data);
  }

  async pendingWithdrawal(address: PublicKey): Promise<PendingWithdrawal> {
    const accountInfo = await this.connection.getAccountInfo(address);
    if (accountInfo == null) {
      throw new Error(`PendingWithdrawal does not exist ${address}`);
    }
    return accounts.pendingWithdrawal.decode(accountInfo.data);
  }

  async vault(registrarAddr: PublicKey): Promise<AccountInfo> {
    let r = await this.registrar(registrarAddr);
    let depositorAccInfo = await this.connection.getAccountInfo(r.vault);
    if (depositorAccInfo === null) {
      throw new Error('Failed to find token account');
    }
    return parseTokenAccount(depositorAccInfo.data);
  }

  async megaVault(registrarAddr: PublicKey): Promise<AccountInfo> {
    let r = await this.registrar(registrarAddr);
    let depositorAccInfo = await this.connection.getAccountInfo(r.megaVault);
    if (depositorAccInfo === null) {
      throw new Error('Failed to find token account');
    }
    return parseTokenAccount(depositorAccInfo.data);
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
  // todo
};

type StakeResponse = {
  // todo
};

type StartStakeWithdrawalRequest = {
  // todo
};

type StartStakeWithdrawalResponse = {
  // todo
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

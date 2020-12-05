import BN from 'bn.js';
import * as bs58 from 'bs58';
import { PublicKey } from '@solana/web3.js';
import { AccountInfo as TokenAccount, MintInfo } from '@solana/spl-token';
import { TOKEN_PROGRAM_ID } from '@project-serum/serum/lib/token-instructions';
import {
  getTokenAccount,
  parseTokenAccount,
  getMintInfo,
  Provider,
  ProgramAccount,
  connection as cmnConnection,
} from '@project-serum/common';
import * as accounts from '../accounts';
import { Registrar } from '../accounts/registrar';
import { PendingWithdrawal } from '../accounts/pending-withdrawal';
import { Entity } from '../accounts/entity';
import { Member, MemberDeref } from '../accounts/member';
import { RewardEventQueue } from '../accounts/reward-event-q';
import { LockedRewardVendor } from '../accounts/locked-vendor';
import { UnlockedRewardVendor } from '../accounts/unlocked-vendor';
import * as metaEntity from '../meta-entity';
import EventEmitter from 'eventemitter3';

// TODO: handle susbcription state within client object.
let REWARD_Q_LISTENER = -1;

export default class Accounts {
  private accountSubscriptions: Map<string, number>;
  constructor(
    readonly provider: Provider,
    readonly registrarAddress: PublicKey,
    readonly programId: PublicKey,
    readonly metaEntityProgramId: PublicKey,
  ) {
    this.accountSubscriptions = new Map();
  }

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

  async balancesFor(
    member: PublicKey,
    balanceId: PublicKey,
  ): Promise<accounts.BalanceSandbox> {
    let m = await this.member(member);
    let b = m.balances.filter(b => b.owner.equals(balanceId)).pop();
    if (b === undefined) {
      throw new Error(`Invalid balance id: ${balanceId.toString()}`);
    }
    return b;
  }

  async depositVault(
    member: PublicKey,
    balanceId: PublicKey,
  ): Promise<TokenAccount> {
    const b = await this.balancesFor(member, balanceId);
    return getTokenAccount(this.provider, b.vault);
  }

  async depositMegaVault(
    member: PublicKey,
    balanceId: PublicKey,
  ): Promise<TokenAccount> {
    const b = await this.balancesFor(member, balanceId);
    return getTokenAccount(this.provider, b.vaultMega);
  }

  async pendingWithdrawalVault(
    member: PublicKey,
    balanceId: PublicKey,
  ): Promise<TokenAccount> {
    const b = await this.balancesFor(member, balanceId);
    return getTokenAccount(this.provider, b.vaultPendingWithdrawal);
  }

  async pendingWithdrawalMegaVault(
    member: PublicKey,
    balanceId: PublicKey,
  ): Promise<TokenAccount> {
    const b = await this.balancesFor(member, balanceId);
    return getTokenAccount(this.provider, b.vaultPendingWithdrawalMega);
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

  async megaPoolTokenMint(registrar?: Registrar): Promise<MintInfo> {
    if (registrar === undefined) {
      registrar = await this.registrar();
    }
    return await getMintInfo(this.provider, registrar.poolMintMega);
  }

  async poolVault(
    member: PublicKey,
    balanceId: PublicKey,
  ): Promise<TokenAccount> {
    const b = await this.balancesFor(member, balanceId);
    return getTokenAccount(this.provider, b.vaultStake);
  }

  async megaPoolVault(
    member: PublicKey,
    balanceId: PublicKey,
  ): Promise<TokenAccount> {
    const b = await this.balancesFor(member, balanceId);
    return getTokenAccount(this.provider, b.vaultStakeMega);
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

  async memberDeref(address: PublicKey): Promise<ProgramAccount<MemberDeref>> {
    const memberAccount = await this.member(address);

    // Main.
    const mainB = memberAccount.balances[0];
    const lockedB = memberAccount.balances[1];
    const [
      spt,
      sptMega,
      vault,
      vaultMega,
      vaultStake,
      vaultStakeMega,
      vaultPendingWithdrawal,
      vaultPendingWithdrawalMega,
      lockedSpt,
      lockedSptMega,
      lockedVault,
      lockedVaultMega,
      lockedVaultStake,
      lockedVaultStakeMega,
      lockedVaultPendingWithdrawal,
      lockedVaultPendingWithdrawalMega,
    ] = (
      await cmnConnection.getMultipleSolanaAccounts(this.provider.connection, [
        mainB.spt,
        mainB.sptMega,
        mainB.vault,
        mainB.vaultMega,
        mainB.vaultStake,
        mainB.vaultStakeMega,
        mainB.vaultPendingWithdrawal,
        mainB.vaultPendingWithdrawalMega,
        lockedB.spt,
        lockedB.sptMega,
        lockedB.vault,
        lockedB.vaultMega,
        lockedB.vaultStake,
        lockedB.vaultStakeMega,
        lockedB.vaultPendingWithdrawal,
        lockedB.vaultPendingWithdrawalMega,
      ])
    )
      // @ts-ignore
      .map(acc => parseTokenAccount(acc.account.data));

    const main = {
      owner: mainB.owner,
      spt,
      sptMega,
      vault,
      vaultMega,
      vaultStake,
      vaultStakeMega,
      vaultPendingWithdrawal,
      vaultPendingWithdrawalMega,
    };
    const locked = {
      owner: lockedB.owner,
      spt: lockedSpt,
      sptMega: lockedSptMega,
      vault: lockedVault,
      vaultMega: lockedVaultMega,
      vaultStake: lockedVaultStake,
      vaultStakeMega: lockedVaultStakeMega,
      vaultPendingWithdrawal: lockedVaultPendingWithdrawal,
      vaultPendingWithdrawalMega: lockedVaultPendingWithdrawalMega,
    };

    return {
      publicKey: address,
      account: {
        member: memberAccount,
        balances: [main, locked],
      },
    };
  }

  async memberConnect(
    address: PublicKey,
  ): Promise<[ProgramAccount<MemberDeref>, EventEmitter]> {
    if (this.accountSubscriptions.get(address.toString())) {
      throw new Error('already connected');
    }

    const memberDeref = await this.memberDeref(address);

    // Single event emitter to mux all the websocket connections.
    //
    // TODO: these connections are wasteful. Ideally we would have a single
    //       subscriptions with the account subscriptions multiplexed.
    //       Solana doesn't support this, however.

    const eeMux = new EventEmitter();

    const mMain = memberDeref.account.member.balances[0];
    const memberEE = this.accountConnect(address, accounts.member.decode);
    const spt = this.accountConnect(mMain.spt, parseTokenAccount);
    const sptMega = this.accountConnect(mMain.sptMega, parseTokenAccount);
    const vault = this.accountConnect(mMain.vault, parseTokenAccount);
    const vaultMega = this.accountConnect(mMain.vaultMega, parseTokenAccount);
    const vaultStake = this.accountConnect(mMain.vaultStake, parseTokenAccount);
    const vaultStakeMega = this.accountConnect(
      mMain.vaultStakeMega,
      parseTokenAccount,
    );
    const vaultPw = this.accountConnect(
      mMain.vaultPendingWithdrawal,
      parseTokenAccount,
    );
    const vaultPwMega = this.accountConnect(
      mMain.vaultPendingWithdrawalMega,
      parseTokenAccount,
    );

    const mLocked = memberDeref.account.member.balances[1];
    const lockedMember = this.accountConnect(address, accounts.member.decode);
    const lockedSpt = this.accountConnect(mLocked.spt, parseTokenAccount);
    const lockedSptMega = this.accountConnect(
      mLocked.sptMega,
      parseTokenAccount,
    );
    const lockedVault = this.accountConnect(mLocked.vault, parseTokenAccount);
    const lockedVaultMega = this.accountConnect(
      mLocked.vaultMega,
      parseTokenAccount,
    );
    const lockedVaultStake = this.accountConnect(
      mLocked.vaultStake,
      parseTokenAccount,
    );
    const lockedVaultStakeMega = this.accountConnect(
      mLocked.vaultStakeMega,
      parseTokenAccount,
    );
    const lockedVaultPw = this.accountConnect(
      mLocked.vaultPendingWithdrawal,
      parseTokenAccount,
    );
    const lockedVaultPwMega = this.accountConnect(
      mLocked.vaultPendingWithdrawalMega,
      parseTokenAccount,
    );

    // Main.
    memberEE.on('change', newMemberAccount => {
      memberDeref.account.member = newMemberAccount;
      eeMux.emit('change', memberDeref);
    });
    spt.on('change', t => {
      memberDeref.account.balances[0].spt = t;
      eeMux.emit('change', memberDeref);
    });
    sptMega.on('change', t => {
      memberDeref.account.balances[0].sptMega = t;
      eeMux.emit('change', memberDeref);
    });
    vault.on('change', t => {
      memberDeref.account.balances[0].vault = t;
      eeMux.emit('change', memberDeref);
    });
    vaultMega.on('change', t => {
      memberDeref.account.balances[0].vaultMega = t;
      eeMux.emit('change', memberDeref);
    });
    vaultStake.on('change', t => {
      memberDeref.account.balances[0].vaultStake = t;
      eeMux.emit('change', memberDeref);
    });
    vaultStakeMega.on('change', t => {
      memberDeref.account.balances[0].vaultStakeMega = t;
      eeMux.emit('change', memberDeref);
    });
    vaultPw.on('change', t => {
      memberDeref.account.balances[0].vaultPendingWithdrawal = t;
    });
    vaultPwMega.on('change', t => {
      memberDeref.account.balances[0].vaultPendingWithdrawalMega = t;
    });

    // Locked.
    lockedMember.on('change', newMemberAccount => {
      memberDeref.account.member = newMemberAccount;
      eeMux.emit('change', memberDeref);
    });
    lockedSpt.on('change', t => {
      memberDeref.account.balances[1].spt = t;
      eeMux.emit('change', memberDeref);
    });
    lockedSptMega.on('change', t => {
      memberDeref.account.balances[1].sptMega = t;
      eeMux.emit('change', memberDeref);
    });
    lockedVault.on('change', t => {
      memberDeref.account.balances[1].vault = t;
      eeMux.emit('change', memberDeref);
    });
    lockedVaultMega.on('change', t => {
      memberDeref.account.balances[1].vaultMega = t;
      eeMux.emit('change', memberDeref);
    });
    lockedVaultStake.on('change', t => {
      memberDeref.account.balances[1].vaultStake = t;
      eeMux.emit('change', memberDeref);
    });
    lockedVaultStakeMega.on('change', t => {
      memberDeref.account.balances[1].vaultStakeMega = t;
      eeMux.emit('change', memberDeref);
    });
    lockedVaultPw.on('change', t => {
      memberDeref.account.balances[1].vaultPendingWithdrawal = t;
    });
    lockedVaultPwMega.on('change', t => {
      memberDeref.account.balances[1].vaultPendingWithdrawalMega = t;
    });

    return [memberDeref, eeMux];
  }

  // TODO: disconnect all subscriptions associated with the member.
  memberDisconnect(address: PublicKey) {
    this.accountDisconnect(address);
  }

  accountConnect(address: PublicKey, decoder: Function): EventEmitter {
    const ee = new EventEmitter();

    const sub = this.provider.connection.onAccountChange(
      address,
      acc => ee.emit('change', decoder(acc.data)),
      'recent',
    );

    this.accountSubscriptions.set(address.toString(), sub);

    return ee;
  }

  accountDisconnect(address: PublicKey) {
    const sub = this.accountSubscriptions.get(address.toString());
    if (sub) {
      this.provider.connection.removeAccountChangeListener(sub);
    }
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

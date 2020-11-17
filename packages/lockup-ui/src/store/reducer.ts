import { AccountInfo as TokenAccount, MintInfo } from '@solana/spl-token';
import * as lockup from '@project-serum/lockup';
import * as registry from '@project-serum/registry';
import { PoolState } from '@project-serum/pool';
import {
  ProgramAccount as CommonProgramAccount,
  networks,
  Network,
} from '@project-serum/common';
import { Action, ActionType } from './actions';

export enum BootstrapState {
  NeedsBootstrap,
  IsBootstrapping,
  Bootstrapped,
}

export default function reducer(
  state: State = initialState,
  action: Action,
): State {
  let newState = {
    common: { ...state.common },
    lockup: { ...state.lockup },
    registry: { ...state.registry },
  };
  switch (action.type) {
    // Common.
    case ActionType.CommonAppWillBootstrap:
      newState.common.bootstrapState = BootstrapState.IsBootstrapping;
      newState.common.bootstrapTrigger = false;
      return newState;
    case ActionType.CommonAppDidBootstrap:
      newState.common.bootstrapState = BootstrapState.Bootstrapped;
      return newState;
    case ActionType.CommonWalletSetProvider:
      newState.common.walletProvider = action.item.walletProvider;
      return newState;
    case ActionType.CommonWalletDidConnect:
      newState.common.isWalletConnected = true;
      return newState;
    case ActionType.CommonWalletDidDisconnect:
      newState.common.isWalletConnected = false;
      return newState;
    case ActionType.CommonSetNetwork:
      if (newState.common.network.label !== action.item.network.label) {
        newState.common.network = action.item.network;
        newState.common.bootstrapState = BootstrapState.NeedsBootstrap;
        newState.common.shutdownTrigger = true;
      }
      return newState;
    case ActionType.CommonTriggerBootstrap:
      newState.common.bootstrapState = BootstrapState.NeedsBootstrap;
      newState.common.bootstrapTrigger = true;
      return newState;
    case ActionType.CommonTriggerShutdown:
      newState.common.bootstrapState = BootstrapState.NeedsBootstrap;
      newState.common.shutdownTrigger = true;
      return newState;
    case ActionType.CommonDidShutdown:
      // Reset everything except network.
      let s = {
        ...initialState,
      };
      s.common.network = newState.common.network;
      return s;
    case ActionType.CommonOwnedTokenAccountsSet:
      newState.common.ownedTokenAccounts = action.item.ownedTokenAccounts;
      return newState;

    // Lockup.
    case ActionType.LockupSetVestings:
      newState.lockup.vestings = action.item.vestingAccounts;
      return newState;
    case ActionType.LockupCreateVesting:
      newState.lockup.vestings.unshift(action.item.vesting);
      return newState;
    case ActionType.LockupSetSafe:
      newState.lockup.safe = action.item.safe;
      return newState;

    // Registry.
    case ActionType.RegistryCreateEntity:
      newState.registry.entities.unshift(action.item.entity);
      return newState;
    case ActionType.RegistrySetEntities:
      newState.registry.entities = action.item.entities;
      return newState;
    case ActionType.RegistryUpdateEntity:
      newState.registry.entities = newState.registry.entities.map(e => {
        if (
          e.publicKey.toString() === action.item.entity.publicKey.toString()
        ) {
          e = action.item.entity;
        }
        return { ...e };
      });
      return newState;
    case ActionType.RegistrySetMember:
      newState.registry.member = action.item.member;
      return newState;
    case ActionType.RegistrySetPools:
      newState.registry.pool = action.item.pool;
      newState.registry.poolTokenMint = action.item.poolTokenMint;
      newState.registry.poolVault = action.item.poolVault;
      newState.registry.megaPool = action.item.megaPool;
      newState.registry.megaPoolTokenMint = action.item.megaPoolTokenMint;
      newState.registry.megaPoolVaults = action.item.megaPoolVaults;
      return newState;
    case ActionType.RegistrySetRegistrar:
      newState.registry.registrar = action.item.registrar;
      return newState;
    case ActionType.RegistrySetPendingWithdrawals:
      newState.registry.pendingWithdrawals = new Map(
        newState.registry.pendingWithdrawals,
      ).set(
        action.item.memberPublicKey.toString(),
        action.item.pendingWithdrawals,
      );
      return newState;
    case ActionType.RegistryCreatePendingWithdrawal:
      const oldPw = newState.registry.pendingWithdrawals;
      const memberWithdrawals = oldPw.has(
        action.item.memberPublicKey.toString(),
      )
        ? [
            ...(oldPw.get(
              action.item.memberPublicKey.toString(),
            ) as ProgramAccount<registry.accounts.PendingWithdrawal>[]),
          ]
        : [];
      memberWithdrawals.unshift(action.item.pendingWithdrawal);
      newState.registry.pendingWithdrawals = new Map(oldPw).set(
        action.item.memberPublicKey.toString(),
        memberWithdrawals,
      );
      return newState;
    case ActionType.RegistryUpdatePendingWithdrawal:
      const allPendingWithdrawals = new Map(
        newState.registry.pendingWithdrawals,
      );
      const memberPendingWithdrawals = allPendingWithdrawals
        .get(action.item.memberPublicKey.toString())!
        .map(pw => {
          if (
            pw.publicKey.toString() ===
            action.item.pendingWithdrawal.publicKey.toString()
          ) {
            return action.item.pendingWithdrawal;
          }
          return pw;
        });

      newState.registry.pendingWithdrawals.set(
        action.item.memberPublicKey.toString(),
        memberPendingWithdrawals,
      );
      return newState;
    case ActionType.RegistrySetMetadata:
      const entityMetadata = new Map();
      action.item.entityMetadata.forEach(
        (
          emd: ProgramAccount<registry.metaEntity.accounts.metadata.Metadata>,
        ) => {
          entityMetadata.set(emd.account.entity.toString(), emd);
        },
      );
      newState.registry.entityMetadata = entityMetadata;
      return newState;
    case ActionType.RegistryCreateMetadata:
      const emd = new Map(newState.registry.entityMetadata);
      emd.set(action.item.entityPublicKey.toString(), action.item.metadata);
      newState.registry.entityMetadata = emd;
      return newState;
    case ActionType.RegistrySetRewardEventQueue:
      newState.registry.rewardEventQueue = action.item.rewardEventQueue;
      return newState;
    case ActionType.RegistryCreateRewardVendor:
      const vendors = new Map(newState.registry.vendors);
      vendors.set(action.item.vendor.publicKey.toString(), action.item.vendor);
      newState.registry.vendors = vendors;
      return newState;
    // Misc.
    default:
      return newState;
  }
}

export type State = {
  common: CommonState;
  lockup: LockupState;
  registry: RegistryState;
};

export type CommonState = {
  walletProvider?: string;
  isWalletConnected: boolean;
  bootstrapTrigger: boolean;
  bootstrapState: BootstrapState;
  shutdownTrigger: boolean;
  network: Network;
  ownedTokenAccounts: ProgramAccount<TokenAccount>[];
};

export type LockupState = {
  safe?: ProgramAccount<lockup.accounts.Safe>;
  vestings: ProgramAccount<lockup.accounts.Vesting>[];
};

export type RegistryState = {
  entities: ProgramAccount<registry.accounts.Entity>[];
  entityMetadata: Map<
    string,
    ProgramAccount<registry.metaEntity.accounts.metadata.Metadata>
  >;
  member?: ProgramAccount<registry.accounts.Member>;
  pool?: ProgramAccount<PoolState>;
  poolTokenMint?: ProgramAccount<MintInfo>;
  poolVault?: ProgramAccount<TokenAccount>;
  megaPool?: ProgramAccount<PoolState>;
  megaPoolTokenMint?: ProgramAccount<MintInfo>;
  megaPoolVaults?: ProgramAccount<TokenAccount>[];
  registrar?: ProgramAccount<registry.accounts.Registrar>;
  pendingWithdrawals: Map<
    string,
    Array<ProgramAccount<registry.accounts.PendingWithdrawal>>
  >;
  rewardEventQueue?: ProgramAccount<registry.accounts.RewardEventQueue>;
  vendors: Map<
    string,
    ProgramAccount<
      | registry.accounts.LockedRewardVendor
      | registry.accounts.UnlockedRewardVendor
    >
  >;
};

export const initialState: State = {
  common: {
    bootstrapTrigger: false,
    shutdownTrigger: false,
    isWalletConnected: false,
    walletProvider: 'https://www.sollet.io',
    bootstrapState: BootstrapState.NeedsBootstrap,
    network: networks.devnet,
    ownedTokenAccounts: [],
  },
  lockup: {
    vestings: [],
  },
  registry: {
    entities: [],
    entityMetadata: new Map(),
    pendingWithdrawals: new Map(),
    vendors: new Map(),
  },
};

// Re-export.
export type ProgramAccount<T> = CommonProgramAccount<T>;

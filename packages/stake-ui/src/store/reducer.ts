import { PublicKey } from '@solana/web3.js';
import { AccountInfo as TokenAccount } from '@solana/spl-token';
import { ProgramAccount as CommonProgramAccount } from '@project-serum/common';
import { Action, ActionType } from './actions';
import { networks, Network } from './config';

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
    accounts: { ...state.accounts },
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
        const network = networks[action.item.networkKey];
        newState.registry.registrar = Object.values(network.registrars)[0];
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
    case ActionType.LockupUpdateVesting:
      newState.accounts[action.item.vesting.publicKey.toString()] =
        action.item.vesting.account;
      return newState;
    case ActionType.LockupCreateVesting:
      newState.lockup.vestings.unshift(action.item.vesting.publicKey);
      newState.accounts[action.item.vesting.publicKey.toString()] =
        action.item.vesting.account;
      return newState;

    // Registry.
    case ActionType.RegistrySetMember:
      // This should only be called on member creation. All other member
      // member switches should route through `RegistrySetMember`.
      newState.registry.member = action.item.member;
      return newState;
    case ActionType.RegistrySetRegistrar:
      newState.registry.registrar = action.item.registrar;
      newState.registry.member = action.item.member;
      newState.registry.pendingWithdrawals = null;
      return newState;
    case ActionType.RegistrySetPendingWithdrawals:
      action.item.pendingWithdrawals.forEach((pw: any) => {
        newState.accounts[pw.publicKey.toString()] = pw.account;
      });
      newState.registry.pendingWithdrawals = action.item.pendingWithdrawals.map(
        (pw: any) => pw.publicKey,
      );
      return newState;
    case ActionType.RegistryCreatePendingWithdrawal:
      newState.accounts[action.item.pendingWithdrawal.publicKey.toString()] =
        action.item.pendingWithdrawal.account;
      if (newState.registry.pendingWithdrawals === null) {
        newState.registry.pendingWithdrawals = [];
      }
      newState.registry.pendingWithdrawals.unshift(
        action.item.pendingWithdrawal.publicKey,
      );
      return newState;
    case ActionType.RegistryUpdatePendingWithdrawal:
      newState.accounts[action.item.pendingWithdrawal.publicKey.toString()] =
        action.item.pendingWithdrawal.account;
      return newState;
    case ActionType.AccountAdd:
      newState.accounts[action.item.account.publicKey.toString()] =
        action.item.account.account;
      return newState;
    case ActionType.AccountUpdate:
      newState.accounts[action.item.account.publicKey.toString()] =
        action.item.account.account;
      return newState;
    default:
      return newState;
  }
}

export type State = {
  common: CommonState;
  lockup: LockupState;
  registry: RegistryState;
  accounts: { [pubkey: string]: any };
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
  vestings: PublicKey[];
};

// All state associated with a single instance of a staking registrar.
export type RegistryState = {
  registrar: PublicKey;
  member?: PublicKey;
  pendingWithdrawals: PublicKey[] | null;
};

export const initialState: State = {
  common: {
    bootstrapTrigger: false,
    shutdownTrigger: false,
    isWalletConnected: false,
    walletProvider: 'https://www.sollet.io',
    bootstrapState: BootstrapState.NeedsBootstrap,
    //network: networks.localhost,
    network: networks.devnet,
    ownedTokenAccounts: [],
  },
  lockup: {
    vestings: [],
  },
  registry: {
    pendingWithdrawals: null,
    registrar: networks.devnet.registrars.token1,
    //registrar: networks.localhost.registrars.token1,
  },
  accounts: {},
};

export type AsyncData<T> = {
  isReady: boolean;
  data?: T;
};

// Re-export.
export type ProgramAccount<T = any> = CommonProgramAccount<T>;

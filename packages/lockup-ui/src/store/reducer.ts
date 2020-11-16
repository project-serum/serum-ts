import { Action, ActionType } from './actions';
import { PublicKey } from '@solana/web3.js';
import { AccountInfo as TokenAccount } from '@solana/spl-token';
import { accounts } from '@project-serum/lockup';

export default function reducer(
  state: State = initialState,
  action: Action,
): State {
  const newState = { ...state };
  switch (action.type) {
    case ActionType.WalletSetProvider:
      newState.walletProvider = action.item.walletProvider;
      return newState;
    case ActionType.WalletIsConnected:
      newState.walletIsConnected = action.item.walletIsConnected;
      return newState;
    case ActionType.NetworkSetUrl:
      newState.networkUrl = action.item.networkUrl;
      return newState;
    case ActionType.OwnedTokenAccountsSet:
      newState.ownedTokenAccounts = action.item.ownedTokenAccounts;
      return newState;
    case ActionType.VestingAccountsSet:
      newState.vestingAccounts = action.item.vestingAccounts;
      return newState;
    default:
      return newState;
  }
}

export type State = {
  walletProvider?: string;
  walletIsConnected: boolean;
  networkUrl?: string;
  ownedTokenAccounts: OwnedTokenAccount[];
  vestingAccounts: VestingAccount[];
};

export const initialState: State = {
  walletProvider: 'https://www.sollet.io',
  walletIsConnected: false,
  networkUrl: 'https://devnet.solana.com',
  ownedTokenAccounts: [],
  vestingAccounts: [],
};

export type VestingAccount = {
  publicKey: PublicKey;
  vesting: accounts.vesting.Vesting;
};

type OwnedTokenAccount = {
  publicKey: PublicKey;
  accountInfo: AccountInfo;
};

type AccountInfo = {
  executable: boolean;
  owner: PublicKey;
  lamport: any;
  tokenAccount: TokenAccount;
};

import { Action, ActionType } from './actions';

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
    default:
      return newState;
  }
}

export type State = {
  walletProvider?: string;
  walletIsConnected: boolean;
  networkUrl?: string;
};

export const initialState: State = {
  walletProvider: 'https://www.sollet.io',
  walletIsConnected: false,
  networkUrl: 'https://devnet.solana.com',
};

export type Action = {
  type: ActionType;
  item: any;
};

export enum ActionType {
  WalletSetProvider,
  WalletIsConnected,
  NetworkSetUrl,
  OwnedTokenAccountsSet,
  VestingAccountsSet,
  ClearStore,
}

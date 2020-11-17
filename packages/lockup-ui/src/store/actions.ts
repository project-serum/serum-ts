export type Action = {
  type: ActionType;
  item: any;
};

export enum ActionType {
  // Common.
  CommonTriggerBootstrap,
  CommonAppWillBootstrap,
  CommonAppDidBootstrap,
  CommonTriggerShutdown,
  CommonDidShutdown,
  CommonWalletDidConnect,
  CommonWalletDidDisconnect,
  CommonWalletSetProvider,
  CommonSetNetwork,
  CommonOwnedTokenAccountsSet,
  CommonWalletReset,

  // Lockup.
  LockupSetSafe,
  LockupSetVestings,
  LockupCreateVesting,

  // Registry.
  RegistryCreateEntity,
  RegistrySetEntities,
  RegistryUpdateEntity,
  RegistrySetMember,
  RegistrySetMetadata,
  RegistrySetRewardEventQueue,
  RegistryCreateMetadata,
  RegistrySetPools,
  RegistrySetRegistrar,
  RegistrySetPendingWithdrawals,
  RegistryCreatePendingWithdrawal,
  RegistryUpdatePendingWithdrawal,
  RegistryCreateRewardVendor,
}

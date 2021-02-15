import React, {
  PropsWithChildren,
  ReactNode,
  useEffect,
  useCallback,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSnackbar } from 'notistack';
import { PublicKey } from '@solana/web3.js';
import {
  token,
  parseMintAccount,
  parseTokenAccount,
} from '@project-serum/common';
import * as anchor from '@project-serum/anchor';
import { State as StoreState, ProgramAccount } from '../../store/reducer';
import { ActionType } from '../../store/actions';
import { useWallet } from './WalletProvider';
import { memberSeed } from '../../utils/registry';

// BootstrapProvider performs data fetching on application startup.
export default function BootstrapProvider(props: PropsWithChildren<ReactNode>) {
  const { bootstrapTrigger, shutdownTrigger, network, registrar } = useSelector(
    (state: StoreState) => {
      return {
        bootstrapTrigger: state.common.bootstrapTrigger,
        shutdownTrigger: state.common.shutdownTrigger,
        network: state.common.network,
        registrar: state.registry.registrar,
      };
    },
  );
  const dispatch = useDispatch();
  const { wallet, lockupClient, registryClient } = useWallet();
  const { enqueueSnackbar } = useSnackbar();

  // Entry point for bootstrapping all the data for the app.
  const bootstrap = useCallback(async () => {
    enqueueSnackbar(`Connecting to ${network.label}`, {
      variant: 'info',
      autoHideDuration: 2500,
    });

    dispatch({
      type: ActionType.CommonAppWillBootstrap,
      item: {},
    });

    let { registrars, members } = await refreshAccounts({
      dispatch,
      lockupClient,
      registryClient,
      network,
      wallet,
    });

    // Temporary account store for the initial registrar switch.
    const accountStore = Object.fromEntries(
      new Map(registrars.map(r => [r.publicKey.toString(), r.account])),
    );
    members.forEach(m => {
      accountStore[m.publicKey.toString()] = m.account;
    });

    await registrarSwitch(
      registryClient,
      accountStore,
      dispatch,
      registrar,
      undefined,
    );

    dispatch({
      type: ActionType.CommonAppDidBootstrap,
      item: {},
    });

    enqueueSnackbar(`Connection established`, {
      variant: 'success',
      autoHideDuration: 2500,
    });
  }, [
    dispatch,
    enqueueSnackbar,
    registryClient,
    registrar,
    lockupClient,
    network,
    wallet,
  ]);

  const shutdown = useCallback(async () => {
    wallet.disconnect();
    dispatch({
      type: ActionType.CommonDidShutdown,
      item: {},
    });
  }, [dispatch, wallet]);

  useEffect(() => {
    if (bootstrapTrigger) {
      bootstrap().catch(err => {
        console.error(err);
        enqueueSnackbar(`Error bootstrapping application: ${err.toString()}`, {
          variant: 'error',
        });
      });
    }
    if (shutdownTrigger) {
      shutdown().catch(err => {
        console.error(err);
        enqueueSnackbar(`Error shutting down application: ${err.toString()}`, {
          variant: 'error',
        });
      });
    }
  }, [bootstrapTrigger, bootstrap, shutdownTrigger, shutdown, enqueueSnackbar]);

  return <>{props.children}</>;
}

// Fetches and populates the redux store with all accounts needed for the app to start.
export async function refreshAccounts({
  dispatch,
  lockupClient,
  registryClient,
  network,
  wallet,
}: any) {
  // Fetch all staking instances.
  const fetchRegistrars = async (): Promise<ProgramAccount[]> => {
    const registrarAddresses: PublicKey[] = Object.values(network.registrars);

    // All registrars.
    const registrars: ProgramAccount[] = (
      await anchor.utils.getMultipleAccounts(
        registryClient.provider.connection,
        registrarAddresses,
      )
    ).map(raw => {
      const account = registryClient.coder.accounts.decode(
        'Registrar',
        raw!.account.data,
      );
      return {
        publicKey: raw!.publicKey,
        account,
      };
    });

    // Mint for each registrar.
    const mints: ProgramAccount[] = (
      await anchor.utils.getMultipleAccounts(
        registryClient.provider.connection,
        registrars.map(r => r.account.mint),
      )
    ).map(raw => {
      const account = parseMintAccount(raw!.account.data);
      return {
        publicKey: raw!.publicKey,
        account,
      };
    });

    // Reward queues for each registrar.
    const rewardQs = (
      await anchor.utils.getMultipleAccounts(
        registryClient.provider.connection,
        registrars.map(r => r.account.rewardEventQ),
      )
    ).map(raw => {
      const account = registryClient.coder.accounts.decode(
        'RewardQueue',
        raw!.account.data,
      );
      return {
        publicKey: raw!.publicKey,
        account,
      };
    });

    // Add all the accounts to the store.
    registrars
      .concat(mints)
      .concat(rewardQs)
      .forEach(r => {
        dispatch({
          type: ActionType.AccountAdd,
          item: {
            account: r,
          },
        });
      });
    return registrars;
  };

  // Fetch the stake accounts for each staking instance (for the connected wallet).
  const fetchMembers = async (
    registrars: ProgramAccount[],
  ): Promise<ProgramAccount[]> => {
    const members = await Promise.all(
      registrars
        .map((r: ProgramAccount) => r.publicKey)
        .map((r: PublicKey) =>
          memberSeed(r)
            .then(seed =>
              PublicKey.createWithSeed(
                wallet.publicKey,
                seed,
                registryClient.programId,
              ),
            )
            .then(member => {
              return {
                memberPublicKey: member,
                registrar: r,
              };
            }),
        ),
    );
    const memberAddresses: PublicKey[] = members.map(m => m.memberPublicKey);
    const memberAccounts: ProgramAccount[] = (
      await anchor.utils.getMultipleAccounts(
        registryClient.provider.connection,
        memberAddresses,
      )
    )
      .filter(raw => raw !== null)
      .map((raw: any) => {
        const account = registryClient.coder.accounts.decode(
          'Member',
          raw!.account.data,
        );
        return {
          publicKey: raw!.publicKey,
          account,
        };
      });

    // Get all accounts for all of our member accounts.
    //
    // Note: As the number of registrars grows, we'll probably want to move
    //       this fetch to be an on demand query, rather than on application
    //       bootstrap.
    await Promise.all(
      memberAccounts.map(memberAccount => {
        return fetchAndDispatchMemberAccounts(
          memberAccount,
          dispatch,
          registryClient.provider.connection,
        );
      }),
    );

    // Add all the member accounts to the store. Must be done *after* the
    // active member's vaults.
    memberAccounts.forEach(m => {
      dispatch({
        type: ActionType.AccountAdd,
        item: {
          account: m,
        },
      });
    });

    return memberAccounts;
  };

  // All mints for each staking instance (pool token and the token being staked).
  const fetchMints = async (registrars: ProgramAccount[]) => {
    const mintAddresses = registrars
      .map(r => r.account.mint)
      .concat(registrars.map(r => r.account.poolMint));
    const mints = (
      await anchor.utils.getMultipleAccounts(
        registryClient.provider.connection,
        mintAddresses,
      )
    ).map(raw => {
      const account = parseMintAccount(raw!.account.data);
      return {
        publicKey: raw!.publicKey,
        account,
      };
    });
    mints.forEach(m => {
      dispatch({
        type: ActionType.AccountAdd,
        item: {
          account: m,
        },
      });
    });
  };

  // All token accounts owned by the current user.
  const fetchOwnedTokenAccounts = async () => {
    const ownedTokenAccounts = await token.getOwnedTokenAccounts(
      lockupClient.provider.connection,
      wallet.publicKey,
    );
    dispatch({
      type: ActionType.CommonOwnedTokenAccountsSet,
      item: {
        ownedTokenAccounts,
      },
    });
  };

  // All vesting accounts owned by the current user.
  const fetchVestingAccounts = async () => {
    const vestingAccounts = await lockupClient.account.vesting.all(
      wallet.publicKey.toBuffer(),
    );
    vestingAccounts.forEach((account: any) => {
      dispatch({
        type: ActionType.AccountAdd,
        item: {
          account,
        },
      });
    });
    dispatch({
      type: ActionType.LockupSetVestings,
      item: {
        vestingAccounts: vestingAccounts.map(
          (v: ProgramAccount) => v.publicKey,
        ),
      },
    });
  };

  const registrars = await fetchRegistrars();
  const members = await fetchMembers(registrars);
  await fetchMints(registrars);
  await fetchOwnedTokenAccounts();
  await fetchVestingAccounts();

  return { registrars, members };
}

export async function registrarSwitch(
  registryClient: any,
  accounts: any,
  dispatch: any,
  newRegistrar: PublicKey,
  oldRegistrar?: PublicKey,
) {
  const oldMember = await (async (): Promise<ProgramAccount | undefined> => {
    if (oldRegistrar === undefined) {
      return undefined;
    }
    const oldMember = await PublicKey.createWithSeed(
      registryClient.provider.wallet.publicKey,
      await memberSeed(oldRegistrar),
      registryClient.programId,
    );
    const oldMemberAccount = accounts[oldMember.toString()];
    return oldMemberAccount !== undefined
      ? {
          publicKey: oldMember,
          account: oldMemberAccount,
        }
      : undefined;
  })();

  const newMember = await (async (): Promise<ProgramAccount | undefined> => {
    const newMember = await PublicKey.createWithSeed(
      registryClient.provider.wallet.publicKey,
      await memberSeed(newRegistrar),
      registryClient.programId,
    );
    const newMemberAccount = accounts[newMember.toString()];
    return newMemberAccount
      ? {
          publicKey: newMember,
          account: newMemberAccount,
        }
      : undefined;
  })();

  await subscribeRegistrar(
    registryClient,
    accounts,
    dispatch,
    newRegistrar,
    oldRegistrar,
  );
  if (newMember) {
    unsubscribeMember(registryClient, oldMember);
    subscribeMember(newMember, registryClient, dispatch);
  }

  // Perform the UI update.
  dispatch({
    type: ActionType.RegistrySetRegistrar,
    item: {
      registrar: newRegistrar,
      member: newMember ? newMember.publicKey : undefined,
    },
  });
}

export async function subscribeRegistrar(
  registryClient: any,
  accounts: any,
  dispatch: any,
  newRegistrar: PublicKey,
  oldRegistrar?: PublicKey,
) {
  if (oldRegistrar) {
    const oldRegistrarAccount = accounts[oldRegistrar.toString()];
    registryClient.account.rewardQueue.unsubscribe(
      oldRegistrarAccount.rewardEventQ,
    );
    // TODO: unsubscribe from the staking pool subscription.
  }

  const newRegistrarAccount = accounts[newRegistrar.toString()];

  // Reward event queue sub.
  const conn = registryClient.account.rewardQueue.subscribe(
    newRegistrarAccount.rewardEventQ,
  );
  conn.on('change', (account: any) => {
    dispatch({
      type: ActionType.AccountUpdate,
      item: {
        account: {
          publicKey: newRegistrarAccount.rewardEventQ,
          account,
        },
      },
    });
  });

  // Staking pool token sub.
  // TODO: track these connections somewhere more organized.
  registryClient.provider.connection.onAccountChange(
    newRegistrarAccount.poolMint,
    (acc: any) => {
      const poolMint = parseMintAccount(acc.data);
      dispatch({
        type: ActionType.AccountUpdate,
        item: {
          account: {
            publicKey: newRegistrarAccount.poolMint,
            account: poolMint,
          },
        },
      });
    },
    'recent',
  );
}

export function subscribeMember(
  newMember: ProgramAccount,
  registryClient: any,
  dispatch: any,
) {
  // Subscribe to all member account updates.
  registryClient.account.member
    .subscribe(newMember.publicKey)
    .on('change', (account: any) => {
      dispatch({
        type: ActionType.AccountUpdate,
        item: {
          account: {
            publicKey: newMember.publicKey,
            account,
          },
        },
      });
    });

  // Subscription function, updating the redux store on every change
  // to a token account.
  //
  // TODO: should track these subscriptions for unsubscribing on demand.
  const createVaultSubscription = (address: PublicKey) => {
    registryClient.provider.connection.onAccountChange(
      address,
      (acc: any) => {
        const tokenAccount = parseTokenAccount(acc.data);
        dispatch({
          type: ActionType.AccountUpdate,
          item: {
            account: {
              publicKey: address,
              account: tokenAccount,
            },
          },
        });
      },
      'recent',
    );
  };

  // Subscribe to all the member's token vaults.
  createVaultSubscription(newMember.account.balances.vault);
  createVaultSubscription(newMember.account.balances.vaultStake);
  createVaultSubscription(newMember.account.balances.vaultPw);
  createVaultSubscription(newMember.account.balances.spt);
  createVaultSubscription(newMember.account.balancesLocked.vault);
  createVaultSubscription(newMember.account.balancesLocked.vaultStake);
  createVaultSubscription(newMember.account.balancesLocked.vaultPw);
  createVaultSubscription(newMember.account.balancesLocked.spt);
}

function unsubscribeMember(registryClient: any, newMember?: ProgramAccount) {
  // todo
}

// Fetches all accounts for a member account and populates the store with them.
export async function fetchAndDispatchMemberAccounts(
  memberAccount: ProgramAccount,
  dispatch: any,
  connection: any,
) {
  let accounts = (
    await anchor.utils.getMultipleAccounts(connection, [
      memberAccount.account.balances.vault,
      memberAccount.account.balances.vaultStake,
      memberAccount.account.balances.vaultPw,
      memberAccount.account.balances.spt,
      memberAccount.account.balancesLocked.vault,
      memberAccount.account.balancesLocked.vaultStake,
      memberAccount.account.balancesLocked.vaultPw,
      memberAccount.account.balancesLocked.spt,
    ])
  )
    .filter(raw => raw !== null)
    .map((raw: any) => {
      return {
        publicKey: raw.publicKey,
        account: parseTokenAccount(raw.account.data),
      };
    });
  accounts.forEach(account => {
    dispatch({
      type: ActionType.AccountAdd,
      item: {
        account,
      },
    });
  });
}

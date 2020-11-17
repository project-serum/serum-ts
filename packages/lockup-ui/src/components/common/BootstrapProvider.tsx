import React, {
  PropsWithChildren,
  ReactNode,
  useEffect,
  useCallback,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSnackbar } from 'notistack';
import { sleep, token, ProgramAccount } from '@project-serum/common';
import * as registry from '@project-serum/registry';
import { State as StoreState } from '../../store/reducer';
import { ActionType } from '../../store/actions';
import { useWallet } from './WalletProvider';

// BootstrapProvider performs data fetching on application startup.
export default function BootstrapProvider(props: PropsWithChildren<ReactNode>) {
  const { bootstrapTrigger, shutdownTrigger, network } = useSelector(
    (state: StoreState) => {
      return {
        bootstrapTrigger: state.common.bootstrapTrigger,
        shutdownTrigger: state.common.shutdownTrigger,
        network: state.common.network,
      };
    },
  );
  const dispatch = useDispatch();
  const { wallet, lockupClient, registryClient } = useWallet();
  const { enqueueSnackbar } = useSnackbar();

  // Entry point for bootstrapping all the data for the app.
  const bootstrap = useCallback(async () => {
    // Websocket subscriptions.
    const startSubscriptions = () => {
      // Reward event queue subscription.
      const conn = registryClient.accounts.rewardEventQueueConnect(
        registryClient.rewardEventQueue,
      );
      conn.on(
        'connected',
        (
          rewardEventQueue: ProgramAccount<registry.accounts.RewardEventQueue>,
        ) => {
          dispatch({
            type: ActionType.RegistrySetRewardEventQueue,
            item: {
              rewardEventQueue,
            },
          });
        },
      );
      conn.on(
        'change',
        (
          rewardEventQueue: ProgramAccount<registry.accounts.RewardEventQueue>,
        ) => {
          dispatch({
            type: ActionType.RegistrySetRewardEventQueue,
            item: {
              rewardEventQueue,
            },
          });
        },
      );
    };
    const fetchEntityAccounts = async () => {
      const entityAccounts = await registryClient.accounts.allEntities();
      dispatch({
        type: ActionType.RegistrySetEntities,
        item: {
          entities: entityAccounts,
        },
      });
      // TODO: fetching all the metadata like this is dumb as shit. Need to either
      //       create an offchain index for the join, lazily fetch it on
      //       demand, or denormalize and throw all the metadata into the Entity
      //       struct.
      const entityMetadata = await registryClient.accounts.allMetadata();
      // TODO: don't special case this.
      const defaultEntity = entityAccounts
        .filter(
          e => e.publicKey.toString() === network.defaultEntity.toString(),
        )
        .pop();
      const defaultMetadata = {
        publicKey: defaultEntity!.account.metadata,
        account: await registryClient.accounts.metadata(
          defaultEntity!.account.metadata,
        ),
      };
      entityMetadata.push(defaultMetadata);
      dispatch({
        type: ActionType.RegistrySetMetadata,
        item: {
          entityMetadata,
        },
      });
    };

    // Getting rate limited so break up RPC requests and sleep.
    const fetchPoolData = async () => {
      const registrar = await registryClient.accounts.registrar();
      await sleep(1000 * 2);
      const pool = await registryClient.accounts.pool(registrar);
      await sleep(1000 * 2);
      const poolVault = await registryClient.accounts.poolVault(registrar);
      await sleep(1000 * 2);
      const megaPool = await registryClient.accounts.megaPool(registrar);
      await sleep(1000 * 2);
      const megaPoolVaults = await registryClient.accounts.megaPoolVaults(
        registrar,
      );
      await sleep(1000 * 2);
      const poolTokenMint = await registryClient.accounts.poolTokenMint(
        pool,
        registrar,
      );
      await sleep(1000 * 2);
      const megaPoolTokenMint = await registryClient.accounts.megaPoolTokenMint(
        megaPool,
        registrar,
      );

      dispatch({
        type: ActionType.RegistrySetPools,
        item: {
          pool: {
            publicKey: registrar.pool,
            account: pool,
          },
          poolTokenMint: {
            publicKey: pool.poolTokenMint,
            account: poolTokenMint,
          },
          poolVault: {
            publicKey: pool.assets[0].vaultAddress,
            account: poolVault,
          },
          megaPool: {
            publicKey: registrar.megaPool,
            account: megaPool,
          },
          megaPoolTokenMint: {
            publicKey: megaPool.poolTokenMint,
            account: megaPoolTokenMint,
          },
          megaPoolVaults: megaPoolVaults.map((v, idx) => {
            return {
              publicKey: megaPool.assets[idx].vaultAddress,
              account: v,
            };
          }),
        },
      });
    };

    const fetchRegistrar = async () => {
      const registrar = await registryClient.accounts.registrar();
      dispatch({
        type: ActionType.RegistrySetRegistrar,
        item: {
          registrar: {
            publicKey: registryClient.registrar,
            account: registrar,
          },
        },
      });
    };

    const fetchSafe = async () => {
      const lockup = await lockupClient.accounts.safe();
      dispatch({
        type: ActionType.LockupSetSafe,
        item: {
          safe: {
            publicKey: lockupClient.safe,
            account: lockup,
          },
        },
      });
    };

    // Connections.

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

    const fetchVestingAccounts = async () => {
      const vestingAccounts = await lockupClient.accounts.allVestings(
        wallet.publicKey,
      );
      dispatch({
        type: ActionType.LockupSetVestings,
        item: {
          vestingAccounts,
        },
      });
    };

    const fetchMemberAccount = async () => {
      const members = await registryClient.accounts.membersWithBeneficiary(
        wallet.publicKey,
      );

      if (members.length > 0) {
        const member = members[0];
        const pendingWithdrawals = await registryClient.accounts.pendingWithdrawalsForMember(
          member.publicKey,
        );
        // TODO: probably want a UI to handle multiple member accounts and
        //       choosing between them.
        dispatch({
          type: ActionType.RegistrySetMember,
          item: {
            member,
          },
        });
        dispatch({
          type: ActionType.RegistrySetPendingWithdrawals,
          item: {
            memberPublicKey: member.publicKey,
            pendingWithdrawals,
          },
        });
      }
    };

    enqueueSnackbar(`Connecting to ${network.label}`, {
      variant: 'info',
      autoHideDuration: 2500,
    });

    dispatch({
      type: ActionType.CommonAppWillBootstrap,
      item: {},
    });

    // Break up to avoid rate limits.
    startSubscriptions();
    await fetchRegistrar();
    await fetchSafe();
    await fetchEntityAccounts();
    await fetchPoolData();
    await fetchOwnedTokenAccounts();
    await fetchVestingAccounts();
    await fetchMemberAccount();

    dispatch({
      type: ActionType.CommonAppDidBootstrap,
      item: {},
    });

    enqueueSnackbar(`Connection established`, {
      variant: 'success',
      autoHideDuration: 2500,
    });
  }, [
    lockupClient.safe,
    lockupClient.accounts,
    dispatch,
    enqueueSnackbar,
    network.label,
    registryClient.accounts,
    registryClient.registrar,
    registryClient.rewardEventQueue,
    wallet.publicKey,
    network.defaultEntity,
    lockupClient.provider.connection,
  ]);

  const shutdown = useCallback(async () => {
    wallet.disconnect();
    try {
      registryClient.accounts.rewardEventQueueDisconnect();
    } catch (err) {
      console.error('Error disconnecting listeners', err);
    }
    dispatch({
      type: ActionType.CommonDidShutdown,
      item: {},
    });
  }, [registryClient.accounts, dispatch, wallet]);

  useEffect(() => {
    if (bootstrapTrigger) {
      bootstrap().catch(err => {
        enqueueSnackbar(`Error bootstrapping application: ${err.toString()}`, {
          variant: 'error',
        });
      });
    }
    if (shutdownTrigger) {
      shutdown().catch(err => {
        enqueueSnackbar(`Error shutting down application: ${err.toString()}`, {
          variant: 'error',
        });
      });
    }
  }, [bootstrapTrigger, bootstrap, shutdownTrigger, shutdown, enqueueSnackbar]);

  return <>{props.children}</>;
}

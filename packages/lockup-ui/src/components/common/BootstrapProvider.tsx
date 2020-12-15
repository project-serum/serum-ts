import React, {
  PropsWithChildren,
  ReactNode,
  useEffect,
  useCallback,
} from 'react';
import { MintInfo } from '@solana/spl-token';
import { useDispatch, useSelector } from 'react-redux';
import { useSnackbar } from 'notistack';
import { PublicKey } from '@solana/web3.js';
import { token, ProgramAccount, parseMintAccount } from '@project-serum/common';
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
    const startSubscriptions = async (
      registrar: registry.accounts.Registrar,
    ) => {
      // Reward event queue sub.
      const rewardQueueSubscribe = async () => {
        const conn = registryClient.accounts.rewardEventQueueConnect(
          registryClient.rewardEventQueue,
        );
        conn.on(
          'connected',
          (
            rewardEventQueue: ProgramAccount<
              registry.accounts.RewardEventQueue
            >,
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
            rewardEventQueue: ProgramAccount<
              registry.accounts.RewardEventQueue
            >,
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
      // Member sub.
      const memberSubscribe = async () => {
        const members = await registryClient.accounts.membersWithBeneficiary(
          wallet.publicKey,
        );
        // TODO: Probably want a UI to handle multiple member accounts and
        //       choosing between them.
        //
        //      Alternatively, use a deterministic address.
        if (members.length === 0) {
          dispatch({
            type: ActionType.RegistrySetMember,
            item: {
              member: undefined,
            },
          });
          return;
        }

        await subscribeMember(members[0].publicKey, registryClient, dispatch);
      };

      // Staking pool token sub.
      const poolTokenSubscribe = async () => {
        const poolMint = await registryClient.accounts.poolTokenMint(registrar);
        const poolMintMega = await registryClient.accounts.megaPoolTokenMint(
          registrar,
        );
        dispatch({
          type: ActionType.RegistrySetPoolMint,
          item: {
            poolMint: {
              publicKey: registrar.poolMint,
              account: poolMint,
            },
          },
        });
        dispatch({
          type: ActionType.RegistrySetPoolMintMega,
          item: {
            poolMintMega: {
              publicKey: registrar.poolMintMega,
              account: poolMintMega,
            },
          },
        });

        registryClient.accounts
          .accountConnect(registrar.poolMint, parseMintAccount)
          .on('change', (poolMint: MintInfo) => {
            dispatch({
              type: ActionType.RegistrySetPoolMint,
              item: {
                poolMint: {
                  publicKey: registrar.poolMint,
                  account: poolMint,
                },
              },
            });
          });
        registryClient.accounts
          .accountConnect(registrar.poolMintMega, parseMintAccount)
          .on('change', (poolMintMega: MintInfo) => {
            dispatch({
              type: ActionType.RegistrySetPoolMintMega,
              item: {
                poolMintMega: {
                  publicKey: registrar.poolMintMega,
                  account: poolMintMega,
                },
              },
            });
          });
      };

      await rewardQueueSubscribe();
      await memberSubscribe();
      await poolTokenSubscribe();
    }; // End websocket subscriptions.

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
      return registrar;
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
      const defaultEntity = entityAccounts
        .filter(e => e.publicKey.equals(network.defaultEntity))
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

    enqueueSnackbar(`Connecting to ${network.label}`, {
      variant: 'info',
      autoHideDuration: 2500,
    });

    dispatch({
      type: ActionType.CommonAppWillBootstrap,
      item: {},
    });

    const registrar = await fetchRegistrar();
    await startSubscriptions(registrar);
    await fetchSafe();
    await fetchEntityAccounts();
    await fetchOwnedTokenAccounts();
    await fetchVestingAccounts();

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
    registryClient,
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

export async function subscribeMember(
  m: PublicKey,
  registryClient: registry.Client,
  dispatch: any,
) {
  const [member, conn] = await registryClient.accounts.memberConnect(m);
  conn.on('change', (member: ProgramAccount<registry.accounts.MemberDeref>) => {
    dispatch({
      type: ActionType.RegistrySetMember,
      item: {
        member,
      },
    });
  });
  dispatch({
    type: ActionType.RegistrySetMember,
    item: {
      member,
    },
  });
  const pendingWithdrawals = await registryClient.accounts.pendingWithdrawalsForMember(
    m,
  );
  dispatch({
    type: ActionType.RegistrySetPendingWithdrawals,
    item: {
      memberPublicKey: member.publicKey,
      pendingWithdrawals,
    },
  });
}

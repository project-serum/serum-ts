import React, {
  PropsWithChildren,
  ReactElement,
  ReactNode,
  useMemo,
  useContext,
} from 'react';
import { useSelector } from 'react-redux';
import { Connection } from '@solana/web3.js';
// @ts-ignore
import Wallet from '@project-serum/sol-wallet-adapter';
import { Provider } from '@project-serum/common';
import { Client as LockupClient } from '@project-serum/lockup';
import { Client as RegistryClient } from '@project-serum/registry';
import { State as StoreState } from '../../store/reducer';

export function useWallet(): WalletContextValues {
  const w = useContext(WalletContext);
  if (!w) {
    throw new Error('Missing wallet context');
  }
  return w;
}

const WalletContext = React.createContext<null | WalletContextValues>(null);

type WalletContextValues = {
  wallet: Wallet;
  lockupClient: LockupClient;
  registryClient: RegistryClient;
};

export default function WalletProvider(
  props: PropsWithChildren<ReactNode>,
): ReactElement {
  const { walletProvider, network } = useSelector((state: StoreState) => {
    return {
      walletProvider: state.common.walletProvider,
      network: state.common.network,
    };
  });

  const { wallet, lockupClient, registryClient } = useMemo(() => {
    const preflightCommitment = 'recent';
    const opts: { preflightCommitment: 'recent' } = {
      preflightCommitment,
    };
    const connection = new Connection(network.url, preflightCommitment);
    const wallet = new Wallet(walletProvider, network.url);
    const provider = new Provider(connection, wallet, opts);
    RegistryClient.setRetbuf(network.retbuf, network.retbufProgramId);

    return {
      wallet,
      lockupClient: new LockupClient({
        provider,
        programId: network.lockupProgramId,
        safe: network.safe,
      }),
      registryClient: new RegistryClient({
        provider,
        programId: network.registryProgramId,
        stakeProgramId: network.stakeProgramId,
        metaEntityProgramId: network.metaEntityProgramId,
        registrar: network.registrar,
        rewardEventQueue: network.rewardEventQueue,
      }),
    };
  }, [walletProvider, network]);

  return (
    <WalletContext.Provider value={{ wallet, lockupClient, registryClient }}>
      {props.children}
    </WalletContext.Provider>
  );
}

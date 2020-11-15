import React, { Context, PropsWithChildren, ReactElement, ReactNode, useEffect, useMemo, useContext } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Button from '@material-ui/core/Button';
import { useSnackbar } from 'notistack';

import { State as StoreState } from '../store/reducer';
import { ActionType } from '../store/actions';
// @ts-ignore
import Wallet from '@project-serum/sol-wallet-adapter';
import { Client } from '@project-serum/lockup';

export function useWallet(): WalletContextValues {
	const w = useContext(WalletContext);
	if (!w) {
		throw new Error('Missing wallet context');
	}
	return w;
}

const WalletContext = React.createContext<null | WalletContextValues>(null);

type WalletContextValues = {
	wallet: Wallet,
	client: Client,
};

export function WalletProvider(props: PropsWithChildren<ReactNode>): ReactElement {
	const { walletProvider, networkUrl } = useSelector((state: StoreState) => {
		return {
			walletProvider: state.walletProvider,
			networkUrl: state.networkUrl,
		};
	});
  const wallet = useMemo(() => new Wallet(walletProvider, networkUrl), [
		walletProvider,
		networkUrl,
  ]);

	const client = useMemo(() => Client.devnet(wallet), [wallet]);

	return (
		<WalletContext.Provider value={{wallet, client}}>
			{props.children}
		</WalletContext.Provider>
	);
}

export function WalletConnectButton(): ReactElement {
	const isConnected = useSelector((state: StoreState) => state.walletIsConnected);
	const dispatch = useDispatch();
	const { wallet } = useWallet();

	const {enqueueSnackbar, closeSnackbar } = useSnackbar();

	useEffect(() => {
    wallet.on('disconnect', () => {
			dispatch({ type: ActionType.WalletIsConnected, item: { walletIsConnected: false }});
			enqueueSnackbar('Disconnected from wallet');
    });
	}, [wallet]);

	const connect = () => {
		enqueueSnackbar('Connecting to wallet...');
		wallet.once('connect', () => {
			closeSnackbar();
			dispatch({
				type: ActionType.WalletIsConnected,
				item: {
					walletIsConnected: true
				},
			});
      enqueueSnackbar(`Connectection established ${wallet.publicKey.toBase58()}`);;
		});
		wallet.connect();
	};

	const disconnect = () => {
		wallet.disconnect();
	};

	return isConnected ? (
		<Button color="inherit" onClick={disconnect}>Disconnect</Button>
	) : (
		<Button color="inherit" onClick={connect}>Connect wallet</Button>
	);
}

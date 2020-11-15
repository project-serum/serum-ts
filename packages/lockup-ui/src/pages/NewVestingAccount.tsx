import React, { ReactNode } from 'react';
import { Client } from '@project-serum/lockup';
import {
  Provider,
  getTokenAccount,
  sleep,
  createMintAndVault,
  createTokenAccount,
} from '@project-serum/common';
// @ts-ignore
import Wallet from '@project-serum/sol-wallet-adapter';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';

export default function NewVesting() {
	return (
		<TextField label="beneficiary" />
	);
}


async function testLockup() {
		const wallet = new Wallet('https://www.sollet.io', 'https://devnet.solana.com');
		wallet.on('connect', async () => {
				const client = Client.devnet(wallet);
				const safe = await client.accounts.safe();
				console.log('Safe', safe);
		});
		wallet.on('disconnect', () => {
				console.log('wallet disconnected');
		});
		wallet.connect();
		wallet.on('disconnect', () => {
				console.log('wallet disconnected');
		});
		wallet.connect();
}

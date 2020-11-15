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

export default function VestingAccounts() {
  return <div>Vesting Accounts</div>;
}

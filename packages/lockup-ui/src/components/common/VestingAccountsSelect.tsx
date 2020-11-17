import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import BN from 'bn.js';
import Select from '@material-ui/core/Select';
import MenuItem from '@material-ui/core/MenuItem';
import { PublicKey } from '@solana/web3.js';
import * as lockup from '@project-serum/lockup';
import { ProgramAccount } from '@project-serum/common';
import { State as StoreState } from '../../store/reducer';

type Props = {
  style?: any;
  mint?: PublicKey | null;
  variant?: 'outlined' | 'standard';
  onChange: (from: PublicKey, maxAmount: BN) => void;
  deposit?: boolean;
};

export default function VestingAccountsSelect(p: Props) {
  const { mint, variant, onChange, style, deposit } = p;
  const vestings = useSelector((state: StoreState) => {
    if (!mint) {
      return [];
    }
    return state.lockup.vestings.filter(v => v.account.mint.equals(mint));
  });
  const [fromAccount, setFromAccount] = useState('');
  return (
    <Select
      style={style}
      variant={variant}
      fullWidth
      value={fromAccount}
      onChange={e => {
        const pk = e.target.value as string;
        setFromAccount(pk);
        const pubkey = new PublicKey(pk);
        const v = vestings.filter(v => v.publicKey.equals(pubkey)).pop();
        onChange(pubkey, availableAmount(v!, deposit));
      }}
    >
      {vestings.length === 0 ? (
        <MenuItem value={''}>No vesting accounts found</MenuItem>
      ) : (
        vestings.map(v => {
          return (
            <MenuItem value={v.publicKey.toString()}>
              <div
                style={{
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <div>{`${v.publicKey.toString()}`}</div>
                <div
                  style={{ float: 'right', color: '#ccc' }}
                >{`${availableAmount(v, deposit).toString()}`}</div>
              </div>
            </MenuItem>
          );
        })
      )}
    </Select>
  );
}

function availableAmount(
  v: ProgramAccount<lockup.accounts.Vesting>,
  deposit?: boolean,
): BN {
  return deposit
    ? v.account.outstanding.sub(v.account.whitelistOwned)
    : v.account.whitelistOwned;
}

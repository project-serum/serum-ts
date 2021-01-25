import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import BN from 'bn.js';
import Select from '@material-ui/core/Select';
import MenuItem from '@material-ui/core/MenuItem';
import { PublicKey } from '@solana/web3.js';
import { State as StoreState, ProgramAccount } from '../../store/reducer';
import { toDisplay } from '../../utils/tokens';

type Props = {
  style?: any;
  mint?: PublicKey | null;
  decimals: number;
  variant?: 'outlined' | 'standard';
  onChange: (from: PublicKey, maxAmount: BN) => void;
  deposit?: boolean;
};

export default function VestingAccountsSelect(p: Props) {
  const { mint, decimals, variant, onChange, style, deposit } = p;
  const vestings: ProgramAccount[] = useSelector((state: StoreState) => {
    if (!mint) {
      return [];
    }
    return state.lockup.vestings
      .map(v => {
        return { publicKey: v, account: state.accounts[v.toString()] };
      })
      .filter(v => v.account.mint.equals(mint));
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
                <div style={{ float: 'right', color: '#ccc' }}>{`${toDisplay(
                  availableAmount(v, deposit),
                  decimals,
                )}`}</div>
              </div>
            </MenuItem>
          );
        })
      )}
    </Select>
  );
}

function availableAmount(v: ProgramAccount, deposit?: boolean): BN {
  return deposit
    ? v.account.outstanding.sub(v.account.whitelistOwned)
    : v.account.whitelistOwned;
}

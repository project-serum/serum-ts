import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import BN from 'bn.js';
import Select from '@material-ui/core/Select';
import MenuItem from '@material-ui/core/MenuItem';
import { PublicKey } from '@solana/web3.js';
import { State as StoreState } from '../../store/reducer';
import { toDisplay } from '../../utils/tokens';

type Props = {
  style?: any;
  mint?: PublicKey | null;
  decimals?: number;
  variant?: 'outlined' | 'standard';
  onChange: (from: PublicKey, maxAmount: BN) => void;
};

export default function OwnedTokenAccountsSelect(p: Props) {
  const { mint, decimals, variant, onChange, style } = p;
  const ownedTokenAccounts = useSelector((state: StoreState) => {
    if (!mint) {
      return [];
    }
    return state.common.ownedTokenAccounts.filter(
      ota => ota.account.mint.toString() === mint.toString(),
    );
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
        const token = ownedTokenAccounts
          .filter(ota => ota.publicKey.equals(pubkey))
          .pop();
        onChange(pubkey, new BN(token!.account.amount));
      }}
    >
      {ownedTokenAccounts.length === 0 ? (
        <MenuItem value={''}>No token accounts found</MenuItem>
      ) : (
        ownedTokenAccounts.map(ownedTokenAccount => {
          return (
            <MenuItem value={ownedTokenAccount.publicKey.toString()}>
              <div
                style={{
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'space-between',
                  overflow: 'hidden',
                }}
              >
                <div>{`${ownedTokenAccount.publicKey}`}</div>
                <div style={{ float: 'right', color: '#ccc' }}>{`${toDisplay(
                  ownedTokenAccount.account.amount,
                  decimals!,
                )}`}</div>
              </div>
            </MenuItem>
          );
        })
      )}
    </Select>
  );
}

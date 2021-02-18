import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import Select from '@material-ui/core/Select';
import MenuItem from '@material-ui/core/MenuItem';
import { TOKENS } from '@project-serum/tokens';
import { PublicKey } from '@solana/web3.js';
import { State as StoreState, ProgramAccount } from '../../store/reducer';
import { Network } from '../../store/config';
import * as bootstrap from './BootstrapProvider';
import { useWallet } from './WalletProvider';

export function activeRegistrar(
  state: StoreState,
): { label: string; programAccount: any } {
  const registrars = Object.keys(state.common.network.registrars)
    .map(registrar => {
      let entry: [string, ProgramAccount] = [
        registrar,
        {
          publicKey: state.common.network.registrars[registrar],
          account:
            state.accounts[
              state.common.network.registrars[registrar].toString()
            ],
        },
      ];
      return entry;
    })
    .filter(r => r[1].account !== undefined);
  const selectedRegistrar: any = registrars
    .filter(([r, acc]) => acc.publicKey.equals(state.registry.registrar))
    .map(([r, acc]) => {
      return {
        label: r,
        programAccount: acc,
      };
    })
    .pop();

  return selectedRegistrar;
}

export default function RegistrarSelect() {
  const { registryClient } = useWallet();
  const { registrars, selectedRegistrar, accounts, network } = useSelector(
    (state: StoreState) => {
      const registrars = Object.keys(state.common.network.registrars)
        .map(registrar => {
          let entry: [string, ProgramAccount] = [
            registrar,
            {
              publicKey: state.common.network.registrars[registrar],
              account:
                state.accounts[
                  state.common.network.registrars[registrar].toString()
                ],
            },
          ];
          return entry;
        })
        .filter(r => r[1].account !== undefined);
      const selectedRegistrar: any = registrars
        .filter(([r, acc]) => acc.publicKey.equals(state.registry.registrar))
        .map(([r, acc]) => {
          return {
            label: r,
            programAccount: acc,
          };
        })
        .pop();
      return {
        network: state.common.network,
        accounts: state.accounts,
        registrars,
        selectedRegistrar,
      };
    },
  );
  const dispatch = useDispatch();
  return (
    <Select
      style={{ width: '294px', height: '36px' }}
      variant={'outlined'}
      fullWidth
      value={selectedRegistrar.label}
      onChange={async e => {
        const registrar: ProgramAccount = registrars
          .filter(([r, acc]) => r === e.target.value)
          .map(([r, acc]) => acc)
          .pop()!;

        bootstrap.registrarSwitch(
          registryClient,
          accounts,
          dispatch,
          registrar!.publicKey, // New.
          selectedRegistrar.programAccount.publicKey, // Old.
        );
      }}
    >
      {registrars.length === 0 ? (
        <MenuItem value={'_loading'}>Loading registrars...</MenuItem>
      ) : (
        registrars.map(([label, registrar]) => {
          return (
            <MenuItem key={label} value={label}>
              <div style={{ display: 'flex' }}>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                  }}
                >
                  {getImage(registrar.account.mint)}
                </div>
                <div
                  style={{
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                  }}
                >
                  {`${registrarToDisplayLabel(registrar, network)}`}
                </div>
              </div>
            </MenuItem>
          );
        })
      )}
    </Select>
  );
}

function registrarToDisplayLabel(
  registrar: ProgramAccount,
  network: Network,
): string {
  const entry = Object.keys(network.registrars)
    .filter(r => network.registrars[r].equals(registrar.publicKey))
    .pop();
  if (entry !== undefined) {
    return entry.toUpperCase();
  }
  return registrar.publicKey.toString();
}

function getImage(mint: PublicKey) {
  let token = TOKENS.mainnet.filter(t => t.mintAddress === mint.toString());
  if (token.length === 1 && token[0].icon) {
    return (
      <img
        alt="Token Icon"
        style={{ marginRight: '10px', height: '25px' }}
        src={token[0].icon}
      />
    );
  } else {
    return <div style={{ marginLeft: '32px' }}></div>;
  }
}

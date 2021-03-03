import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import Typography from '@material-ui/core/Typography';
import IconButton from '@material-ui/core/IconButton';
import Brightness1Icon from '@material-ui/icons/Brightness1';
import Link from '@material-ui/core/Link';
import { State as StoreState } from '../../store/reducer';

export default function Footer() {
  const [envDisplay, setEnvDisplay] = useState(false);
  const { isDisconnected } = useSelector((state: StoreState) => {
    return {
      isDisconnected: !state.common.isWalletConnected,
    };
  });
  return (
    <div
      style={{
        zIndex: 99,
        position: 'fixed',
        width: '100%',
        bottom: 0,
        textAlign: 'center',
        height: '30px',
        backgroundColor: '#fbfbfb',
        borderTop: 'solid 1pt #ccc',
        display: 'flex',
        justifyContent: 'space-between',
        paddingLeft: '10px',
        paddingRight: '10px',
      }}
    >
      <div
        style={{
          display: 'flex',
          position: 'absolute',
          bottom: '40px',
          left: '10px',
          borderRadius: '4px',
          background: '#272727',
        }}
        onClick={() => {
          setEnvDisplay(!envDisplay);
        }}
      >
        <IconButton
          style={{
            paddingLeft: '10px',
            paddingRight: '10px',
            paddingTop: 0,
            paddingBottom: 0,
            color: 'inherit',
            display: 'flex',
            justifyContent: 'center',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              flexDirection: 'column',
              marginRight: '10px',
            }}
          >
            <Brightness1Icon
              style={{
                color: isDisconnected ? '#ccc' : 'rgb(60, 195, 215)',
                fontSize: '12px',
              }}
            />
          </div>
          <Typography
            style={{ color: '#fff', fontSize: '14px', fontWeight: 'bold' }}
          >
            {'Environment'}
          </Typography>
        </IconButton>
      </div>
      <div style={{ marginLeft: 'auto', marginRight: 'auto', display: 'flex' }}>
        <FooterButton
          href={
            'https://github.com/project-serum/anchor/blob/master/examples/lockup/docs/staking.md'
          }
          label={'Technical Documentation'}
        />
        <FooterButton
          href={'https://github.com/project-serum/awesome-serum'}
          label={'Developer Resources'}
        />
        <FooterButton
          href={'https://discord.com/channels/739225212658122886'}
          label={'Discord'}
        />
        <FooterButton href={'https://t.me/ProjectSerum'} label={'Telegram'} />
        <FooterButton
          href={'https://github.com/project-serum'}
          label={'GitHub'}
        />
        <FooterButton
          href={'https://solanabeach.io/'}
          label={'Solana Network'}
          isEnd={true}
        />
      </div>
      {envDisplay && (
        <div
          style={{
            overflowY: 'scroll',
            position: 'fixed',
            bottom: '30px',
            right: 0,
            width: '500px',
            height: '400px',
            borderTopLeftRadius: '4px',
            boxShadow: 'rgba(0, 0, 0, 0.05) 0px 0px 25px 0px',
            background: '#fff',
          }}
        >
          <NetworkEnvironment />
        </div>
      )}
    </div>
  );
}

function NetworkEnvironment() {
  let { network, registrar, registrarAddress } = useSelector(
    (state: StoreState) => {
      return {
        network: state.common.network,
        registrar: state.accounts[state.registry.registrar.toString()],
        registrarAddress: state.registry.registrar,
      };
    },
  );
  return (
    <div style={{ textAlign: 'left' }}>
      <Typography
        style={{
          paddingLeft: '10px',
          marginTop: '20px',
          fontSize: '14px',
          fontWeight: 'bold',
        }}
      >
        Programs and Global Accounts
      </Typography>
      <ul>
        <li>
          SRM Faucet:{' '}
          {network.srmFaucet ? network.srmFaucet.toString() : 'None'}
        </li>
        <li>
          MSRM Faucet:{' '}
          {network.msrmFaucet ? network.msrmFaucet.toString() : 'None'}
        </li>
        <li>Registry Program: {network.registryProgramId.toString()}</li>
        <li>Lockup Program: {network.lockupProgramId.toString()}</li>
      </ul>
      <Typography
        style={{
          paddingLeft: '10px',
          marginTop: '20px',
          fontSize: '14px',
          fontWeight: 'bold',
        }}
      >
        Stake Registrar
      </Typography>
      <ul>
        <li>Address: {registrarAddress.toString()}</li>
        {Object.keys(registrar).map(field => {
          return (
            <li>
              {field}: {registrar[field].toString()}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

type FooterButtonProps = {
  label: string;
  href: string;
  isEnd?: boolean;
};

function FooterButton(props: FooterButtonProps) {
  const { label, href, isEnd } = props;
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        flexDirection: 'column',
        marginRight: isEnd ? '' : '15px',
      }}
    >
      <Link href={href} target="_blank" color="inherit">
        <Typography style={{ fontSize: '14px' }}>{label}</Typography>
      </Link>
    </div>
  );
}

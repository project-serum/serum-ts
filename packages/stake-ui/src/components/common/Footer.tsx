import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button';
import IconButton from '@material-ui/core/IconButton';
import Brightness1Icon from '@material-ui/icons/Brightness1';
import Link from '@material-ui/core/Link';
import { State as StoreState, BootstrapState } from '../../store/reducer';
import Messaging from './Messaging';

export default function Footer() {
  const [chatDisplay, setChatDisplay] = useState(false);
  const [envDisplay, setEnvDisplay] = useState(false);
  const { isAppReady, isDisconnected, hasMember } = useSelector(
    (state: StoreState) => {
      return {
        isAppReady:
          state.common.isWalletConnected &&
          state.common.bootstrapState === BootstrapState.Bootstrapped,
        isDisconnected: !state.common.isWalletConnected,
        hasMember: state.registry.member,
      };
    },
  );
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
            'https://github.com/project-serum/serum-dex/blob/master/docs/staking.md'
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
        {hasMember && isAppReady && (
          <div
            style={{ display: 'none' /*'flex'*/ }}
            onClick={() => {
              setChatDisplay(!chatDisplay);
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                flexDirection: 'column',
              }}
            >
              <Button style={{ padding: 0 }}>
                <Typography style={{ fontSize: '14px', fontWeight: 'bold' }}>
                  Chat
                </Typography>
              </Button>
            </div>
          </div>
        )}
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
      {hasMember && chatDisplay && (
        <div
          style={{
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
          <Messaging />
        </div>
      )}
    </div>
  );
}

function NetworkEnvironment() {
  let { network, registrar, safe } = useSelector((state: StoreState) => {
    return {
      network: state.common.network,
      registrar: state.registry.registrar,
      safe: state.lockup.safe,
    };
  });
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
        <li>SRM Mint: {network.srm.toString()}</li>
        <li>MSRM Mint: {network.msrm.toString()}</li>
        <li>Registry Program: {network.registryProgramId.toString()}</li>
        <li>Lockup Program: {network.lockupProgramId.toString()}</li>
        <li>Meta Entity Program: {network.lockupProgramId.toString()}</li>
        <li>Registrar Account: {network.registrar.toString()}</li>
        <li>Safe Account: {network.safe.toString()}</li>
      </ul>
      {registrar && safe && (
        <>
          <Typography
            style={{
              paddingLeft: '10px',
              fontSize: '14px',
              fontWeight: 'bold',
            }}
          >
            Registrar
          </Typography>
          <ul>
            <li>Authority: {registrar.account.authority.toString()}</li>
            <li>
              Max stake per entity:{' '}
              {registrar.account.maxStakePerEntity.toString()}
            </li>
            <li>
              Withdrawal timelocK:{' '}
              {registrar.account.withdrawalTimelock.toString()}
            </li>
            <li>
              Deactivation timelock:{' '}
              {registrar.account.deactivationTimelock.toString()}
            </li>
            <li>Pool token: {registrar.account.poolMint.toString()}</li>
            <li>
              Mega pool token: {registrar.account.poolMintMega.toString()}
            </li>
          </ul>
          <Typography
            style={{
              paddingLeft: '10px',
              fontSize: '14px',
              fontWeight: 'bold',
            }}
          >
            Safe
          </Typography>
          <ul>
            <li>Authority: {safe.account.authority.toString()}</li>
            <li>Whitelist: {safe.account.whitelist.toString()}</li>
          </ul>
        </>
      )}
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

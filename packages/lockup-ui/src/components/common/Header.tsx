import React, { useState, useEffect, ReactElement } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useHistory } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Select from '@material-ui/core/Select';
import Menu from '@material-ui/core/Menu';
import Typography from '@material-ui/core/Typography';
import MenuItem from '@material-ui/core/MenuItem';
import IconButton from '@material-ui/core/IconButton';
import PersonAddIcon from '@material-ui/icons/PersonAdd';
import ExitToAppIcon from '@material-ui/icons/ExitToApp';
import Button from '@material-ui/core/Button';
import PersonIcon from '@material-ui/icons/Person';
import BubbleChartIcon from '@material-ui/icons/BubbleChart';
import * as registry from '@project-serum/registry';
import { networks } from '@project-serum/common';
import { State as StoreState, ProgramAccount } from '../../store/reducer';
import { ActionType } from '../../store/actions';
import { useWallet } from './WalletProvider';
import * as bootstrap from './BootstrapProvider';

type HeaderProps = {
  isAppReady: boolean;
  member?: ProgramAccount<registry.accounts.Member>;
};

export default function Header(props: HeaderProps) {
  const { isAppReady } = props;
  return (
    <AppBar
      position="static"
      style={{
        background: '#172026',
        color: 'white',
      }}
    >
      <Toolbar>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            width: '100%',
          }}
        >
          <div style={{ display: 'flex' }}>
            <SerumLogoButton />
            <BarButton label="Stake" hrefClient="/" />
            <BarButton label="Trade" href="https://dex.projectserum.com" />
            <BarButton label="Swap" href="https://swap.projectserum.com" />
            <BarButton
              label="Learn"
              href="https://serum-academy.com/en/serum-dex/"
            />
          </div>
          <div
            style={{
              display: 'flex',
            }}
          >
            <NetworkSelector />
            <WalletConnectButton
              style={{
                display: isAppReady ? 'none' : '',
              }}
            />
            {isAppReady && <UserSelector />}
          </div>
        </div>
      </Toolbar>
    </AppBar>
  );
}

function SerumLogoButton() {
  const history = useHistory();
  return (
    <div style={{ display: 'flex' }} onClick={() => history.push('/')}>
      <Button color="inherit">
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <img
            style={{
              display: 'block',
              height: '35px',
            }}
            alt="Logo"
            src="http://dex.projectserum.com/static/media/logo.49174c73.svg"
          />
        </div>
      </Button>
    </div>
  );
}

type BarButtonProps = {
  label: string;
  hrefClient?: string;
  href?: string;
};

function BarButton(props: BarButtonProps) {
  const history = useHistory();
  const { label, href, hrefClient } = props;
  return (
    <div
      style={{ display: 'flex' }}
      onClick={() => hrefClient && history.push(hrefClient)}
    >
      <Button color="inherit" href={href}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            flexDirection: 'column',
          }}
        >
          <Typography style={{ fontSize: '15px' }}>{label}</Typography>
        </div>
      </Button>
    </div>
  );
}

function NetworkSelector() {
  const network = useSelector((state: StoreState) => {
    return state.common.network;
  });
  const dispatch = useDispatch();
  const [anchorEl, setAnchorEl] = useState(null);

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <div
      style={{
        marginRight: '10px',
        fontSize: '15px',
        display: 'flex',
        justifyContent: 'center',
        flexDirection: 'column',
      }}
    >
      <Button
        color="inherit"
        onClick={e =>
          setAnchorEl(
            // @ts-ignore
            e.currentTarget,
          )
        }
      >
        <BubbleChartIcon />
        <Typography style={{ marginLeft: '5px', fontSize: '15px' }}>
          {network.label}
        </Typography>
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        style={{
          marginLeft: '12px',
          color: 'white',
        }}
      >
        {Object.keys(networks).map((n: string) => (
          <MenuItem
            key={n}
            onClick={() => {
              handleClose();
              dispatch({
                type: ActionType.CommonSetNetwork,
                item: {
                  network: networks[n],
                },
              });
            }}
          >
            <Typography>{networks[n].label}</Typography>
          </MenuItem>
        ))}
      </Menu>
    </div>
  );
}

function UserSelector() {
  const dispatch = useDispatch();
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();
  const { wallet, lockupClient, registryClient } = useWallet();
  const { network, member } = useSelector((state: StoreState) => {
    return {
      member: state.registry.member,
      network: state.common.network,
    };
  });

  const createStakeAccount = async () => {
    enqueueSnackbar('Creating stake account', {
      variant: 'info',
    });

    // TODO: separate member creation from entity joining (i.e., make it so that
    //       entity doesn't need to be specified here).
    const entity = network.defaultEntity;
    const { member } = await registryClient.createMember({
      entity,
      delegate: await lockupClient.accounts.vaultAuthority(
        lockupClient.programId,
        lockupClient.safe,
        wallet.publicKey,
      ),
    });
    closeSnackbar();
    enqueueSnackbar(`Stake account created ${member.toString()}`, {
      variant: 'success',
    });
    bootstrap.subscribeMember(member, registryClient, dispatch);
  };
  return (
    <Select
      displayEmpty
      renderValue={() => {
        return (
          <Typography style={{ overflow: 'hidden' }}>
            {wallet.publicKey.toString()}
          </Typography>
        );
      }}
      style={{
        marginLeft: '12px',
        width: '150px',
        color: 'white',
      }}
      onChange={e => {
        if (e.target.value === 'disconnect') {
          wallet.disconnect();
        }
      }}
    >
      {member.isReady && member.data === undefined && (
        <MenuItem value="create-member">
          <div
            onClick={() =>
              createStakeAccount().catch(err => {
                enqueueSnackbar(
                  `Error creating stake account: ${err.toString()}`,
                  {
                    variant: 'error',
                  },
                );
              })
            }
          >
            <IconButton color="inherit">
              <PersonAddIcon />
              <Typography style={{ marginLeft: '15px' }}>
                Create stake account
              </Typography>
            </IconButton>
          </div>
        </MenuItem>
      )}
      <MenuItem value="disconnect">
        <IconButton color="inherit">
          <ExitToAppIcon />
          <Typography style={{ marginLeft: '15px' }}>Disconnect</Typography>
        </IconButton>
      </MenuItem>
    </Select>
  );
}

type WalletConnectButtonProps = {
  style?: any;
};

export function WalletConnectButton(
  props: WalletConnectButtonProps,
): ReactElement {
  const { showDisconnect } = useSelector((state: StoreState) => {
    return {
      showDisconnect: state.common.isWalletConnected,
    };
  });
  const dispatch = useDispatch();
  const { wallet, lockupClient } = useWallet();
  const { enqueueSnackbar } = useSnackbar();

  // Wallet connection event listeners.
  useEffect(() => {
    wallet.on('disconnect', () => {
      enqueueSnackbar('Disconnected from wallet', {
        variant: 'info',
        autoHideDuration: 2500,
      });
      dispatch({
        type: ActionType.CommonWalletDidDisconnect,
        item: {},
      });
      dispatch({
        type: ActionType.CommonTriggerShutdown,
        item: {},
      });
    });
    wallet.on('connect', async () => {
      dispatch({
        type: ActionType.CommonWalletDidConnect,
        item: {},
      });
      dispatch({
        type: ActionType.CommonTriggerBootstrap,
        item: {},
      });
    });
  }, [wallet, dispatch, enqueueSnackbar, lockupClient.provider.connection]);

  return showDisconnect ? (
    <Button
      style={props.style}
      color="inherit"
      onClick={() => wallet.disconnect()}
    >
      <ExitToAppIcon />
      <Typography style={{ marginLeft: '5px', fontSize: '15px' }}>
        Disconnect
      </Typography>
    </Button>
  ) : (
    <Button
      style={props.style}
      color="inherit"
      onClick={() => wallet.connect()}
    >
      <PersonIcon />
      <Typography style={{ marginLeft: '5px', fontSize: '15px' }}>
        Connect wallet
      </Typography>
    </Button>
  );
}

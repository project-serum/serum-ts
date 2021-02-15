import React, { useState, useEffect, ReactElement } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useHistory } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Select from '@material-ui/core/Select';
import Menu from '@material-ui/core/Menu';
import Link from '@material-ui/core/Link';
import Typography from '@material-ui/core/Typography';
import MenuItem from '@material-ui/core/MenuItem';
import IconButton from '@material-ui/core/IconButton';
import ExitToAppIcon from '@material-ui/icons/ExitToApp';
import Button from '@material-ui/core/Button';
import PersonIcon from '@material-ui/icons/Person';
import BubbleChartIcon from '@material-ui/icons/BubbleChart';
import RefreshIcon from '@material-ui/icons/Refresh';
import CircularProgress from '@material-ui/core/CircularProgress';
import { refreshAccounts } from './BootstrapProvider';
import { networks } from '../../store/config';
import {
  State as StoreState,
  ProgramAccount,
  BootstrapState,
} from '../../store/reducer';
import { ActionType } from '../../store/actions';
import { useWallet } from './WalletProvider';

type HeaderProps = {
  isAppReady: boolean;
  member?: ProgramAccount;
};

export default function Header(props: HeaderProps) {
  const { isAppReady } = props;
  const { network } = useSelector((state: StoreState) => {
    return {
      network: state.common.network,
      isAppReady:
        state.common.isWalletConnected &&
        state.common.bootstrapState === BootstrapState.Bootstrapped,
    };
  });
  const dispatch = useDispatch();
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();
  const { wallet, registryClient, lockupClient } = useWallet();
  const [isRefreshing, setIsRefreshing] = useState(false);
  return (
    <AppBar
      position="static"
      style={{
        background: '#ffffff',
        color: '#272727',
        boxShadow: 'none',
        borderBottom: 'solid 1pt #ccc',
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
            <BarButton label="Stake" hrefClient="/stake" />
            <BarButton label="Lockup" hrefClient="/lockup" />
            <BarButton label="Trade" href="https://dex.projectserum.com" />
            <BarButton label="Swap" href="https://swap.projectserum.com" />
            {network.srmFaucet && (
              <BarButton
                label="Faucet"
                href="https://www.spl-token-ui.com/#/token-faucets"
              />
            )}
          </div>
          <div
            style={{
              display: 'flex',
            }}
          >
            <div
              onClick={() => {
                setIsRefreshing(true);
                enqueueSnackbar(`Refreshing`, {
                  variant: 'info',
                });
                refreshAccounts({
                  dispatch,
                  lockupClient,
                  registryClient,
                  network,
                  wallet,
                })
                  .then(() => {
                    setIsRefreshing(false);
                    closeSnackbar();
                  })
                  .catch(err => {
                    setIsRefreshing(false);
                    closeSnackbar();
                    enqueueSnackbar(`There was a problem refreshing: ${err}`, {
                      variant: 'error',
                      autoHideDuration: 2500,
                    });
                  });
              }}
              style={{
                display: isAppReady ? 'block' : 'none',
                justifyContent: 'center',
                flexDirection: 'column',
                marginRight: '10px',
              }}
            >
              {isRefreshing ? (
                <div
                  style={{
                    marginTop: '8px',
                    padding: '10px',
                  }}
                >
                  <CircularProgress style={{ width: '24px', height: '24px' }} />
                </div>
              ) : (
                <div>
                  <IconButton>
                    <RefreshIcon />
                  </IconButton>
                </div>
              )}
            </div>
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
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}
      onClick={() => hrefClient && history.push(hrefClient)}
    >
      <Link
        style={{ color: 'inherit', textDecoration: 'none' }}
        href={href}
        target="_blank"
      >
        <Button color="inherit">
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
      </Link>
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
                  networkKey: n,
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
  const { wallet } = useWallet();

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
      }}
      onChange={e => {
        if (e.target.value === 'disconnect') {
          wallet.disconnect();
        }
      }}
    >
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

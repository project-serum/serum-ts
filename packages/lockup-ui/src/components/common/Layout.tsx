import React, { PropsWithChildren } from 'react';
import { useSelector } from 'react-redux';
import Typography from '@material-ui/core/Typography';
import { makeStyles } from '@material-ui/core/styles';
import LinearProgress from '@material-ui/core/LinearProgress';
import { State as StoreState, BootstrapState } from '../../store/reducer';
import Header from './Header';
import Footer from './Footer';

type Props = {};

export default function Layout(props: PropsWithChildren<Props>) {
  const { isAppReady } = useSelector((state: StoreState) => {
    return {
      isAppReady:
        state.common.isWalletConnected &&
        state.common.bootstrapState === BootstrapState.Bootstrapped,
    };
  });
  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        flexDirection: 'column',
        backgroundColor: 'rgb(251, 251, 251)',
      }}
    >
      <RiskBar />
      <Header isAppReady={isAppReady} />
      <div
        style={{
          flex: 1,
          display: 'flex',
          marginBottom: '30px', // Compensates for the fixed position footer.
        }}
      >
        {!isAppReady ? (
          <DisconnectedSplash />
        ) : (
          <div style={{ width: '100%' }}>{props.children}</div>
        )}
      </div>
      <Footer />
    </div>
  );
}

function RiskBar() {
  return (
    <div
      style={{
        color: '#fff',
        backgroundColor: 'rgb(39, 39, 39)',
        height: '30px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          flexDirection: 'column',
          height: '100%',
        }}
      >
        <Typography style={{ fontSize: '14px' }}>
          This is unaudited software. Use at your own risk.
        </Typography>
      </div>
    </div>
  );
}

const useStyles = makeStyles(theme => ({
  root: {
    width: '100%',
    '& > * + *': {
      marginTop: theme.spacing(2),
    },
  },
}));

function DisconnectedSplash() {
  const classes = useStyles();
  const { network, isDisconnected } = useSelector((state: StoreState) => {
    return {
      network: state.common.network,
      isDisconnected: !state.common.isWalletConnected,
    };
  });
  return (
    <div
      style={{
        flex: '1',
        display: 'flex',
        justifyContent: 'center',
        flexDirection: 'column',
        textAlign: 'center',
      }}
    >
      <div style={{ width: '100%', display: 'flex' }}>
        {isDisconnected ? (
          <div
            style={{ display: 'flex', marginLeft: 'auto', marginRight: 'auto' }}
          >
            <Typography
              style={{ marginLeft: '24px' }}
              color="textSecondary"
              variant="h4"
            >
              Disconnected
            </Typography>
          </div>
        ) : (
          <div style={{ width: '100%' }}>
            <div style={{ width: '100%' }} className={classes.root}>
              <div>
                <Typography variant="h5">
                  {`Connecting to ${network.label}...`}
                </Typography>
              </div>
              <div
                style={{
                  marginLeft: 'auto',
                  marginRight: 'auto',
                  width: '300px',
                }}
              >
                <LinearProgress style={{ width: '100%' }} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

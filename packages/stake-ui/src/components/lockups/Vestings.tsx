import React from 'react';
import { useSelector } from 'react-redux';
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import Typography from '@material-ui/core/Typography';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import { useWallet } from '../../components/common/WalletProvider';
import { State as StoreState } from '../../store/reducer';
import NewVestingButton from './NewVesting';
import VestingAccountCard from './VestingAccountCard';

export default function Vestings() {
  const { wallet } = useWallet();
  const { vestingAccounts, network } = useSelector((state: StoreState) => {
    return {
      vestingAccounts: state.lockup.vestings,
      network: state.common.network,
    };
  });
  return (
    <div style={{ width: '100%' }}>
      <div style={{ marginTop: '24px', marginBottom: '24px' }}>
        <link
          rel="stylesheet"
          href="//cdn.jsdelivr.net/chartist.js/latest/chartist.min.css"
        />
        <script src="//cdn.jsdelivr.net/chartist.js/latest/chartist.min.js"></script>
        {wallet.publicKey && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '24px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                flexDirection: 'column',
              }}
            >
              <Typography
                style={{
                  fontSize: '20px',
                  fontWeight: 'bold',
                }}
              >
                My Vesting Accounts
              </Typography>
            </div>
            <div>
              <NewVestingButton />
            </div>
          </div>
        )}
        <List disablePadding>
          {vestingAccounts.map(v => (
            <VestingAccountCard network={network} vesting={v} />
          ))}
          {vestingAccounts.length === 0 && (
            <Card
              style={{
                marginTop: '24px',
              }}
            >
              <CardContent>
                <ListItem>
                  <div
                    style={{
                      width: '100%',
                      display: 'flex',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Typography color="textSecondary" variant="h6">
                      No vesting accounts found
                    </Typography>
                  </div>
                </ListItem>
              </CardContent>
            </Card>
          )}
        </List>
      </div>
    </div>
  );
}

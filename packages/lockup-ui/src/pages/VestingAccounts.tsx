import React from 'react';
import { useSelector } from 'react-redux';
import { useWallet } from '../components/Wallet';
import { State as StoreState, VestingAccount } from '../store/reducer';
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import Typography from '@material-ui/core/Typography';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import Link from '@material-ui/core/Link';
import ChartistGraph from 'react-chartist';
import { FixedScaleAxis, IChartOptions, Interpolation } from 'chartist';
import { Link as RouterLink } from 'react-router-dom';
import Button from '@material-ui/core/Button';
import BN from 'bn.js';

export default function VestingAccounts() {
  const { wallet } = useWallet();
  const vestingAccounts = useSelector(
    (state: StoreState) => state.vestingAccounts,
  );
  const urlSuffix = '?cluster=devnet'; // todo: don't hardcode
  const totalBalance = wallet.publicKey
    ? vestingAccounts
        .map(a => a.vesting.balance)
        .reduce((a, b) => a.add(b), new BN(0))
        .toNumber()
    : 0;
  return (
    <>
      <link
        rel="stylesheet"
        href="//cdn.jsdelivr.net/chartist.js/latest/chartist.min.css"
      />
      <script src="//cdn.jsdelivr.net/chartist.js/latest/chartist.min.js"></script>
      {wallet.publicKey && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'row-reverse',
            marginBottom: '24px',
          }}
        >
          <div style={{ float: 'right' }}>
            <RouterLink
              to={'/new'}
              style={{ color: 'inherit', textDecoration: 'none' }}
            >
              <Button variant="contained" color="secondary">
                New
              </Button>
            </RouterLink>
          </div>
        </div>
      )}
      <Card>
        <CardContent style={{ paddingBottom: '16px' }}>
          {wallet.publicKey ? (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <Typography variant="h5">Beneficiary</Typography>
                <Typography style={{ fontSize: '16px' }}>
                  <Link
                    href={
                      `https://explorer.solana.com/account/${wallet.publicKey.toBase58()}` +
                      urlSuffix
                    }
                    target="_blank"
                    rel="noopener"
                  >
                    {wallet.publicKey.toString()}
                  </Link>
                </Typography>
              </div>
              <div>
                <div
                  style={{
                    marginTop: '6px',
                    color: 'rgba(0, 0, 0, 0.54)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    flexDirection: 'column',
                  }}
                >
                  <Typography variant="body1">
                    {`${totalBalance} SRM`}
                  </Typography>
                </div>
              </div>
            </div>
          ) : (
            <Typography variant="h5">Disconnected</Typography>
          )}
        </CardContent>
      </Card>
      <List disablePadding>
        {vestingAccounts.map(v => (
          <VestingAccountCard vesting={v} />
        ))}
      </List>
    </>
  );
}

type VestingAccountCardProps = {
  vesting: VestingAccount;
};

function VestingAccountCard(props: VestingAccountCardProps) {
  const { vesting } = props;
  const startTs = vesting.vesting.startTs;
  const endTs = vesting.vesting.endTs;

  const tsOverflow = endTs.sub(startTs)
																	.mod(vesting.vesting.periodCount);
  const shiftedStartTs = startTs.sub(tsOverflow);

  const period = (endTs.sub(shiftedStartTs)).div(vesting.vesting.periodCount);

  // Make the horizontal axis evenly spaced.
  //
  // Vesting dates assuming we stretch the start date back in time (so that the
  // periods are of even length).
  const vestingDates = [
    ...Array(vesting.vesting.periodCount.toNumber() + 1),
  ].map((_, idx) => {
    return formatDate(new Date((shiftedStartTs.toNumber() + idx * period.toNumber()) * 1000));
  });
  // Now push the start window forward to the real start date, making the first period shorter.
  vestingDates[0] = formatDate(new Date(startTs.toNumber() * 1000));

  // Now do the same thing on the vertical axis.
  const rewardOverflow = vesting.vesting.startBalance.mod(
    vesting.vesting.periodCount,
  );
  const rewardPerPeriod = vesting.vesting.startBalance
    .sub(rewardOverflow)
    .div(vesting.vesting.periodCount)
    .toNumber();
  const cumulativeVesting = [...Array(vestingDates.length)].map(() => 0);
  cumulativeVesting[1] = rewardPerPeriod + rewardOverflow.toNumber();
  for (let k = 2; k < cumulativeVesting.length; k += 1) {
    cumulativeVesting[k] = cumulativeVesting[k - 1] + rewardPerPeriod;
  }

  const startLabel = formatDate(
    new Date(vesting.vesting.startTs.toNumber() * 1000),
  );
  const endLabel = formatDate(
    new Date(vesting.vesting.endTs.toNumber() * 1000),
  );

  const currencyLabel = 'SRM'; // todo: don't hardcode.
  const urlSuffix = '?cluster=devnet'; // todo: don't hardcode
  return (
    <Card
      key={vesting.publicKey.toString()}
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
            <ListItemText
              primary={
                <Link
                  href={
                    `https://explorer.solana.com/account/${vesting.publicKey.toBase58()}` +
                    urlSuffix
                  }
                  target="_blank"
                  rel="noopener"
                >
                  {vesting.publicKey.toString()}
                </Link>
              }
              secondary={`${startLabel}, ${endLabel} | ${vesting.vesting.periodCount.toNumber()}`}
            />
            <div
              style={{
                marginTop: '6px',
                color: 'rgba(0, 0, 0, 0.54)',
                display: 'flex',
                justifyContent: 'space-between',
                flexDirection: 'column',
              }}
            >
              <Typography variant="body1">
                {`${vesting.vesting.balance.toNumber()} ${currencyLabel}`}
              </Typography>
            </div>
          </div>
        </ListItem>
        <ChartistGraph
          data={{
            labels: vestingDates,
            series: [cumulativeVesting],
          }}
          options={
            {
              axisY: {
                type: FixedScaleAxis,
                low: 0,
                high: cumulativeVesting[cumulativeVesting.length - 1],
                ticks: cumulativeVesting,
              },
              axisX: {
                ticks: vestingDates,
              },
              lineSmooth: Interpolation.step(),
              height: 400,
            } as IChartOptions
          }
          type={'Line'}
        />
      </CardContent>
    </Card>
  );
}

// TODO: locale format without minutes, hours, seconds?
function formatDate(d: Date): string {
  return `${d.getMonth()+1}/${d.getDate()}/${d.getFullYear()}`;
}

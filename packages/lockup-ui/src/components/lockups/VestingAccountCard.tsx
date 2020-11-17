import React, { useState, useEffect } from 'react';
import ChartistGraph from 'react-chartist';
import BN from 'bn.js';
import { useSnackbar } from 'notistack';
import { FixedScaleAxis, IChartOptions, Interpolation } from 'chartist';
import CircularProgress from '@material-ui/core/CircularProgress';
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import Button from '@material-ui/core/Button';
import Typography from '@material-ui/core/Typography';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import Link from '@material-ui/core/Link';
import { accounts } from '@project-serum/lockup';
import { Network } from '@project-serum/common';
import { PublicKey } from '@solana/web3.js';
import { ProgramAccount } from '../../store/reducer';
import { useWallet } from '../common/WalletProvider';
import OwnedTokenAccountsSelect from '../../components/common/OwnedTokenAccountsSelect';
import { withTx } from '../../components/common/Notification';

type VestingAccountCardProps = {
  network: Network;
  vesting: ProgramAccount<accounts.Vesting>;
};

export default function VestingAccountCard(props: VestingAccountCardProps) {
  const { vesting, network } = props;
  const { lockupClient } = useWallet();
  const { enqueueSnackbar } = useSnackbar();

  const currencyLabel = vesting.account.mint.equals(network.srm)
    ? 'SRM'
    : vesting.account.mint.equals(network.msrm)
    ? 'MSRM'
    : vesting.account.mint.toString();

  const startTs = vesting.account.startTs;
  const endTs = vesting.account.endTs;

  const tsOverflow = endTs.sub(startTs).mod(vesting.account.periodCount);
  const shiftedStartTs = startTs.sub(tsOverflow);

  const period = endTs.sub(shiftedStartTs).div(vesting.account.periodCount);

  // Make the horizontal axis evenly spaced.
  //
  // Vesting dates assuming we stretch the start date back in time (so that the
  // periods are of even length).
  const vestingDates = [
    ...Array(vesting.account.periodCount.toNumber() + 1),
  ].map((_, idx) => {
    return formatDate(
      new Date((shiftedStartTs.toNumber() + idx * period.toNumber()) * 1000),
    );
  });
  // Now push the start window forward to the real start date, making the first period shorter.
  vestingDates[0] = formatDate(new Date(startTs.toNumber() * 1000));

  // Now do the same thing on the vertical axis.
  const rewardOverflow = vesting.account.startBalance.mod(
    vesting.account.periodCount,
  );
  const rewardPerPeriod = vesting.account.startBalance
    .sub(rewardOverflow)
    .div(vesting.account.periodCount)
    .toNumber();
  const cumulativeVesting = [...Array(vestingDates.length)].map(() => 0);
  cumulativeVesting[1] = rewardPerPeriod + rewardOverflow.toNumber();
  for (let k = 2; k < cumulativeVesting.length; k += 1) {
    cumulativeVesting[k] = cumulativeVesting[k - 1] + rewardPerPeriod;
  }

  const startLabel = formatDate(
    new Date(vesting.account.startTs.toNumber() * 1000),
  );
  const endLabel = formatDate(
    new Date(vesting.account.endTs.toNumber() * 1000),
  );
  const urlSuffix = `?cluster=${network.explorerClusterSuffix}`;

  const [
    availableForWithdrawal,
    setAvailableForWithdrawal,
  ] = useState<null | BN>(null);
  const [withdrawalAccount, setWithdrawalAccount] = useState<null | PublicKey>(
    null,
  );

  useEffect(() => {
    lockupClient.accounts
      .availableForWithdrawal(vesting.publicKey)
      .then(amount => {
        setAvailableForWithdrawal(amount);
      })
      .catch(err => {
        enqueueSnackbar(
          `Error fetching available for withdrawal: ${err.toString()}`,
          {
            variant: 'error',
          },
        );
      });
  }, [lockupClient.accounts, vesting, enqueueSnackbar]);
  const snack = useSnackbar();

  const withdrawEnabled =
    withdrawalAccount !== null &&
    availableForWithdrawal !== null &&
    availableForWithdrawal.gtn(0);
  const withdraw = async () => {
    await withTx(
      snack,
      'Withdrawing locked tokens',
      'Tokens unlocked',
      async () => {
        const { tx } = await lockupClient.withdraw({
          amount: availableForWithdrawal!,
          vesting: vesting.publicKey,
          tokenAccount: withdrawalAccount!,
        });
        return tx;
      },
    );
  };

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
              secondary={`${startLabel}, ${endLabel} | ${vesting.account.periodCount.toNumber()} periods`}
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
                {`${vesting.account.outstanding.toNumber()} ${currencyLabel}`}
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
        <div>
          <Typography>
            Available for withdrawal:{' '}
            {availableForWithdrawal === null ? (
              <CircularProgress />
            ) : (
              availableForWithdrawal.toString()
            )}
          </Typography>
          <Typography>
            Locked outstanding: {vesting.account.outstanding.toString()}
          </Typography>
          <Typography>
            Current balance:{' '}
            {vesting.account.outstanding
              .sub(vesting.account.whitelistOwned)
              .toString()}
          </Typography>
          <Typography>
            Initial lockup: {vesting.account.startBalance.toString()}
          </Typography>
          <Typography>
            Whitelist owned: {vesting.account.whitelistOwned.toString()}
          </Typography>
          <Typography>Vault: {vesting.account.vault.toString()}</Typography>
          <Typography>
            Start timestamp: {vesting.account.startTs.toString()}
          </Typography>
          <Typography>
            End timestamp: {vesting.account.endTs.toString()}
          </Typography>
          <div style={{ marginTop: '10px' }}>
            <OwnedTokenAccountsSelect
              mint={vesting.account.mint}
              onChange={(f: PublicKey) => setWithdrawalAccount(f)}
            />
            <div style={{ marginTop: '10px' }}>
              <Button
                color="primary"
                disabled={!withdrawEnabled}
                variant="contained"
                onClick={() =>
                  withdraw().catch(err => {
                    enqueueSnackbar(
                      `Error withdrawing from vesting account: ${err.toString()}`,
                      {
                        variant: 'error',
                      },
                    );
                  })
                }
              >
                Withdraw
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
      <div
        style={{
          display: 'flex',
          flexDirection: 'row-reverse',
          marginBottom: '16px',
          marginRight: '16px',
        }}
      >
        <Typography color="textSecondary">
          Granted by {vesting.account.grantor.toString()}
        </Typography>
      </div>
    </Card>
  );
}

// TODO: locale format without minutes, hours, seconds?
function formatDate(d: Date): string {
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

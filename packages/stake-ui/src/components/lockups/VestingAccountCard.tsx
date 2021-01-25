import React, { useState, useEffect } from 'react';
import ChartistGraph from 'react-chartist';
import { useDispatch, useSelector } from 'react-redux';
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
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableRow from '@material-ui/core/TableRow';
import { PublicKey, SYSVAR_CLOCK_PUBKEY } from '@solana/web3.js';
import { TokenInstructions } from '@project-serum/serum';
import { ProgramAccount, State as StoreState } from '../../store/reducer';
import { Network } from '../../store/config';
import { useWallet } from '../common/WalletProvider';
import OwnedTokenAccountsSelect from '../../components/common/OwnedTokenAccountsSelect';
import { withTx } from '../../components/common/Notification';
import { ActionType } from '../../store/actions';
import { toDisplay, toDisplayLabel } from '../../utils/tokens';
import {
  vestingSigner,
  availableForWithdrawal as _availableForWithdrawal,
} from '../../utils/lockup';

type VestingAccountCardProps = {
  network: Network;
  vesting: ProgramAccount;
};

export default function VestingAccountCard(props: VestingAccountCardProps) {
  const { vesting, network } = props;
  const { lockupClient } = useWallet();
  const { enqueueSnackbar } = useSnackbar();
  const dispatch = useDispatch();
  const { accounts } = useSelector((state: StoreState) => {
    return {
      network: state.common.network,
      accounts: state.accounts,
    };
  });

  // Whitelisted mints only for now.
  const isCustomMint = false;

  let mint = accounts[vesting.account.mint.toString()];
  const displayFn = mint
    ? (input: BN) => {
        return toDisplay(input, mint.decimals);
      }
    : (input: BN) => input.toString();

  const outstandingLabel = `${displayFn(
    vesting.account.outstanding,
  )} ${toDisplayLabel(vesting.account.mint)}`;
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
    _availableForWithdrawal(lockupClient, vesting.publicKey)
      .then((amount: BN) => {
        setAvailableForWithdrawal(amount);
      })
      .catch((err: any) => {
        console.error(err);
        enqueueSnackbar(
          `Error fetching available for withdrawal: ${err.toString()}`,
          {
            variant: 'error',
          },
        );
      });
  }, [lockupClient, vesting, enqueueSnackbar]);
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
        const tx = await lockupClient.rpc.withdraw(availableForWithdrawal!, {
          accounts: {
            vesting: vesting.publicKey,
            beneficiary: lockupClient.provider.wallet.publicKey,
            token: withdrawalAccount!,
            vault: vesting.account.vault,
            vestingSigner: (
              await vestingSigner(lockupClient.programId, vesting.publicKey)
            ).publicKey,
            tokenProgram: TokenInstructions.TOKEN_PROGRAM_ID,
            clock: SYSVAR_CLOCK_PUBKEY,
          },
        });
        const newVesting = await lockupClient.account.vesting(
          vesting.publicKey,
        );
        dispatch({
          type: ActionType.LockupUpdateVesting,
          item: {
            vesting: {
              publicKey: vesting.publicKey,
              account: newVesting,
            },
          },
        });
        return tx;
      },
    );
  };

  const rows = [
    {
      field: 'Available for unlock',
      value:
        availableForWithdrawal === null
          ? null
          : displayFn(availableForWithdrawal!),
    },
    {
      field: 'Locked outstanding',
      value: displayFn(vesting.account.outstanding),
    },
    {
      field: 'Current balance',
      value: displayFn(
        vesting.account.outstanding.sub(vesting.account.whitelistOwned),
      ),
    },
    { field: 'Initial lockup', value: displayFn(vesting.account.startBalance) },
    {
      field: 'Amount unlocked',
      value: displayFn(
        vesting.account.startBalance.sub(vesting.account.outstanding),
      ),
    },
    {
      field: 'Whitelist owned',
      value: displayFn(vesting.account.whitelistOwned),
    },
    { field: 'Period count', value: vesting.account.periodCount.toString() },
    { field: 'Vault', value: vesting.account.vault.toString() },
    {
      field: 'Start timestamp',
      value: `${new Date(
        vesting.account.startTs.toNumber() * 1000,
      ).toLocaleString()} (${vesting.account.startTs.toString()})`,
    },
    {
      field: 'End timestamp',
      value: `${new Date(
        vesting.account.endTs.toNumber() * 1000,
      ).toLocaleString()} (${vesting.account.endTs.toString()})`,
    },
  ];

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
                maxWidth: '400px',
                marginTop: '6px',
                color: 'rgba(0, 0, 0, 0.54)',
                display: 'flex',
                justifyContent: 'space-between',
                flexDirection: 'column',
              }}
            >
              <Typography
                style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}
                variant="body1"
              >
                {outstandingLabel}
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
          {isCustomMint && (
            <div
              style={{
                padding: '15px',
              }}
            >
              <b>
                Note: custom mints (i.e. not SRM/MSRM) display raw token amounts
                without decimals.
              </b>
            </div>
          )}
          <Table>
            <TableBody>
              {rows.map(r => {
                return (
                  <TableRow>
                    <TableCell>{r.field}</TableCell>
                    <TableCell align="right">
                      {r.value === null ? (
                        <CircularProgress
                          style={{ height: '20px', width: '20px', padding: 0 }}
                        />
                      ) : (
                        r.value
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <div style={{ display: 'flex', marginTop: '15px' }}>
            <OwnedTokenAccountsSelect
              mint={vesting.account.mint}
              onChange={(f: PublicKey) => setWithdrawalAccount(f)}
            />
            <div style={{ marginLeft: '20px', width: '191px' }}>
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
                Unlock tokens
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

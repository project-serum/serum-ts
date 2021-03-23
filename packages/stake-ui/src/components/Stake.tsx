import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import BN from 'bn.js';
import { useSnackbar } from 'notistack';
import {
  Account,
  SYSVAR_RENT_PUBKEY,
  SYSVAR_CLOCK_PUBKEY,
} from '@solana/web3.js';
import Table from '@material-ui/core/Table';
import TableHead from '@material-ui/core/TableHead';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableRow from '@material-ui/core/TableRow';
import CircularProgress from '@material-ui/core/CircularProgress';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Switch from '@material-ui/core/Switch';
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import IconButton from '@material-ui/core/IconButton';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import CardHeader from '@material-ui/core/CardHeader';
import FormControl from '@material-ui/core/FormControl';
import Typography from '@material-ui/core/Typography';
import { u64 } from '@solana/spl-token';
import { TokenInstructions } from '@project-serum/serum';
import { useWallet } from '../components/common/WalletProvider';
import { ViewTransactionOnExplorerButton } from '../components/common/Notification';
import { State as StoreState, ProgramAccount } from '../store/reducer';
import { ActionType } from '../store/actions';
import * as skin from '../skin';
import { toDisplay, toDisplayLabel } from '../utils/tokens';
import { memberSigner, registrarSigner } from '../utils/registry';

export default function Stake() {
  const { registryClient } = useWallet();
  const dispatch = useDispatch();
  const { member, memberAccount, registrarAccount, registrar } = useSelector(
    (state: StoreState) => {
      const registrarAccount =
        state.accounts[state.registry.registrar.toString()];
      return {
        member: state.registry.member,
        memberAccount: state.registry.member
          ? state.accounts[state.registry.member.toString()]
          : undefined,
        registrarAccount: registrarAccount,
        registrar: state.registry.registrar,
      };
    },
  );

  const { enqueueSnackbar, closeSnackbar } = useSnackbar();

  const createPoolTokens = async (amount: number, isLocked: boolean) => {
    enqueueSnackbar(
      `Staking ${toDisplayLabel(registrarAccount.poolMint)} Pool tokens`,
      {
        variant: 'info',
      },
    );

    const tx = await registryClient.rpc.stake(new u64(amount), isLocked, {
      accounts: {
        registrar,
        rewardEventQ: registrarAccount.rewardEventQ,
        poolMint: registrarAccount.poolMint,
        member,
        beneficiary: registryClient.provider.wallet.publicKey,
        balances: memberAccount.balances,
        balancesLocked: memberAccount.balancesLocked,
        memberSigner: (
          await memberSigner(registryClient.programId, registrar, member!)
        ).publicKey,
        registrarSigner: (
          await registrarSigner(registryClient.programId, registrar)
        ).publicKey,
        clock: SYSVAR_CLOCK_PUBKEY,
        tokenProgram: TokenInstructions.TOKEN_PROGRAM_ID,
      },
    });
    closeSnackbar();
    enqueueSnackbar(`Staking complete`, {
      variant: 'success',
      action: <ViewTransactionOnExplorerButton signature={tx} />,
    });
  };

  const redeemPoolTokens = async (amount: number, isLocked: boolean) => {
    enqueueSnackbar(
      `Unstaking ${amount} ${toDisplayLabel(
        registrarAccount.poolMint,
      )} Pool tokens`,
      {
        variant: 'info',
      },
    );

    const pendingWithdrawal = new Account();
    const tx = await registryClient.rpc.startUnstake(
      new u64(amount),
      isLocked,
      {
        accounts: {
          registrar,
          rewardEventQ: registrarAccount.rewardEventQ,
          poolMint: registrarAccount.poolMint,

          pendingWithdrawal: pendingWithdrawal.publicKey,
          member,
          beneficiary: registryClient.provider.wallet.publicKey,
          balances: memberAccount.balances,
          balancesLocked: memberAccount.balancesLocked,

          memberSigner: (
            await memberSigner(registryClient.programId, registrar, member!)
          ).publicKey,

          tokenProgram: TokenInstructions.TOKEN_PROGRAM_ID,
          clock: SYSVAR_CLOCK_PUBKEY,
          rent: SYSVAR_RENT_PUBKEY,
        },
        signers: [pendingWithdrawal],
        instructions: [
          await registryClient.account.pendingWithdrawal.createInstruction(
            pendingWithdrawal,
          ),
        ],
      },
    );
    const pwAccount = await registryClient.account.pendingWithdrawal(
      pendingWithdrawal.publicKey,
    );
    dispatch({
      type: ActionType.RegistryCreatePendingWithdrawal,
      item: {
        pendingWithdrawal: {
          publicKey: pendingWithdrawal.publicKey,
          account: pwAccount,
        },
      },
    });
    closeSnackbar();
    enqueueSnackbar(`Stake transfer initiated`, {
      variant: 'success',
      action: <ViewTransactionOnExplorerButton signature={tx} />,
    });
  };

  const createPool = async (shares: number, isLocked: boolean) => {
    if (shares > 0) {
      createPoolTokens(shares, isLocked).catch(err => {
        console.error(err);
        enqueueSnackbar(`Error staking: ${err.toString()}`, {
          variant: 'error',
        });
      });
    }
  };
  const redeemPool = async (shares: number, isLocked: boolean) => {
    if (shares > 0) {
      redeemPoolTokens(shares, isLocked).catch(err => {
        console.error(err);
        enqueueSnackbar(`Error unstaking: ${err.toString()}`, {
          variant: 'error',
        });
      });
    }
  };

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', width: '100%' }}>
        <div style={{ flex: 1, marginTop: '24px', marginBottom: '24px' }}>
          <PoolCard
            title={'Stake Pool'}
            create={createPool}
            redeem={redeemPool}
          />
        </div>
        <RedemptionList
          style={{
            marginBottom: '24px',
          }}
        />
      </div>
      <AllPendingTransfers />
    </div>
  );
}

type PoolCardProps = {
  title: string;
  create: (shares: number, isLocked: boolean) => void;
  redeem: (shares: number, isLocked: boolean) => void;
};

function PoolCard(props: PoolCardProps) {
  const { title, create, redeem } = props;
  const [poolAmount, setPoolAmount] = useState<null | number>(null);
  const [isLocked, setIsLocked] = useState(false);
  const { poolTokenMint, member, registrarAccount, mint } = useSelector(
    (state: StoreState) => {
      const registrarAccount =
        state.accounts[state.registry.registrar.toString()];
      const poolTokenMint = {
        publicKey: registrarAccount.poolMint,
        account: state.accounts[registrarAccount.poolMint.toString()],
      };
      return {
        poolTokenMint,
        member: state.registry.member,
        registrarAccount,
        mint: {
          publicKey: registrarAccount.mint,
          account: state.accounts[registrarAccount.mint.toString()],
        },
      };
    },
  );

  const pricePerShare = toDisplay(
    registrarAccount.stakeRate,
    mint.account.decimals,
  );

  const cost = poolAmount
    ? toDisplay(
        registrarAccount.stakeRate.mul(new BN(poolAmount)),
        mint.account.decimals,
      )
    : 0;
  return (
    <Card
      style={{
        marginBottom: '24px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <CardHeader
          title={title}
          subheader={poolTokenMint.publicKey.toString()}
        />
        <div
          style={{
            paddingRight: '16px',
            display: 'flex',
            justifyContent: 'center',
            flexDirection: 'column',
          }}
        >
          <Typography color="textSecondary"></Typography>
        </div>
      </div>
      <CardContent>
        <div
          style={{
            marginBottom: '16px',
          }}
        >
          <Typography>
            Please enter the amount of pool tokens you would like to purchase in
            the form below. Upon pressing <b>stake</b> you will create new pool
            tokens at a fixed price, adding to the amount of pool tokens
            outstanding.
          </Typography>
          <br />
          <Typography>
            Unstaking works similarly, except one must incur an unbonding period
            where funds will be not be able to be retrieved until the unbonding
            period ends. At the end of the unbonding period, click the blue
            checkbox next to your pending transfer. If the checkbox is grey,
            your unbonding period has not yet completed.
          </Typography>
          <br />
          <Typography style={{ fontWeight: 'bold' }}>
            Total pool tokens outstanding
          </Typography>
          <Typography>{poolTokenMint.account.supply.toString()}</Typography>
          <Typography style={{ fontWeight: 'bold' }}>
            Price per pool token
          </Typography>
          <Typography>{pricePerShare.toString()}</Typography>
          <Typography style={{ fontWeight: 'bold' }}>
            Your total cost
          </Typography>
          <Typography>
            {cost} {toDisplayLabel(mint.publicKey)}
          </Typography>
          <Typography style={{ fontWeight: 'bold' }}>
            Unbonding period (days)
          </Typography>
          <Typography>
            {(
              registrarAccount.withdrawalTimelock /
              (60 * 60 * 24.0)
            ).toString()}
          </Typography>
        </div>
        <div>
          <div style={{ marginBottom: '10px' }}>
            <FormControl>
              <TextField
                style={{ width: '100%' }}
                label="Pool tokens"
                type="number"
                variant="outlined"
                onChange={e => setPoolAmount(parseInt(e.target.value))}
              />
            </FormControl>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <Button
                disabled={member === undefined}
                color="primary"
                variant="contained"
                onClick={() => create(poolAmount as number, isLocked)}
              >
                Stake
              </Button>
              <Button
                disabled={member === undefined}
                color="secondary"
                variant="contained"
                style={{ marginLeft: '10px' }}
                onClick={() => redeem(poolAmount as number, isLocked)}
              >
                Unstake
              </Button>
            </div>
            <div>
              <FormControlLabel
                control={
                  <Switch
                    checked={isLocked}
                    onChange={() => setIsLocked(!isLocked)}
                  />
                }
                labelPlacement={'start'}
                label="Locked balances"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

type RedemptionListProps = {
  style: any;
};

function RedemptionList(props: RedemptionListProps) {
  const { registryClient } = useWallet();
  const dispatch = useDispatch();
  const { member, registrar, mint, pendingWithdrawals } = useSelector(
    (state: StoreState) => {
      const member = state.registry.member
        ? {
            publicKey: state.registry.member,
            account: state.accounts[state.registry.member.toString()],
          }
        : undefined;
      const registrar = {
        publicKey: state.registry.registrar!,
        account: state.accounts[state.registry.registrar.toString()],
      };
      const mint = {
        publicKey: registrar.account.mint,
        account: state.accounts[registrar.account.mint.toString()],
      };
      const pendingWithdrawals =
        state.registry.pendingWithdrawals === null
          ? null
          : state.registry.pendingWithdrawals.map(pw => {
              return {
                publicKey: pw,
                account: state.accounts[pw.toString()],
              };
            });
      return {
        member,
        registrar,
        mint,
        pendingWithdrawals,
      };
    },
  );

  useEffect(() => {
    if (!member) {
      return;
    }
    if (pendingWithdrawals !== null) {
      return;
    }

    // Only grab pending withdrawals for the current member account.
    const filter = Buffer.concat([
      registrar.publicKey.toBuffer(),
      member.publicKey.toBuffer(),
    ]);
    registryClient.account.pendingWithdrawal
      .all(filter)
      .then(pendingWithdrawals => {
        dispatch({
          type: ActionType.RegistrySetPendingWithdrawals,
          item: {
            pendingWithdrawals,
          },
        });
      });
  }, [
    dispatch,
    registrar,
    member,
    pendingWithdrawals,
    registryClient.account.pendingWithdrawal,
  ]);

  return (
    <div style={props.style}>
      <Card
        style={{
          marginLeft: '20px',
          marginTop: '24px',
          width: '294px',
        }}
      >
        <CardContent
          style={{
            paddingLeft: 0,
            paddingRight: 0,
            paddingBottom: 0,
            paddingTop: 0,
          }}
        >
          <div
            style={{
              marginLeft: '24px',
              marginTop: '24px',
              marginRight: '24px',
              borderBottom: 'solid 1pt #ccc',
              paddingBottom: '12px',
            }}
          >
            <Typography style={{}}>Your Pending Transfers</Typography>
            <Typography style={{ fontSize: '12px' }} color="textSecondary">
              Click the checkmark to complete a transfer on or after the "end"
              date.
            </Typography>
          </div>
          <div style={{ paddingLeft: '24px', paddingRight: '24px' }}>
            {member && pendingWithdrawals === null ? (
              <div style={{ paddingTop: '24px', marginBottom: '24px' }}>
                <CircularProgress
                  style={{
                    display: 'block',
                    marginLeft: 'auto',
                    marginRight: 'auto',
                  }}
                />
              </div>
            ) : pendingWithdrawals !== null && pendingWithdrawals.length > 0 ? (
              pendingWithdrawals.map((pw, idx) => {
                return (
                  <PendingStakeListItem
                    key={pw.publicKey.toString()}
                    isLast={idx === pendingWithdrawals.length - 1}
                    registrar={registrar}
                    pw={pw}
                    member={member!}
                    mint={mint}
                  />
                );
              })
            ) : (
              <div
                style={{
                  paddingBottom: '24px',
                  paddingTop: '12px',
                }}
              >
                <Typography color="textSecondary" style={{ fontSize: '14px' }}>
                  None found
                </Typography>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

type PendingStakeListItemProps = {
  isLast?: boolean;
  registrar: ProgramAccount;
  pw: ProgramAccount;
  member: ProgramAccount;
  mint: ProgramAccount;
};

function PendingStakeListItem(props: PendingStakeListItemProps) {
  const { isLast, pw, member, registrar, mint } = props;
  const sptLabel = (() => {
    const isLocked = pw.account.locked;
    const l = isLocked ? '(locked)' : '';
    return `${toDisplay(
      pw.account.amount,
      mint.account.decimals,
    )} ${toDisplayLabel(mint.publicKey)} ${l}`;
  })();
  return (
    <div
      style={{
        paddingBottom: !isLast ? '12px' : '24px',
        paddingTop: '12px',
        borderBottom: 'solid 1pt #ccc',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          overflow: 'hidden',
        }}
      >
        <div>
          <Typography
            style={{
              whiteSpace: 'pre',
              maxWidth: '195px',
              overflow: 'hidden',
              fontWeight: 'bold',
              fontSize: '14px',
            }}
          >
            {`${sptLabel}`}
          </Typography>
        </div>
        <div>
          <PendingWithdrawalButton
            registrar={registrar}
            member={member}
            pendingWithdrawal={pw}
          />
        </div>
      </div>
      <Typography style={{ fontSize: '14px' }}>
        {`Start: ${new Date(
          pw.account.startTs.toNumber() * 1000,
        ).toLocaleString()}`}
      </Typography>
      <Typography style={{ fontSize: '14px' }}>
        {`End:   ${new Date(
          pw.account.endTs.toNumber() * 1000,
        ).toLocaleString()}`}
      </Typography>
      <Typography
        color="textSecondary"
        style={{
          fontSize: '14px',
          overflow: 'hidden',
        }}
      >
        {pw.account.pool.toString()}
      </Typography>
    </div>
  );
}

type PendingWithdrawalButtonProps = {
  registrar: ProgramAccount;
  pendingWithdrawal: ProgramAccount;
  member: ProgramAccount;
};

function PendingWithdrawalButton(props: PendingWithdrawalButtonProps) {
  const { pendingWithdrawal, member, registrar } = props;
  const { registryClient } = useWallet();
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();
  const dispatch = useDispatch();

  const endPendingWithdrawal = async () => {
    enqueueSnackbar(`Completing redemption`, {
      variant: 'info',
    });
    const balances = pendingWithdrawal.account.locked
      ? member.account.balancesLocked
      : member.account.balances;
    const tx = await registryClient.rpc.endUnstake({
      accounts: {
        registrar: registrar.publicKey,
        member: member.publicKey,
        beneficiary: registryClient.provider.wallet.publicKey,
        pendingWithdrawal: pendingWithdrawal.publicKey,
        vault: balances.vault,
        vaultPw: balances.vaultPw,
        memberSigner: (
          await memberSigner(
            registryClient.programId,
            registrar.publicKey,
            member.publicKey,
          )
        ).publicKey,
        clock: SYSVAR_CLOCK_PUBKEY,
        tokenProgram: TokenInstructions.TOKEN_PROGRAM_ID,
      },
    });

    const updatedPendingWithdrawal = {
      publicKey: pendingWithdrawal.publicKey,
      account: {
        ...pendingWithdrawal.account,
        burned: true,
      },
    };

    dispatch({
      type: ActionType.RegistryUpdatePendingWithdrawal,
      item: {
        pendingWithdrawal: updatedPendingWithdrawal,
      },
    });

    closeSnackbar();
    enqueueSnackbar(`Stake transfer completed`, {
      variant: 'success',
      action: <ViewTransactionOnExplorerButton signature={tx} />,
    });
  };

  let disabled = false;
  let color = skin.instance().ready;
  let onClick = async () =>
    endPendingWithdrawal().catch(err => {
      console.error(`Error completing transfer: ${err.toString()}`);
      enqueueSnackbar(
        `Error completing transfer. Wait for the transfer's timelock to end and try again.`,
        {
          variant: 'error',
        },
      );
    });
  if (pendingWithdrawal.account.burned) {
    disabled = true;
    color = skin.instance().active;
    onClick = async () => {};
  }

  if (pendingWithdrawal.account.endTs.toNumber() > Date.now() / 1000) {
    disabled = true;
    color = skin.instance().notReady;
    onClick = async () => {};
  }

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        justifyContent: 'center',
        flexDirection: 'column',
      }}
    >
      <IconButton disabled={disabled} style={{ width: '25px', height: '25px' }}>
        <CheckCircleIcon style={{ color, fontSize: '20px' }} />
      </IconButton>
    </div>
  );
}

function AllPendingTransfers() {
  const { registryClient } = useWallet();
  const { registrar, registrarAccount, mintAccount } = useSelector(
    (state: StoreState) => {
      const registrarAccount =
        state.accounts[state.registry.registrar.toString()];
      return {
        registrar: state.registry.registrar,
        registrarAccount,
        mintAccount: state.accounts[registrarAccount.mint.toString()],
      };
    },
  );
  const [pendingTransfers, setPendingTransfers] = useState<null | any>(null);
  useEffect(() => {
    const fetchAll = async () => {
      let transfers = await registryClient.account.pendingWithdrawal.all(
        registrar.toBuffer(),
      );
      transfers = transfers
        .filter((pw: any) => pw.account.burned === false)
        .sort((a, b) => {
          if (a.account.startTs < b.account.startTs) {
            return 1;
          } else if (a.account.startTs > b.account.startTs) {
            return -1;
          } else {
            return 0;
          }
        });
      setPendingTransfers(transfers);
    };
    fetchAll();
  }, [registryClient, registrar]);

  return (
    <Card style={{ maxHeight: '900px', overflow: 'auto' }}>
      <Typography
        variant="h5"
        style={{ padding: '16px', borderBottom: 'solid 1pt #ccc' }}
      >
        All pending transfers
      </Typography>
      {pendingTransfers !== null ? (
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Member Account</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>Pool</TableCell>
              <TableCell>Locked</TableCell>
              <TableCell>Start</TableCell>
              <TableCell>End</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pendingTransfers.map((pw: any) => (
              <TableRow>
                <TableCell>{pw.account.member.toString()}</TableCell>
                <TableCell>
                  {toDisplay(
                    pw.account.amount.toString(),
                    mintAccount.decimals,
                  )}
                </TableCell>
                <TableCell>
                  {pw.account.amount.div(registrarAccount.stakeRate).toString()}
                </TableCell>
                <TableCell>{pw.account.locked.toString()}</TableCell>
                <TableCell>
                  {new Date(pw.account.startTs.toNumber() * 1000).toString()}
                </TableCell>
                <TableCell>
                  {new Date(pw.account.endTs.toNumber() * 1000).toString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div style={{ padding: '24px' }}>
          <CircularProgress
            style={{
              display: 'block',
              marginLeft: 'auto',
              marginRight: 'auto',
            }}
          />
        </div>
      )}
    </Card>
  );
}

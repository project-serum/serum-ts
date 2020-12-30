import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import BN from 'bn.js';
import { useSnackbar } from 'notistack';
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
import { accounts } from '@project-serum/registry';
import { useWallet } from '../components/common/WalletProvider';
import { ViewTransactionOnExplorerButton } from '../components/common/Notification';
import { State as StoreState, ProgramAccount } from '../store/reducer';
import { ActionType } from '../store/actions';
import * as skin from '../skin';
import { displaySrm, displayMsrm } from '../utils/tokens';
import * as error from '../utils/errors';

export default function Stake() {
  const { registryClient } = useWallet();
  const dispatch = useDispatch();
  const { member, registrar } = useSelector((state: StoreState) => {
    return {
      poolTokenMint: state.registry.poolTokenMint,
      megaPoolTokenMint: state.registry.megaPoolTokenMint,
      member: state.registry.member.data!,
      registrar: state.registry.registrar,
    };
  });

  const { enqueueSnackbar, closeSnackbar } = useSnackbar();

  const createPoolTokens = async (
    amount: number,
    label: string,
    isMega?: boolean,
    isLocked?: boolean,
  ) => {
    const balances = member.account.member.balances[isLocked ? 1 : 0];
    const balanceId = balances.owner;
    const spt = isMega ? balances.sptMega : balances.spt;

    enqueueSnackbar(`Staking ${label} Pool tokens`, {
      variant: 'info',
    });

    const { tx } = await registryClient.stake({
      member: {
        publicKey: member.publicKey,
        account: member.account.member,
      },
      amount: new u64(amount),
      spt,
      isMega,
      balanceId,
    });
    const updatedEntity = await registryClient.accounts.entity(
      member.account.member.entity,
    );
    dispatch({
      type: ActionType.RegistryUpdateEntity,
      item: {
        entity: {
          publicKey: member.account.member.entity,
          account: updatedEntity,
        },
      },
    });
    closeSnackbar();
    enqueueSnackbar(`Staking complete`, {
      variant: 'success',
      action: <ViewTransactionOnExplorerButton signature={tx} />,
    });
  };

  const redeemPoolTokens = async (
    amount: number,
    label: string,
    isMega?: boolean,
    isLocked?: boolean,
  ) => {
    enqueueSnackbar(`Unstaking ${amount} ${label} Pool tokens`, {
      variant: 'info',
    });
    const balances = member.account.member.balances[isLocked ? 1 : 0];
    const balanceId = balances.owner;
    const spt = isMega ? balances.sptMega : balances.spt;
    const { tx, pendingWithdrawal } = await registryClient.startStakeWithdrawal(
      {
        member: {
          publicKey: member.publicKey,
          account: member.account.member,
        },
        amount: new u64(amount),
        registrar: registrar!.account,
        spt,
        isMega,
        balanceId,
      },
    );
    const updatedEntity = await registryClient.accounts.entity(
      member.account.member.entity,
    );
    dispatch({
      type: ActionType.RegistryUpdateEntity,
      item: {
        entity: {
          publicKey: member.account.member.entity,
          account: updatedEntity,
        },
      },
    });
    const pwAccount = await registryClient.accounts.pendingWithdrawal(
      pendingWithdrawal,
    );
    dispatch({
      type: ActionType.RegistryCreatePendingWithdrawal,
      item: {
        memberPublicKey: member!.publicKey,
        pendingWithdrawal: {
          publicKey: pendingWithdrawal,
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

  const createSrmPool = async (shares: number, isLocked: boolean) => {
    if (shares > 0) {
      createPoolTokens(shares, 'SRM', false, isLocked).catch(err => {
        enqueueSnackbar(`Error staking srm pool: ${error.toDisplay(err)}`, {
          variant: 'error',
        });
      });
    }
  };
  const redeemSrmPool = async (shares: number, isLocked: boolean) => {
    if (shares > 0) {
      redeemPoolTokens(shares, 'SRM', false, isLocked).catch(err => {
        enqueueSnackbar(`Error unstaking SRM pool: ${error.toDisplay(err)}`, {
          variant: 'error',
        });
      });
    }
  };

  const createMsrmPool = async (shares: number, isLocked: boolean) => {
    if (shares > 0) {
      createPoolTokens(shares, 'MSRM', true, isLocked).catch(err => {
        enqueueSnackbar(`Error staking MSRM pool: ${error.toDisplay(err)}`, {
          variant: 'error',
        });
      });
    }
  };
  const redeemMsrmPool = async (shares: number, isLocked: boolean) => {
    if (shares > 0) {
      redeemPoolTokens(shares, 'MSRM', true, isLocked).catch(err => {
        enqueueSnackbar(`Error unstaking MSRM pool: ${error.toDisplay(err)}`, {
          variant: 'error',
        });
      });
    }
  };

  return (
    <div style={{ display: 'flex', width: '100%' }}>
      <div style={{ flex: 1, marginTop: '24px', marginBottom: '24px' }}>
        <PoolCard
          title={'Stake Pool'}
          create={createSrmPool}
          redeem={redeemSrmPool}
          isMega={false}
        />
        <PoolCard
          title={'Mega Stake Pool'}
          create={createMsrmPool}
          redeem={redeemMsrmPool}
          isMega={true}
        />
      </div>
      <RedemptionList
        style={{
          marginBottom: '24px',
        }}
      />
    </div>
  );
}

type PoolCardProps = {
  title: string;
  isMega: boolean;
  create: (shares: number, isLocked: boolean) => void;
  redeem: (shares: number, isLocked: boolean) => void;
};

function PoolCard(props: PoolCardProps) {
  const { title, create, redeem, isMega } = props;
  const [srmPoolAmount, setSrmPoolAmount] = useState<null | number>(null);
  const [isLocked, setIsLocked] = useState(false);
  const { enqueueSnackbar } = useSnackbar();
  const { poolTokenMint, member, entity, registrar } = useSelector(
    (state: StoreState) => {
      const member = state.registry.member.data!;
      return {
        poolTokenMint: isMega
          ? state.registry.megaPoolTokenMint!
          : state.registry.poolTokenMint!,
        member,
        registrar: state.registry.registrar!,
        entity:
          member === undefined
            ? undefined
            : state.registry.entities
                .filter(e => e.publicKey.equals(member.account.member.entity))
                .pop(),
      };
    },
  );

  const pricePerShare = isMega
    ? displayMsrm(registrar.account.stakeRateMega) + ' MSRM'
    : displaySrm(registrar.account.stakeRate) + ' SRM';

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
          <Typography style={{ fontWeight: 'bold' }}>
            Total pool tokens outstanding
          </Typography>
          <Typography>{poolTokenMint.account.supply.toString()}</Typography>
          <Typography style={{ fontWeight: 'bold' }}>
            Price per pool token
          </Typography>
          <Typography>{pricePerShare}</Typography>
        </div>
        <div>
          <div style={{ marginBottom: '10px' }}>
            <FormControl>
              <TextField
                style={{ width: '100%' }}
                label="Pool tokens"
                type="number"
                variant="outlined"
                onChange={e => setSrmPoolAmount(parseInt(e.target.value))}
              />
            </FormControl>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <Button
                disabled={
                  member === undefined ||
                  srmPoolAmount === null ||
                  srmPoolAmount < 1
                }
                color="primary"
                variant="contained"
                onClick={() => {
                  let total = isLocked
                    ? isMega
                      ? member.account.balances[1].vaultMega.amount
                      : member.account.balances[1].vault.amount
                    : isMega
                    ? member.account.balances[0].vaultMega.amount
                    : member.account.balances[0].vault.amount;
                  let stakeRate = isMega
                    ? registrar.account.stakeRateMega
                    : registrar.account.stakeRate;

                  if (!isMega) {
                    if (entity?.account.state.active === undefined) {
                      // MSRM requirement is currently disabled on mainnet beta.
                      // Uncomment this once it's enabled.
                      //
                      // enqueueSnackbar('Entity not active. Please stake MSRM.', {
                      //  variant: 'error',
                      // });
                      // return;
                    }
                  }

                  // Don't send to the cluster if we know it will fail.
                  if (
                    total.lt(stakeRate.mul(new BN(srmPoolAmount as number)))
                  ) {
                    enqueueSnackbar(
                      'Insufficient available balance. Please deposit.',
                      {
                        variant: 'error',
                      },
                    );
                    return;
                  }

                  create(srmPoolAmount as number, isLocked);
                }}
              >
                Stake
              </Button>
              <Button
                disabled={
                  member === undefined ||
                  srmPoolAmount === null ||
                  srmPoolAmount < 1
                }
                color="secondary"
                variant="contained"
                style={{ marginLeft: '10px' }}
                onClick={() => {
                  let currentPoolTokens = isLocked
                    ? isMega
                      ? member.account.balances[1].sptMega.amount
                      : member.account.balances[1].spt.amount
                    : isMega
                    ? member.account.balances[0].sptMega.amount
                    : member.account.balances[0].spt.amount;

                  // Don't send to the cluster if we know it will fail.
                  let amount = new BN(srmPoolAmount as number);
                  if (currentPoolTokens.lt(amount)) {
                    enqueueSnackbar('Insufficient pool balance.', {
                      variant: 'error',
                    });
                    return;
                  }

                  redeem(srmPoolAmount as number, isLocked);
                }}
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
  const { pendingWithdrawals, member, registrar } = useSelector(
    (state: StoreState) => {
      const member = state.registry.member;
      return {
        member,
        registrar: state.registry.registrar!,
        pendingWithdrawals:
          member.isReady && member.data
            ? state.registry.pendingWithdrawals.get(
                member.data!.publicKey.toString(),
              )
            : [],
      };
    },
  );
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
            <Typography style={{}}>Pending Transfers</Typography>
            <Typography style={{ fontSize: '12px' }} color="textSecondary">
              Click the checkmark to complete a transfer on or after the "end"
              date.
            </Typography>
          </div>
          <div style={{ paddingLeft: '24px', paddingRight: '24px' }}>
            {pendingWithdrawals && pendingWithdrawals.length > 0 ? (
              pendingWithdrawals.map((pw, idx) => {
                return (
                  <PendingStakeListItem
                    key={pw.publicKey.toString()}
                    isLast={idx === pendingWithdrawals.length - 1}
                    registrar={registrar}
                    pw={pw}
                    member={member.data!}
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
  registrar: ProgramAccount<accounts.Registrar>;
  pw: ProgramAccount<accounts.PendingWithdrawal>;
  member: ProgramAccount<accounts.MemberDeref>;
};

function PendingStakeListItem(props: PendingStakeListItemProps) {
  const { isLast, pw, member, registrar } = props;
  const sptLabel = (() => {
    const isLocked = !pw.account.balanceId.equals(
      member.account.member.beneficiary,
    );
    const l = isLocked ? '(locked)' : '';
    if (pw.account.pool.equals(registrar.account.poolMint)) {
      return `${displaySrm(pw.account.amount)} SRM ${l}`;
    } else {
      return `${displayMsrm(pw.account.amount)} MSRM ${l}`;
    }
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
        }}
      >
        <div>
          <Typography style={{ fontWeight: 'bold', fontSize: '14px' }}>
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
  registrar: ProgramAccount<accounts.Registrar>;
  pendingWithdrawal: ProgramAccount<accounts.PendingWithdrawal>;
  member: ProgramAccount<accounts.MemberDeref>;
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
    const { tx } = await registryClient.endStakeWithdrawal({
      member: {
        publicKey: member.publicKey,
        account: member.account.member,
      },
      pendingWithdrawal,
      registrar: registrar.account,
    });

    const updatedPendingWithdrawal = {
      publicKey: pendingWithdrawal.publicKey,
      account: {
        ...pendingWithdrawal.account,
        burned: true,
      },
    };
    const updatedEntity = await registryClient.accounts.entity(
      member.account.member.entity,
    );
    dispatch({
      type: ActionType.RegistryUpdateEntity,
      item: {
        entity: {
          publicKey: member.account.member.entity,
          account: updatedEntity,
        },
      },
    });
    dispatch({
      type: ActionType.RegistryUpdatePendingWithdrawal,
      item: {
        memberPublicKey: member!.publicKey,
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

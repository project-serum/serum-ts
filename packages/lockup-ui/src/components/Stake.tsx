import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
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
import { MintInfo, u64 } from '@solana/spl-token';
import { accounts } from '@project-serum/registry';
import { useWallet } from '../components/common/WalletProvider';
import { ViewTransactionOnExplorerButton } from '../components/common/Notification';
import { State as StoreState, ProgramAccount } from '../store/reducer';
import { ActionType } from '../store/actions';
import * as skin from '../skin';
import { displaySrm, displayMsrm } from '../utils/tokens';

export default function Stake() {
  const { registryClient } = useWallet();
  const dispatch = useDispatch();
  const { poolTokenMint, megaPoolTokenMint, member, registrar } = useSelector(
    (state: StoreState) => {
      return {
        poolTokenMint: state.registry.poolTokenMint,
        megaPoolTokenMint: state.registry.megaPoolTokenMint,
        member: state.registry.member.data!,
        registrar: state.registry.registrar,
      };
    },
  );

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

    enqueueSnackbar(`Creating ${spt} ${label} Pool tokens`, {
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
    enqueueSnackbar(`Creation complete`, {
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
    enqueueSnackbar(
      `Initiating redemption for ${amount} ${label} Pool tokens`,
      {
        variant: 'info',
      },
    );
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
    enqueueSnackbar(`Pending redemption ${pendingWithdrawal.toString()}`, {
      variant: 'success',
      action: <ViewTransactionOnExplorerButton signature={tx} />,
    });
  };

  const createSrmPool = async (shares: number, isLocked: boolean) => {
    if (shares > 0) {
      createPoolTokens(shares, 'SRM', false, isLocked).catch(err => {
        enqueueSnackbar(`Error creating srm pool: ${err.toString()}`, {
          variant: 'error',
        });
      });
    }
  };
  const redeemSrmPool = async (shares: number, isLocked: boolean) => {
    if (shares > 0) {
      redeemPoolTokens(shares, 'SRM', false, isLocked).catch(err => {
        enqueueSnackbar(`Error redeeming srm pool: ${err.toString()}`, {
          variant: 'error',
        });
      });
    }
  };

  const createMsrmPool = async (shares: number, isLocked: boolean) => {
    if (shares > 0) {
      createPoolTokens(shares, 'MSRM', true, isLocked).catch(err => {
        enqueueSnackbar(`Error creating msrm pool: ${err.toString()}`, {
          variant: 'error',
        });
      });
    }
  };
  const redeemMsrmPool = async (shares: number, isLocked: boolean) => {
    if (shares > 0) {
      redeemPoolTokens(shares, 'MSRM', true, isLocked).catch(err => {
        enqueueSnackbar(`Error redeeming msrm pool: ${err.toString()}`, {
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
          poolTokenMint={poolTokenMint!}
          disabled={member === undefined}
          create={createSrmPool}
          redeem={redeemSrmPool}
          isMega={false}
          registrar={registrar!}
        />
        <PoolCard
          title={'Mega Stake Pool'}
          poolTokenMint={megaPoolTokenMint!}
          disabled={member === undefined}
          create={createMsrmPool}
          redeem={redeemMsrmPool}
          isMega={true}
          registrar={registrar!}
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
  poolTokenMint: ProgramAccount<MintInfo>;
  registrar: ProgramAccount<accounts.Registrar>;
  isMega: boolean;
  disabled: boolean;
  create: (shares: number, isLocked: boolean) => void;
  redeem: (shares: number, isLocked: boolean) => void;
};

function PoolCard(props: PoolCardProps) {
  const {
    title,
    create,
    redeem,
    poolTokenMint,
    disabled,
    registrar,
    isMega,
  } = props;
  const [srmPoolAmount, setSrmPoolAmount] = useState<null | number>(null);
  const [isLocked, setIsLocked] = useState(false);
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
            Total shares outstanding
          </Typography>
          <Typography>{poolTokenMint.account.supply.toString()}</Typography>
          <Typography style={{ fontWeight: 'bold' }}>
            Price per share
          </Typography>
          <Typography>{pricePerShare}</Typography>
        </div>
        <div>
          <div style={{ marginBottom: '10px' }}>
            <FormControl>
              <TextField
                style={{ width: '100%' }}
                label="Shares"
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
                  disabled || srmPoolAmount === null || srmPoolAmount < 1
                }
                color="primary"
                variant="contained"
                onClick={() => create(srmPoolAmount as number, isLocked)}
              >
                Stake
              </Button>
              <Button
                disabled={
                  disabled || srmPoolAmount === null || srmPoolAmount < 1
                }
                color="secondary"
                variant="contained"
                style={{ marginLeft: '10px' }}
                onClick={() => redeem(srmPoolAmount as number, isLocked)}
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
      enqueueSnackbar(`Error ending pending redemption: ${err.toString()}`, {
        variant: 'error',
      });
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

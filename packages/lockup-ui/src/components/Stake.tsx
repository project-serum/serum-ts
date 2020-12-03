import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useSnackbar } from 'notistack';
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import IconButton from '@material-ui/core/IconButton';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import CardHeader from '@material-ui/core/CardHeader';
import FormControl from '@material-ui/core/FormControl';
import Typography from '@material-ui/core/Typography';
import { MintInfo, AccountInfo as TokenAccount, u64 } from '@solana/spl-token';
import { PublicKey } from '@solana/web3.js';
import { accounts } from '@project-serum/registry';
import { useWallet } from '../components/common/WalletProvider';
import { ViewTransactionOnExplorerButton } from '../components/common/Notification';
import { State as StoreState, ProgramAccount } from '../store/reducer';
import { ActionType } from '../store/actions';
import * as skin from '../skin';

export default function Stake() {
  const { registryClient } = useWallet();
  const dispatch = useDispatch();
  const {
    poolTokenMint,
    poolVault,
    megaPoolTokenMint,
    megaPoolVault,
    member,
    registrar,
    entity,
  } = useSelector((state: StoreState) => {
    return {
      poolTokenMint: state.registry.poolTokenMint,
      poolVault: state.registry.poolVault,
      megaPoolTokenMint: state.registry.megaPoolTokenMint,
      megaPoolVault: state.registry.megaPoolVault,
      member: state.registry.member,
      registrar: state.registry.registrar,
      entity: state.registry.entities
        .filter(
          e =>
            state.registry.member &&
            e.publicKey.toString() ===
              state.registry.member!.account.entity.toString(),
        )
        .pop(),
    };
  });

  const { enqueueSnackbar, closeSnackbar } = useSnackbar();

  const createPoolTokens = async (
    amount: number,
    spt: PublicKey,
    label: string,
    isMega?: boolean,
  ) => {
    enqueueSnackbar(`Creating ${spt} ${label} Pool tokens`, {
      variant: 'info',
    });
    const { tx } = await registryClient.stake({
      member: member!.publicKey,
      amount: new u64(amount),
      entity: entity?.publicKey,
      spt,
      isMega,
    });
    const updatedMember = await registryClient.accounts.member(
      member!.publicKey,
    );
    dispatch({
      type: ActionType.RegistrySetMember,
      item: {
        member: {
          publicKey: member!.publicKey,
          account: updatedMember,
        },
      },
    });
    const updatedEntity = await registryClient.accounts.entity(
      entity!.publicKey,
    );
    dispatch({
      type: ActionType.RegistryUpdateEntity,
      item: {
        entity: {
          publicKey: entity!.publicKey,
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
    spt: PublicKey,
    label: string,
    isMega?: boolean,
  ) => {
    enqueueSnackbar(
      `Initiating redemption for ${amount} ${label} Pool tokens`,
      {
        variant: 'info',
      },
    );
    const { tx, pendingWithdrawal } = await registryClient.startStakeWithdrawal(
      {
        member: member!.publicKey,
        amount: new u64(amount),
        entity: entity?.publicKey,
        registrar: registrar!.account,
        spt,
        isMega,
      },
    );
    const updatedMember = await registryClient.accounts.member(
      member!.publicKey,
    );
    dispatch({
      type: ActionType.RegistrySetMember,
      item: {
        member: {
          publicKey: member!.publicKey,
          account: updatedMember,
        },
      },
    });
    const updatedEntity = await registryClient.accounts.entity(
      entity!.publicKey,
    );
    dispatch({
      type: ActionType.RegistryUpdateEntity,
      item: {
        entity: {
          publicKey: entity!.publicKey,
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

  const createSrmPool = async (shares: number) => {
    if (shares > 0) {
      createPoolTokens(shares, member!.account.spt, 'SRM').catch(err => {
        enqueueSnackbar(`Error creating srm pool: ${err.toString()}`, {
          variant: 'error',
        });
      });
    }
  };
  const redeemSrmPool = async (shares: number) => {
    if (shares > 0) {
      redeemPoolTokens(shares, member!.account.spt, 'SRM').catch(err => {
        enqueueSnackbar(`Error redeeming srm pool: ${err.toString()}`, {
          variant: 'error',
        });
      });
    }
  };

  const createMsrmPool = async (shares: number) => {
    if (shares > 0) {
      createPoolTokens(shares, member!.account.sptMega, 'MSRM', true).catch(
        err => {
          enqueueSnackbar(`Error creating msrm pool: ${err.toString()}`, {
            variant: 'error',
          });
        },
      );
    }
  };
  const redeemMsrmPool = async (shares: number) => {
    if (shares > 0) {
      redeemPoolTokens(shares, member!.account.sptMega, 'MSRM', true).catch(
        err => {
          enqueueSnackbar(`Error redeeming msrm pool: ${err.toString()}`, {
            variant: 'error',
          });
        },
      );
    }
  };

  return (
    <div style={{ display: 'flex', width: '100%' }}>
      <div style={{ flex: 1, marginTop: '24px', marginBottom: '24px' }}>
        <PoolCard
          title={'Stake Pool'}
          pool={poolVault!}
          poolTokenMint={poolTokenMint!}
          disabled={member === undefined}
          create={createSrmPool}
          redeem={redeemSrmPool}
        />
        <PoolCard
          title={'Mega Stake Pool'}
          pool={megaPoolVault!}
          poolTokenMint={megaPoolTokenMint!}
          disabled={member === undefined}
          create={createMsrmPool}
          redeem={redeemMsrmPool}
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
  pool: ProgramAccount<TokenAccount>;
  poolTokenMint: ProgramAccount<MintInfo>;
  disabled: boolean;
  create: (shares: number) => void;
  redeem: (shares: number) => void;
};

function PoolCard(props: PoolCardProps) {
  const { title, create, redeem, pool, poolTokenMint, disabled } = props;
  const [srmPoolAmount, setSrmPoolAmount] = useState<null | number>(null);

  return (
    <Card
      style={{
        marginBottom: '24px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <CardHeader title={title} subheader={pool.publicKey.toString()} />
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
          <Typography style={{ fontWeight: 'bold' }}>Pool Token</Typography>
          <Typography>Mint: {poolTokenMint.publicKey.toString()}</Typography>
          <Typography>
            Outstanding: {poolTokenMint.account.supply.toString()}
          </Typography>
        </div>
        <div style={{ width: '190px' }}>
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
          <div>
            <Button
              disabled={disabled || srmPoolAmount === null || srmPoolAmount < 1}
              color="primary"
              variant="contained"
              onClick={() => create(srmPoolAmount as number)}
            >
              Stake
            </Button>
            <Button
              disabled={disabled || srmPoolAmount === null || srmPoolAmount < 1}
              color="secondary"
              variant="contained"
              style={{ marginLeft: '10px' }}
              onClick={() => redeem(srmPoolAmount as number)}
            >
              Unstake
            </Button>
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
        pendingWithdrawals: member
          ? state.registry.pendingWithdrawals.get(member.publicKey.toString())
          : [],
      };
    },
  );
  const sptLabel = (poolVault: PublicKey): string => {
    if (poolVault === registrar.account.poolVault) {
      return 'SRM';
    } else {
      return 'MSRM';
    }
  };
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
            <Typography style={{}}>Redemptions</Typography>
          </div>
          <div style={{ paddingLeft: '24px', paddingRight: '24px' }}>
            {pendingWithdrawals && pendingWithdrawals.length > 0 ? (
              pendingWithdrawals.map((pw, idx) => {
                return (
                  <div
                    style={{
                      paddingBottom:
                        idx !== pendingWithdrawals!.length - 1
                          ? '12px'
                          : '24px',
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
                        <Typography
                          style={{ fontWeight: 'bold', fontSize: '14px' }}
                        >
                          {`${pw.account.sptAmount}`} shares
                        </Typography>
                      </div>
                      <div>
                        <PendingWithdrawalButton
                          member={member!}
                          pendingWithdrawal={pw}
                        />
                      </div>
                    </div>
                    <Typography style={{ fontSize: '14px' }}>
                      {`${pw.account.sptAmount} ${sptLabel(pw.account.pool)}`}
                    </Typography>
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

type PendingWithdrawalButtonProps = {
  pendingWithdrawal: ProgramAccount<accounts.PendingWithdrawal>;
  member: ProgramAccount<accounts.Member>;
};

function PendingWithdrawalButton(props: PendingWithdrawalButtonProps) {
  const { pendingWithdrawal, member } = props;
  const { registryClient } = useWallet();
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();
  const dispatch = useDispatch();

  const endPendingWithdrawal = async () => {
    enqueueSnackbar(`Completing redemption`, {
      variant: 'info',
    });
    const { tx } = await registryClient.endStakeWithdrawal({
      member: member.publicKey,
      pendingWithdrawal: pendingWithdrawal.publicKey,
      entity: member.account.entity,
    });

    const updatedPendingWithdrawal = {
      publicKey: pendingWithdrawal.publicKey,
      account: {
        ...pendingWithdrawal.account,
        burned: true,
      },
    };
    const updatedMember = await registryClient.accounts.member(
      member.publicKey,
    );
    const updatedEntity = await registryClient.accounts.entity(
      member.account.entity,
    );

    dispatch({
      type: ActionType.RegistrySetMember,
      item: {
        member: {
          publicKey: member!.publicKey,
          account: updatedMember,
        },
      },
    });
    dispatch({
      type: ActionType.RegistryUpdateEntity,
      item: {
        entity: {
          publicKey: member.account.entity,
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
    enqueueSnackbar(`Redemption completed`, {
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

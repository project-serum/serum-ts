import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useSnackbar } from 'notistack';
import Typography from '@material-ui/core/Typography';
import Grid from '@material-ui/core/Grid';
import Button from '@material-ui/core/Button';
import Card from '@material-ui/core/Card';
import * as registry from '@project-serum/registry';
import { State as StoreState, ProgramAccount } from '../../store/reducer';
import { ViewTransactionOnExplorerButton } from '../../components/common/Notification';
import { ActionType } from '../../store/actions';
import { useWallet } from '../../components/common/WalletProvider';
import { EntityActivityLabel } from './EntityGallery';

type Props = {
  entity: ProgramAccount<registry.accounts.Entity>;
};

export default function Entity(props: Props) {
  const { entity } = props;
  let { isWalletConnected, member } = useSelector((state: StoreState) => {
    return {
      isWalletConnected: state.common.isWalletConnected,
      member: state.registry.member,
    };
  });

  return (
    <>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#fbfbfb',
        }}
      >
        <div
          style={{
            paddingTop: 50,
            paddingRight: 50,
            paddingLeft: 50,
          }}
        >
          <div
            style={{
              paddingBottom: '10px',
              display: 'flex',
              justifyContent: 'space-between',
              borderBottom: 'solid #fbfbfb',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
              }}
            >
              <div>
                <Typography
                  variant="h1"
                  style={{
                    fontSize: 25,
                    fontWeight: 700,
                    textAlign: 'center',
                  }}
                >
                  {entity.publicKey.toString()}
                </Typography>
              </div>
              <div>
                <Typography
                  color="textSecondary"
                  style={{
                    paddingBottom: 10,
                  }}
                >
                  Leader - {entity.account.leader.toString()}
                </Typography>
              </div>
              <div>
                <EntityActivityLabel entity={entity} />
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div style={{ flex: 1 }}></div>
              {isWalletConnected && member !== undefined && (
                <>
                  {member.account.entity.toString() !==
                  entity.publicKey.toString() ? (
                    <JoinButton entity={entity} member={member} />
                  ) : (
                    <Button
                      disableElevation
                      disableFocusRipple
                      disableRipple
                      variant="contained"
                      color="primary"
                    >
                      <Typography>My Node</Typography>
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
        <div
          style={{
            flex: 1,
            paddingTop: 50,
            paddingBottom: 50,
            paddingLeft: 50,
            paddingRight: 50,
          }}
        >
          <StakeContent entity={entity} />
        </div>
      </div>
    </>
  );
}

type StakeContentProps = {
  entity: ProgramAccount<registry.accounts.Entity>;
};

function StakeContent(props: StakeContentProps) {
  const { entity } = props;
  return (
    <div>
      <Grid container spacing={3}>
        <BalanceGridItem
          label="Stake Pool Shares"
          amount={entity.account.balances.sptAmount.toString()}
        />
        <BalanceGridItem
          label="Mega Stake Pool Shares"
          amount={entity.account.balances.sptMegaAmount.toString()}
        />
        <BalanceGridItem
          label="Free SRM Balance"
          amount={entity.account.balances.currentDeposit.toString()}
        />
        <BalanceGridItem
          label="Free MSRM Balance"
          amount={entity.account.balances.currentMegaDeposit.toString()}
        />
      </Grid>
    </div>
  );
}
type BalanceGridItemProps = {
  label: string;
  amount: string;
};

function BalanceGridItem(props: BalanceGridItemProps) {
  const { label, amount } = props;
  return (
    <Grid
      item
      xs={6}
      style={{
        height: '250px',
      }}
    >
      <Card
        style={{
          boxShadow: '0px 0px 25px 0px rgba(0,0,0,0.05)',
          width: '100%',
          height: '100%',
          paddingTop: '24px',
          paddingBottom: '24px',
        }}
      >
        <div
          style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div>
            <Typography
              color="textSecondary"
              style={{
                fontSize: '20px',
                textAlign: 'center',
              }}
            >
              {label}
            </Typography>
          </div>
          <div
            style={{
              height: '100%',
              justifyContent: 'center',
              flexDirection: 'column',
              display: 'flex',
              textAlign: 'center',
            }}
          >
            <Typography
              color="textSecondary"
              style={{
                fontSize: '40px',
              }}
            >
              {amount}
            </Typography>
          </div>
        </div>
      </Card>
    </Grid>
  );
}

type JoinButtonProps = {
  entity: ProgramAccount<registry.accounts.Entity>;
  member: ProgramAccount<registry.accounts.Member>;
};

function JoinButton(props: JoinButtonProps) {
  const { entity, member } = props;
  const { registryClient } = useWallet();
  const dispatch = useDispatch();
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();

  const joinEntity = async () => {
    enqueueSnackbar(`Joining ${entity.publicKey}`, {
      variant: 'info',
    });

    const oldEntity = member.account.entity;
    const newEntity = entity.publicKey;

    const { tx } = await registryClient.switchEntity({
      member: member.publicKey,
      entity: oldEntity,
      newEntity,
    });

    const memberAccount = await registryClient.accounts.member(
      member.publicKey,
    );
    const updatedOldEntity = await registryClient.accounts.entity(oldEntity);
    const updatedNewEntity = await registryClient.accounts.entity(newEntity);

    // TODO: instead of updating here, we should stream in all updates by following
    //       the blockchain and updating the store asynchronously.
    dispatch({
      type: ActionType.RegistrySetMember,
      item: {
        member: {
          publicKey: member.publicKey,
          account: memberAccount,
        },
      },
    });
    dispatch({
      type: ActionType.RegistryUpdateEntity,
      item: {
        entity: {
          publicKey: oldEntity,
          account: updatedOldEntity,
        },
      },
    });
    dispatch({
      type: ActionType.RegistryUpdateEntity,
      item: {
        entity: {
          publicKey: newEntity,
          account: updatedNewEntity,
        },
      },
    });
    closeSnackbar();
    enqueueSnackbar(`Joined entity ${entity.publicKey}`, {
      variant: 'success',
      action: <ViewTransactionOnExplorerButton signature={tx} />,
    });
  };
  return (
    <div>
      <Button
        variant="contained"
        color="secondary"
        onClick={() =>
          joinEntity().catch(err => {
            enqueueSnackbar(`Error joining entity: ${err.toString()}`, {
              variant: 'error',
            });
          })
        }
      >
        Join
      </Button>
    </div>
  );
}

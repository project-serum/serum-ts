import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useSnackbar } from 'notistack';
import BN from 'bn.js';
import Container from '@material-ui/core/Container';
import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button';
import { TransitionProps } from '@material-ui/core/transitions';
import ArrowDownwardIcon from '@material-ui/icons/ArrowDownward';
import ArrowUpwardIcon from '@material-ui/icons/ArrowUpward';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import TextField from '@material-ui/core/TextField';
import FormControl from '@material-ui/core/FormControl';
import Select from '@material-ui/core/Select';
import MenuItem from '@material-ui/core/MenuItem';
import InputLabel from '@material-ui/core/InputLabel';
import Slide from '@material-ui/core/Slide';
import FormHelperText from '@material-ui/core/FormHelperText';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import { PublicKey } from '@solana/web3.js';
import { useWallet } from '../../components/common/WalletProvider';
import OwnedTokenAccountsSelect from '../../components/common/OwnedTokenAccountsSelect';
import { ViewTransactionOnExplorerButton } from '../../components/common/Notification';
import { State as StoreState } from '../../store/reducer';
import { ActionType } from '../../store/actions';
import EntityGallery, { EntityActivityLabel } from '../nodes/EntityGallery';
import Me from '../Me';
import Stake from '../Stake';
import Rewards from '../rewards/Rewards';
import Vestings from '../lockups/Vestings';
import VestingAccountsSelect from './VestingAccountsSelect';
import { fromDisplaySrm, fromDisplayMsrm } from '../../utils/tokens';

enum TabModel {
  Me,
  Stake,
  EntityGallery,
  Rewards,
  Lockup,
}

export default function MyNode() {
  const [tab, setTab] = useState(TabModel.Me);
  return (
    <div>
      <MyNodeBanner setTab={setTab} />
      <Container fixed maxWidth="md" style={{ flex: 1, display: 'flex' }}>
        {tab === TabModel.Me && <Me />}
        {tab === TabModel.Stake && <Stake />}
        {tab === TabModel.EntityGallery && <EntityGallery />}
        {tab === TabModel.Rewards && <Rewards />}
        {tab === TabModel.Lockup && <Vestings />}
      </Container>
    </div>
  );
}

type MyNodeBannerProps = {
  setTab: (t: TabModel) => void;
};

function MyNodeBanner(props: MyNodeBannerProps) {
  const [tab, setTab] = useState(TabModel.Me);
  const { member, entity } = useSelector((state: StoreState) => {
    const member = state.registry.member;
    return {
      registrar: state.registry.registrar,
      member,
      pendingWithdrawals: member.data
        ? state.registry.pendingWithdrawals.get(
            member.data.publicKey.toString(),
          )
        : [],
      entity: state.registry.entities
        .filter(
          e =>
            member.data &&
            e.publicKey.toString() ===
              member.data!.account.member.entity.toString(),
        )
        .pop(),
    };
  });
  const [showDepositDialog, setShowDepositDialog] = useState(false);
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);

  return (
    <>
      <div
        style={{
          backgroundColor: '#fff',
          paddingTop: '24px',
          borderBottom: 'solid 1pt #ccc',
        }}
      >
        <Container
          fixed
          maxWidth="md"
          style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <Typography variant="h4" style={{ marginBottom: '10px' }}>
                My Node
              </Typography>
            </div>
            {entity && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  flexDirection: 'column',
                }}
              >
                <EntityActivityLabel
                  noBubble={true}
                  textStyle={{ fontSize: '16px' }}
                  entity={entity}
                />
              </div>
            )}
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <Typography>
                {member.data !== undefined
                  ? member.data.account.member.entity.toString()
                  : 'Account not found. Please create a stake account.'}
              </Typography>
            </div>
            <div>
              <div>
                <Button
                  disabled={member.data === undefined}
                  onClick={() => setShowDepositDialog(true)}
                  variant="outlined"
                  color="primary"
                  style={{ marginRight: '10px' }}
                >
                  <ArrowDownwardIcon style={{ fontSize: '20px' }} />
                  <Typography style={{ marginLeft: '5px', marginRight: '5px' }}>
                    Deposit
                  </Typography>
                </Button>
                <Button
                  disabled={member.data === undefined}
                  variant="outlined"
                  color="primary"
                  onClick={() => setShowWithdrawDialog(true)}
                >
                  <ArrowUpwardIcon style={{ fontSize: '20px' }} />
                  <Typography style={{ marginLeft: '5px', marginRight: '5px' }}>
                    Withdraw
                  </Typography>
                </Button>
              </div>
            </div>
          </div>
        </Container>
        <div
          style={{
            maxWidth: '960px',
            marginLeft: 'auto',
            marginRight: 'auto',
            paddingLeft: '24px',
            paddingRight: '24px',
            marginTop: '10px',
          }}
        >
          <Tabs
            value={tab}
            onChange={(_e, t) => {
              setTab(t);
              props.setTab(t);
            }}
          >
            <Tab value={TabModel.Me} label="Me" />
            <Tab value={TabModel.Stake} label="Stake" />
            <Tab value={TabModel.EntityGallery} label="Nodes" />
            <Tab value={TabModel.Rewards} label="Rewards" />
            <Tab value={TabModel.Lockup} label="Lockups" />
          </Tabs>
        </div>
      </div>
      {member !== undefined && (
        <>
          <DepositDialog
            open={showDepositDialog}
            onClose={() => setShowDepositDialog(false)}
          />
          <WithdrawDialog
            open={showWithdrawDialog}
            onClose={() => setShowWithdrawDialog(false)}
          />
        </>
      )}
    </>
  );
}

type DepositDialogProps = {
  open: boolean;
  onClose: () => void;
};

type Coin = 'srm' | 'lsrm' | 'msrm' | 'lmsrm';

function DepositDialog(props: DepositDialogProps) {
  const { open, onClose } = props;
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();
  const { registryClient, lockupClient } = useWallet();
  const dispatch = useDispatch();
  const { safe, registrar, member } = useSelector((state: StoreState) => {
    return {
      registrar: state.registry.registrar!,
      safe: state.lockup.safe!,
      member: state.registry.member!,
    };
  });
  return (
    <TransferDialog
      deposit={true}
      title={'Deposit'}
      contextText={'Select the amount and coin you want to deposit'}
      open={open}
      onClose={onClose}
      onTransfer={async (
        from: PublicKey,
        displayAmount: number,
        coin: Coin,
        isLocked: boolean,
      ) => {
        const amount =
          coin === 'srm' || coin === 'lsrm'
            ? fromDisplaySrm(displayAmount)
            : fromDisplayMsrm(displayAmount);
        enqueueSnackbar(
          `Depositing ${amount} ${coin} from ${from.toString()}`,
          {
            variant: 'info',
          },
        );
        const tx = await (async () => {
          let vault =
            coin === 'srm' || coin === 'lsrm'
              ? member.data!.account.member.balances[isLocked ? 1 : 0].vault
              : member.data!.account.member.balances[isLocked ? 1 : 0]
                  .vaultMega;
          if (isLocked) {
            const { tx } = await registryClient.depositLocked({
              amount: new BN(amount),
              vesting: from,
              safe: safe.account,
              lockupClient,
              registrar: registrar.account,
              entity: member.data!.account.member.entity,
              member: member.data!.publicKey,
              vault,
            });
            const vesting = await lockupClient.accounts.vesting(from);
            dispatch({
              type: ActionType.LockupUpdateVesting,
              item: {
                vesting: {
                  publicKey: from,
                  account: vesting,
                },
              },
            });
            return tx;
          } else {
            const { tx } = await registryClient.deposit({
              member: member.data!.publicKey,
              depositor: from,
              amount: new BN(amount),
              entity: member.data!.account.member.entity,
              vault,
              vaultOwner: await registryClient.accounts.vaultAuthority(
                registryClient.programId,
                registryClient.registrar,
                registrar.account,
              ),
            });
            return tx;
          }
        })();
        const newEntity = await registryClient.accounts.entity(
          member.data!.account.member.entity,
        );
        dispatch({
          type: ActionType.RegistryUpdateEntity,
          item: {
            entity: {
              publicKey: member.data!.account.member.entity,
              account: newEntity,
            },
          },
        });
        closeSnackbar();
        enqueueSnackbar(`Deposit complete`, {
          variant: 'success',
          action: <ViewTransactionOnExplorerButton signature={tx} />,
        });
        onClose();
      }}
    />
  );
}

type WithdrawDialogProps = DepositDialogProps;

function WithdrawDialog(props: WithdrawDialogProps) {
  const { open, onClose } = props;
  const { registryClient, lockupClient } = useWallet();
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();
  const dispatch = useDispatch();
  const { safe, registrar, member } = useSelector((state: StoreState) => {
    return {
      registrar: state.registry.registrar!,
      safe: state.lockup.safe!,
      member: state.registry.member!,
    };
  });
  return (
    <TransferDialog
      title={'Withdraw'}
      contextText={'Select the amount and coin you want to withdraw'}
      open={open}
      onClose={onClose}
      onTransfer={async (
        from: PublicKey,
        displayAmount: number,
        coin: Coin,
        isLocked: boolean,
      ) => {
        const amount =
          coin === 'srm' || coin === 'lsrm'
            ? fromDisplaySrm(displayAmount)
            : fromDisplayMsrm(displayAmount);
        enqueueSnackbar(`Withdrawing ${amount} ${coin} to ${from.toString()}`, {
          variant: 'info',
        });
        const tx = await (async () => {
          let vault =
            coin === 'srm' || coin === 'lsrm'
              ? member.data!.account.member.balances[isLocked ? 1 : 0].vault
              : member.data!.account.member.balances[isLocked ? 1 : 0]
                  .vaultMega;
          if (isLocked) {
            const { tx } = await registryClient.withdrawLocked({
              amount: new BN(amount),
              vesting: from,
              safe: safe.account,
              lockupClient,
              registrar: registrar.account,
              entity: member.data!.account.member.entity,
              member: member.data!.publicKey,
              vault,
            });
            const vesting = await lockupClient.accounts.vesting(from);
            dispatch({
              type: ActionType.LockupUpdateVesting,
              item: {
                vesting: {
                  publicKey: from,
                  account: vesting,
                },
              },
            });
            return tx;
          } else {
            const { tx } = await registryClient.withdraw({
              member: member.data!.publicKey,
              depositor: from,
              amount: new BN(amount),
              entity: member.data!.account.member.entity,
              vault,
              vaultOwner: await registryClient.accounts.vaultAuthority(
                registryClient.programId,
                registryClient.registrar,
                registrar.account,
              ),
            });
            return tx;
          }
        })();
        const newEntity = await registryClient.accounts.entity(
          member.data!.account.member.entity,
        );
        dispatch({
          type: ActionType.RegistryUpdateEntity,
          item: {
            entity: {
              publicKey: member.data!.account.member.entity,
              account: newEntity,
            },
          },
        });
        closeSnackbar();
        enqueueSnackbar(`Withdraw complete`, {
          variant: 'success',
          action: <ViewTransactionOnExplorerButton signature={tx} />,
        });
        onClose();
      }}
    />
  );
}

type TransferDialogProps = {
  title: string;
  contextText: string;
  open: boolean;
  deposit?: boolean;
  onClose: () => void;
  onTransfer: (
    from: PublicKey,
    amount: number,
    coin: Coin,
    isLocked: boolean,
  ) => Promise<void>;
};

function TransferDialog(props: TransferDialogProps) {
  const { srmMint, msrmMint } = useSelector((state: StoreState) => {
    const network = state.common.network;
    return {
      srmMint: network.srm,
      msrmMint: network.msrm,
    };
  });
  const { enqueueSnackbar } = useSnackbar();
  const { open, onClose, onTransfer, title, contextText, deposit } = props;
  const [displayAmount, setDisplayAmount] = useState<null | number>(null);
  const [coin, setCoin] = useState<null | Coin>(null);
  const [from, setFrom] = useState<null | PublicKey>(null);
  const [vesting, setVesting] = useState<null | PublicKey>(null);
  const [maxDisplayAmount, setMaxDisplayAmount] = useState<null | number>(null);
  const mint = !coin
    ? undefined
    : coin === 'srm' || coin === 'lsrm'
    ? srmMint
    : msrmMint;
  const isLocked = coin === 'lsrm' || coin === 'lmsrm';
  const submitBtnDisabled =
    (isLocked ? !vesting : !from) ||
    !displayAmount ||
    !coin ||
    !maxDisplayAmount ||
    displayAmount > maxDisplayAmount;

  return (
    <div>
      <Dialog
        open={open}
        TransitionComponent={Transition}
        keepMounted
        onClose={onClose}
        fullWidth
      >
        <DialogTitle>{title}</DialogTitle>
        <DialogContent>
          <div style={{ display: 'flex' }}>
            <div style={{ flex: 1 }}>
              <TextField
                style={{ width: '100%' }}
                id="outlined-number"
                label="Amount"
                type="number"
                InputLabelProps={{
                  shrink: true,
                }}
                variant="outlined"
                onChange={e =>
                  setDisplayAmount(parseFloat(e.target.value) as number)
                }
                InputProps={{
                  inputProps: { min: 0, max: maxDisplayAmount ?? 0 },
                }}
              />
              <FormHelperText>{contextText}</FormHelperText>
            </div>
            <div>
              <FormControl
                variant="outlined"
                style={{ minWidth: '100px', marginLeft: '10px' }}
              >
                <InputLabel>Coin</InputLabel>
                <Select
                  value={coin}
                  onChange={e => setCoin(e.target.value as Coin)}
                  label="Coin"
                >
                  <MenuItem value="srm">SRM</MenuItem>
                  <MenuItem value="msrm">MSRM</MenuItem>
                  <MenuItem value="lsrm">Locked SRM</MenuItem>
                  <MenuItem value="lmsrm">Locked MSRM</MenuItem>
                </Select>
              </FormControl>
            </div>
          </div>
          <FormControl fullWidth>
            {!isLocked ? (
              <>
                <OwnedTokenAccountsSelect
                  variant="outlined"
                  mint={mint}
                  decimals={!mint ? undefined : mint.equals(srmMint) ? 6 : 0}
                  onChange={(f: PublicKey, maxDisplayAmount: BN) => {
                    setFrom(f);
                    setMaxDisplayAmount(maxDisplayAmount.toNumber());
                  }}
                />
                <FormHelperText>
                  Token account to transfer to/from
                </FormHelperText>
              </>
            ) : (
              <>
                <VestingAccountsSelect
                  variant="outlined"
                  mint={mint}
                  decimals={!mint ? undefined : mint.equals(srmMint) ? 6 : 0}
                  deposit={deposit}
                  onChange={(v: PublicKey, maxDisplayAmount: BN) => {
                    setVesting(v);
                    setMaxDisplayAmount(maxDisplayAmount.toNumber());
                  }}
                />
                <FormHelperText>
                  Vesting account to transfer to/from
                </FormHelperText>
              </>
            )}
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} color="primary">
            Cancel
          </Button>
          <Button
            //@ts-ignore
            onClick={() => {
              onTransfer(
                isLocked ? vesting! : from!,
                displayAmount!,
                coin!,
                isLocked,
              ).catch(err => {
                enqueueSnackbar(`Error transferring funds: ${err.toString()}`, {
                  variant: 'error',
                });
              });
            }}
            color="primary"
            disabled={submitBtnDisabled}
          >
            {title}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

const Transition = React.forwardRef(function Transition(
  props: TransitionProps & { children?: React.ReactElement<any, any> },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useSnackbar } from 'notistack';
import BN from 'bn.js';
import styled from 'styled-components';
import LockIcon from '@material-ui/icons/Lock';
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
import Slide from '@material-ui/core/Slide';
import FormHelperText from '@material-ui/core/FormHelperText';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Switch from '@material-ui/core/Switch';
import { SYSVAR_RENT_PUBKEY, PublicKey, SystemProgram } from '@solana/web3.js';
import { TokenInstructions } from '@project-serum/serum';
import { useWallet } from '../../components/common/WalletProvider';
import OwnedTokenAccountsSelect from '../../components/common/OwnedTokenAccountsSelect';
import { ViewTransactionOnExplorerButton } from '../../components/common/Notification';
import RegistrarSelect from './RegistrarSelect';
import { State as StoreState, ProgramAccount } from '../../store/reducer';
import { ActionType } from '../../store/actions';
import * as bootstrap from './BootstrapProvider';
import Me from '../Me';
import {
  memberSigner,
  memberSeed,
  createBalanceSandbox,
} from '../../utils/registry';
import { vestingSigner } from '../../utils/lockup';
import Stake from '../Stake';
import Rewards from '../rewards/Rewards';
import VestingAccountsSelect from './VestingAccountsSelect';
import { toDisplayLabel, fromDisplay } from '../../utils/tokens';

enum TabModel {
  Me,
  Stake,
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
        {tab === TabModel.Rewards && <Rewards />}
      </Container>
    </div>
  );
}

type MyNodeBannerProps = {
  setTab: (t: TabModel) => void;
};

function MyNodeBanner(props: MyNodeBannerProps) {
  const [tab, setTab] = useState(TabModel.Me);
  const { member, registrar, registrarAccount } = useSelector(
    (state: StoreState) => {
      return {
        member: state.registry.member,
        registrar: state.registry.registrar,
        registrarAccount: state.accounts[state.registry.registrar.toString()],
      };
    },
  );
  const [showDepositDialog, setShowDepositDialog] = useState(false);
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();
  const { wallet, registryClient } = useWallet();
  const dispatch = useDispatch();

  const createStakeAccount = async () => {
    enqueueSnackbar('Creating stake account', {
      variant: 'info',
    });
    const seed = await memberSeed(registrar);
    const member = await PublicKey.createWithSeed(
      wallet.publicKey,
      seed,
      registryClient.programId,
    );
    const { publicKey, nonce } = await memberSigner(
      registryClient.programId,
      registrar,
      member,
    );
    const memberSignerPublicKey = publicKey;

    const [mainTx, balances] = await createBalanceSandbox(
      registryClient.provider,
      registrarAccount,
      memberSignerPublicKey,
    );
    const [lockedTx, balancesLocked] = await createBalanceSandbox(
      registryClient.provider,
      registrarAccount,
      memberSignerPublicKey,
    );
    const tx = registryClient.transaction.createMember(nonce, {
      accounts: {
        registrar: registrar,
        member: member,
        beneficiary: wallet.publicKey,
        memberSigner: memberSignerPublicKey,
        balances,
        balancesLocked,
        tokenProgram: TokenInstructions.TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
      },
      instructions: [
        SystemProgram.createAccountWithSeed({
          fromPubkey: wallet.publicKey,
          newAccountPubkey: member,
          basePubkey: wallet.publicKey,
          seed,
          lamports: await registryClient.provider.connection.getMinimumBalanceForRentExemption(
            registryClient.account.member.size,
          ),
          space: registryClient.account.member.size,
          programId: registryClient.programId,
        }),
      ],
    });
    const signers: Account[] = [];
    const allTxs = [mainTx, lockedTx, { tx, signers }];
    // @ts-ignore
    let txSigs = await registryClient.provider.sendAll(allTxs);
    console.log('Accounts created with transactions:', txSigs);

    const memberAccount = await registryClient.account.member(member);
    const memberProgramAccount = {
      publicKey: member,
      account: memberAccount,
    };
    // Add the new member to the store.
    dispatch({
      type: ActionType.AccountAdd,
      item: {
        account: memberProgramAccount,
      },
    });

    // Populate the store with all of the member's accounts.
    await bootstrap.fetchAndDispatchMemberAccounts(
      memberProgramAccount,
      dispatch,
      registryClient.provider.connection,
    );

    // Subscribe to any updates to the member.
    bootstrap.subscribeMember(memberProgramAccount, registryClient, dispatch);

    // Tell the UI that our member is ready.
    dispatch({
      type: ActionType.RegistrySetMember,
      item: {
        member,
      },
    });

    closeSnackbar();
    enqueueSnackbar(`Stake account created ${member.toString()}`, {
      variant: 'success',
    });
  };

  const HoverSpan = styled.span`
    :hover {
      cursor: pointer;
    }
  `;

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
                My Stake
              </Typography>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                flexDirection: 'column',
              }}
            >
              <RegistrarSelect />
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <Typography>
                {member !== undefined ? (
                  member.toString()
                ) : (
                  <>
                    Account not found. Please{' '}
                    <HoverSpan
                      onClick={() => {
                        createStakeAccount().catch(err => {
                          console.error(err);
                          enqueueSnackbar(
                            `Error creating stake account: ${err.toString()}`,
                            {
                              variant: 'error',
                            },
                          );
                        });
                      }}
                      style={{
                        color: 'black',
                        fontWeight: 'bold',
                        textDecoration: 'underline',
                      }}
                    >
                      create
                    </HoverSpan>{' '}
                    a stake account.
                  </>
                )}
              </Typography>
            </div>
            <div>
              <div>
                <Button
                  disabled={member === undefined}
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
                  disabled={member === undefined}
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
            <Tab value={TabModel.Rewards} label="Rewards" />
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

function DepositDialog(props: DepositDialogProps) {
  const { open, onClose } = props;
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();
  const { registryClient, lockupClient } = useWallet();
  const dispatch = useDispatch();
  const {
    registrar,
    member,
    memberAccount,
    mintAccount,
    accounts,
  } = useSelector((state: StoreState) => {
    let memberAccount = undefined;
    if (state.registry.member) {
      memberAccount = state.accounts[state.registry.member.toString()];
    }
    const registrarAccount =
      state.accounts[state.registry.registrar.toString()];
    const registrar: ProgramAccount = {
      publicKey: state.registry.registrar,
      account: registrarAccount,
    };
    return {
      registrar,
      memberAccount,
      member: state.registry.member,
      mintAccount: state.accounts[registrar.account.mint.toString()],
      accounts: state.accounts,
    };
  });
  return (
    <TransferDialog
      deposit={true}
      title={'Deposit'}
      contextText={'Select the amount to deposit'}
      open={open}
      onClose={onClose}
      onTransfer={async (
        from: PublicKey,
        displayAmount: number,
        isLocked: boolean,
      ) => {
        const amount = fromDisplay(displayAmount, mintAccount.decimals);
        enqueueSnackbar(
          `Depositing ${displayAmount} ${toDisplayLabel(
            registrar.account.mint,
          )} from ${from.toString()}`,
          {
            variant: 'info',
          },
        );
        const tx = await (async () => {
          if (isLocked) {
            const relayData = registryClient.coder.instruction.encode(
              'deposit_locked',
              {
                amount,
              },
            );
            const vesting = accounts[from.toString()];
            const _memberSigner = (
              await memberSigner(
                registryClient.programId,
                registrar.publicKey,
                member!,
              )
            ).publicKey;
            const _vestingSigner = (
              await vestingSigner(lockupClient.programId, from)
            ).publicKey;
            const relayAccounts = [
              {
                pubkey: await registryClient.state.address(),
                isWritable: false,
                isSigner: false,
              },
              {
                pubkey: registrar.publicKey,
                isWritable: false,
                isSigner: false,
              },
              { pubkey: member!, isWritable: false, isSigner: false },
              {
                pubkey: registryClient.provider.wallet.publicKey,
                isWritable: false,
                isSigner: true,
              },
            ];
            const tx = await lockupClient.rpc.whitelistWithdraw(
              relayData,
              amount,
              {
                accounts: {
                  transfer: {
                    lockup: await lockupClient.state.address(),
                    beneficiary: registryClient.provider.wallet.publicKey,
                    whitelistedProgram: registryClient.programId,
                    vesting: from,
                    vault: vesting.vault,
                    vestingSigner: _vestingSigner,
                    tokenProgram: TokenInstructions.TOKEN_PROGRAM_ID,
                    whitelistedProgramVault: memberAccount.balancesLocked.vault,
                    whitelistedProgramVaultAuthority: _memberSigner,
                  },
                },
                remainingAccounts: relayAccounts,
              },
            );

            // Update the store with the updated account.
            const updatedVestingAccount = await lockupClient.account.vesting(
              from,
            );
            dispatch({
              type: ActionType.LockupUpdateVesting,
              item: {
                vesting: {
                  publicKey: from,
                  account: updatedVestingAccount,
                },
              },
            });

            return tx;
          } else {
            return await registryClient.rpc.deposit(amount, {
              accounts: {
                depositor: from,
                depositorAuthority: registryClient.provider.wallet.publicKey,
                tokenProgram: TokenInstructions.TOKEN_PROGRAM_ID,
                vault: memberAccount.balances.vault,
                beneficiary: registryClient.provider.wallet.publicKey,
                member: member,
              },
            });
          }
        })();
        closeSnackbar();
        enqueueSnackbar(`Deposit complete`, {
          variant: 'success',
          action: <ViewTransactionOnExplorerButton signature={tx as string} />,
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
  const {
    registrar,
    registrarAccount,
    member,
    memberAccount,
    mintAccount,
    accounts,
  } = useSelector((state: StoreState) => {
    let memberAccount = undefined;
    if (state.registry.member) {
      memberAccount = state.accounts[state.registry.member.toString()];
    }
    const registrarAccount =
      state.accounts[state.registry.registrar.toString()];
    return {
      registrar: state.registry.registrar,
      registrarAccount,
      member: state.registry.member,
      memberAccount,
      mintAccount: state.accounts[registrarAccount.mint.toString()],
      accounts: state.accounts,
    };
  });
  return (
    <TransferDialog
      title={'Withdraw'}
      contextText={'Select the amount to withdraw'}
      open={open}
      onClose={onClose}
      onTransfer={async (
        from: PublicKey,
        displayAmount: number,
        isLocked: boolean,
      ) => {
        const amount = fromDisplay(displayAmount, mintAccount.decimals);
        enqueueSnackbar(
          `Withdrawing ${displayAmount} ${toDisplayLabel(
            registrarAccount.mint,
          )} to ${from.toString()}`,
          {
            variant: 'info',
          },
        );
        const tx = await (async () => {
          const _memberSigner = await memberSigner(
            registryClient.programId,
            registrar,
            member!,
          );
          if (isLocked) {
            const relayData = registryClient.coder.instruction.encode(
              'withdraw_locked',
              {
                amount,
              },
            );
            const vesting = accounts[from.toString()];
            const _memberSigner = (
              await memberSigner(registryClient.programId, registrar, member!)
            ).publicKey;
            const _vestingSigner = (
              await vestingSigner(lockupClient.programId, from)
            ).publicKey;
            const relayAccounts = [
              {
                pubkey: await registryClient.state.address(),
                isWritable: false,
                isSigner: false,
              },
              { pubkey: registrar, isWritable: false, isSigner: false },
              { pubkey: member!, isWritable: false, isSigner: false },
              {
                pubkey: registryClient.provider.wallet.publicKey,
                isWritable: false,
                isSigner: true,
              },
            ];
            const tx = await lockupClient.rpc.whitelistDeposit(relayData, {
              accounts: {
                transfer: {
                  lockup: await lockupClient.state.address(),
                  beneficiary: registryClient.provider.wallet.publicKey,
                  whitelistedProgram: registryClient.programId,
                  vesting: from,
                  vault: vesting.vault,
                  vestingSigner: _vestingSigner,
                  tokenProgram: TokenInstructions.TOKEN_PROGRAM_ID,
                  whitelistedProgramVault: memberAccount.balancesLocked.vault,
                  whitelistedProgramVaultAuthority: _memberSigner,
                },
              },
              remainingAccounts: relayAccounts,
            });

            // Update the store with the updated account.
            const updatedVestingAccount = await lockupClient.account.vesting(
              from,
            );
            dispatch({
              type: ActionType.LockupUpdateVesting,
              item: {
                vesting: {
                  publicKey: from,
                  account: updatedVestingAccount,
                },
              },
            });

            return tx;
          } else {
            return await registryClient.rpc.withdraw(amount, {
              accounts: {
                registrar,
                member,
                beneficiary: registryClient.provider.wallet.publicKey,
                vault: memberAccount.balances.vault,
                memberSigner: _memberSigner.publicKey,
                depositor: from,
                tokenProgram: TokenInstructions.TOKEN_PROGRAM_ID,
              },
            });
          }
        })();

        closeSnackbar();
        enqueueSnackbar(`Withdraw complete`, {
          variant: 'success',
          action: <ViewTransactionOnExplorerButton signature={tx as string} />,
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
    isLocked: boolean,
  ) => Promise<void>;
};

function TransferDialog(props: TransferDialogProps) {
  const { mint, mintAccount } = useSelector((state: StoreState) => {
    const registrar = state.accounts[state.registry.registrar.toString()];
    const mint = registrar ? registrar.mint : undefined;
    return {
      mint,
      mintAccount: state.accounts[registrar.mint.toString()],
    };
  });
  const { enqueueSnackbar } = useSnackbar();
  const { open, onClose, onTransfer, title, contextText, deposit } = props;
  const [displayAmount, setDisplayAmount] = useState<null | number>(null);
  const [from, setFrom] = useState<null | PublicKey>(null);
  const [vesting, setVesting] = useState<null | PublicKey>(null);
  const [maxDisplayAmount, setMaxDisplayAmount] = useState<null | number>(null);
  const [isLocked, setIsLocked] = useState(false);
  const submitBtnDisabled =
    (isLocked ? !vesting : !from) ||
    !displayAmount ||
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
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <DialogTitle>{title}</DialogTitle>
          <div style={{ display: 'flex', paddingRight: '24px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                flexDirection: 'column',
              }}
            >
              <LockIcon />
            </div>
            <FormControlLabel
              style={{ marginLeft: '0px', marginRight: '0px' }}
              control={
                <Switch
                  checked={isLocked}
                  onChange={() => setIsLocked(!isLocked)}
                />
              }
              label=""
            />
          </div>
        </div>
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
          </div>
          <FormControl fullWidth>
            {!isLocked ? (
              <>
                <OwnedTokenAccountsSelect
                  variant="outlined"
                  mint={mint}
                  onChange={(f: PublicKey, _maxDisplayAmount: BN) => {
                    setFrom(f);
                    // TODO: set an actual limit for the withdrawal UI (i.e.
                    //       what's currently in the vault). Currently not
                    //       done since we dont' have websocket connections
                    //       for each of the users accounts. However we
                    //       still use the "max" amount for display vesting
                    //       accounts.
                    setMaxDisplayAmount(2 ** 53);
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
                  decimals={mintAccount.decimals}
                  deposit={deposit}
                  onChange={(v: PublicKey, maxDisplayAmount: BN) => {
                    setVesting(v);
                    setMaxDisplayAmount(maxDisplayAmount.toNumber());
                  }}
                />
                <FormHelperText>
                  Vesting account to transfer to/from your <b>locked</b>{' '}
                  balances
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
                isLocked,
              ).catch(err => {
                console.error(err);
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

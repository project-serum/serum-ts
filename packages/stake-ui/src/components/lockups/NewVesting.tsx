import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSnackbar } from 'notistack';
import BN from 'bn.js';
import {
  Account,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  SYSVAR_CLOCK_PUBKEY,
} from '@solana/web3.js';
import { TokenInstructions } from '@project-serum/serum';
import { createTokenAccountInstrs } from '@project-serum/common';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';
import FormControl from '@material-ui/core/FormControl';
import InputLabel from '@material-ui/core/InputLabel';
import Select from '@material-ui/core/Select';
import FormHelperText from '@material-ui/core/FormHelperText';
import MenuItem from '@material-ui/core/MenuItem';
import Typography from '@material-ui/core/Typography';
import CircularProgress from '@material-ui/core/CircularProgress';
import DialogContent from '@material-ui/core/DialogContent';
import Dialog from '@material-ui/core/Dialog';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogActions from '@material-ui/core/DialogActions';
import { State as StoreState } from '../../store/reducer';
import { ActionType } from '../../store/actions';
import { useWallet } from '../../components/common/WalletProvider';
import OwnedTokenAccountsSelect from '../../components/common/OwnedTokenAccountsSelect';
import { fromDisplay } from '../../utils/tokens';
import { vestingSigner } from '../../utils/lockup';
import { ViewTransactionOnExplorerButton } from '../common/Notification';

export default function NewVestingButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div onClick={() => setOpen(true)}>
        <Button variant="contained" color="secondary">
          New
        </Button>
      </div>
      <NewVestingDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}

type NewVestingDialogProps = {
  open: boolean;
  onClose: () => void;
};

function NewVestingDialog(props: NewVestingDialogProps) {
  const { open, onClose } = props;
  const { network, accounts } = useSelector((state: StoreState) => {
    return {
      network: state.common.network,
      accounts: state.accounts,
    };
  });

  const defaultEndDate = '2027-01-01T12:00';
  const defaultEndTs = new Date(defaultEndDate).getTime() / 1000;

  const [beneficiary, setBeneficiary] = useState('');
  const isValidBeneficiary = (() => {
    try {
      new PublicKey(beneficiary);
      return true;
    } catch (_) {
      return false;
    }
  })();
  const displayBeneficiaryError = !isValidBeneficiary && beneficiary !== '';

  const [fromAccount, setFromAccount] = useState<null | PublicKey>(null);
  const [timestamp, setTimestamp] = useState(defaultEndTs);
  const [periodCount, setPeriodCount] = useState(7);
  const [displayAmount, setDisplayAmount] = useState<null | number>(null);
  const { lockupClient } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [mint, setMint] = useState<null | PublicKey>(null);

  const { enqueueSnackbar } = useSnackbar();
  const dispatch = useDispatch();

  const submitBtnEnabled =
    mint !== null &&
    fromAccount !== null &&
    isValidBeneficiary &&
    displayAmount !== null;

  const createVestingClickHandler = async () => {
    setIsLoading(true);
    try {
      const beneficiaryPublicKey = new PublicKey(beneficiary);
      const beneficiaryAccount = await lockupClient.provider.connection.getAccountInfo(
        beneficiaryPublicKey,
      );
      if (beneficiaryAccount === null) {
        enqueueSnackbar('Unable to validate given beneficiary.', {
          variant: 'error',
        });
        setIsLoading(false);
        return;
      }
      if (!beneficiaryAccount.owner.equals(SystemProgram.programId)) {
        enqueueSnackbar(
          'The beneficiary must be owned by the System Program.',
          {
            variant: 'error',
          },
        );
        setIsLoading(false);
        return;
      }

      enqueueSnackbar('Creating vesting acount...', {
        variant: 'info',
      });

      const mintAccount = accounts[mint!.toString()];
      let amount = mintAccount
        ? fromDisplay(displayAmount!, mintAccount.decimals)
        : new BN(displayAmount!);

      const vesting = new Account();
      const vestingVault = new Account();
      const _vestingSigner = await vestingSigner(
        lockupClient.programId,
        vesting.publicKey,
      );

      let tx = await lockupClient.rpc.createVesting(
        beneficiaryPublicKey,
        new BN(timestamp),
        new BN(periodCount),
        amount,
        _vestingSigner.nonce,
        {
          accounts: {
            vesting: vesting.publicKey,
            vault: vestingVault.publicKey,
            depositor: fromAccount,
            depositorAuthority: lockupClient.provider.wallet.publicKey,
            tokenProgram: TokenInstructions.TOKEN_PROGRAM_ID,
            rent: SYSVAR_RENT_PUBKEY,
            clock: SYSVAR_CLOCK_PUBKEY,
          },
          signers: [vesting, vestingVault],
          instructions: [
            await lockupClient.account.vesting.createInstruction(vesting),
            ...(await createTokenAccountInstrs(
              lockupClient.provider,
              vestingVault.publicKey,
              mint!,
              _vestingSigner.publicKey,
            )),
          ],
        },
      );
      const vestingAccount = await lockupClient.account.vesting(
        vesting.publicKey,
      );
      dispatch({
        type: ActionType.LockupCreateVesting,
        item: {
          vesting: {
            publicKey: vesting.publicKey,
            account: vestingAccount,
          },
        },
      });
      enqueueSnackbar(`Vesting account created`, {
        variant: 'success',
        action: <ViewTransactionOnExplorerButton signature={tx} />,
      });
      onClose();
    } catch (err) {
      enqueueSnackbar(`Error creating vesting account: ${err.toString()}`, {
        variant: 'error',
      });
    }
    setIsLoading(false);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>
        <Typography variant="h4" component="h2">
          New Vesting Account
        </Typography>
      </DialogTitle>
      <DialogContent>
        <div>
          {isLoading && (
            <div
              style={{
                width: '40px',
                marginLeft: 'auto',
                marginRight: 'auto',
                marginBottom: '24px',
              }}
            >
              <CircularProgress
                style={{ marginLeft: 'auto', marginRight: 'auto' }}
              />
            </div>
          )}
          <div style={{ display: 'flex', width: '100%' }}>
            <div>
              <FormControl variant="outlined" style={{ width: '200px' }}>
                <InputLabel>Mint</InputLabel>
                <Select
                  value={mint ? mint!.toString() : ''}
                  onChange={e =>
                    setMint(new PublicKey(e.target.value as string))
                  }
                >
                  {Object.keys(network.mints).map(m => (
                    <MenuItem value={network.mints[m].toString()}>
                      {m.toUpperCase()}
                    </MenuItem>
                  ))}
                  {/*<MenuItem value="custom">Custom</MenuItem>*/}
                </Select>
              </FormControl>
            </div>
            {false && (
              <div style={{ flex: 1, marginLeft: '10px' }}>
                <TextField
                  fullWidth
                  label="Custom mint"
                  value={mint ? mint!.toString() : ''}
                  onChange={e => setMint(new PublicKey(e.target.value))}
                />
                <FormHelperText>Mint of the token to lockup</FormHelperText>
              </div>
            )}
          </div>
          <div>
            <div style={{ display: 'flex', width: '100%' }}>
              <div style={{ flex: 1 }}>
                <FormControl fullWidth>
                  <InputLabel>From</InputLabel>
                  <OwnedTokenAccountsSelect
                    mint={mint}
                    onChange={(f: PublicKey) => setFromAccount(f)}
                  />
                  <FormHelperText>Token account to send from</FormHelperText>
                </FormControl>
              </div>
            </div>
          </div>
          <div style={{ marginTop: '24px' }}>
            <TextField
              fullWidth
              error={displayBeneficiaryError}
              helperText={displayBeneficiaryError && 'Invalid beneficiary'}
              label="Beneficiary"
              value={beneficiary}
              onChange={e => setBeneficiary(e.target.value)}
            />
            <FormHelperText>Owner of the new vesting account</FormHelperText>
          </div>
          <div
            style={{
              marginTop: '24px',
            }}
          >
            {false && (
              <FormHelperText style={{ color: 'blue' }}>
                Note: Amounts for custom mints (i.e., not SRM/MSRM) are in their
                raw, non-decimal form. Make sure to convert before entering into
                the fields here. For example, if a token has 6 decimals, then
                multiply your desired amount by 10^6.
              </FormHelperText>
            )}
            <TextField
              fullWidth
              label="Amount"
              type="number"
              value={displayAmount}
              InputProps={{ inputProps: { min: 0 } }}
              onChange={e => setDisplayAmount(parseFloat(e.target.value))}
            />
            <FormHelperText>
              Amount to deposit into the vesting account
            </FormHelperText>
          </div>
          <div
            style={{
              marginTop: '24px',
              display: 'flex',
            }}
          >
            <div style={{ flex: 1, marginRight: '10px' }}>
              <TextField
                fullWidth
                label="End date"
                type="datetime-local"
                defaultValue={defaultEndDate}
                InputLabelProps={{
                  shrink: true,
                }}
                onChange={e => {
                  const d = new Date(e.target.value);
                  setTimestamp(d.getTime() / 1000);
                }}
              />
              <FormHelperText>Date when all tokens are vested</FormHelperText>
            </div>
            <div>
              <TextField
                disabled
                fullWidth
                label="Unix Timestamp"
                value={timestamp}
              />
            </div>
          </div>
          <div
            style={{
              marginTop: '24px',
            }}
          >
            <FormControl fullWidth>
              <TextField
                id="outlined-number"
                label="Period Count"
                type="number"
                InputLabelProps={{
                  shrink: true,
                }}
                variant="outlined"
                value={periodCount}
                onChange={e =>
                  setPeriodCount(parseInt(e.target.value) as number)
                }
                InputProps={{ inputProps: { min: 1 } }}
              />
              <FormHelperText>Number of vesting periods</FormHelperText>
            </FormControl>
          </div>
        </div>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          type="submit"
          color="primary"
          disabled={!submitBtnEnabled || isLoading}
          onClick={() => createVestingClickHandler()}
        >
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );
}

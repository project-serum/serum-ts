import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSnackbar } from 'notistack';
import BN from 'bn.js';
import { PublicKey } from '@solana/web3.js';
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
import { fromDisplaySrm, fromDisplayMsrm } from '../../utils/tokens';

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
  const { network } = useSelector((state: StoreState) => {
    return {
      network: state.common.network,
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

  const submitBtnEnabled =
    fromAccount !== null && isValidBeneficiary && displayAmount !== null;

  const { lockupClient } = useWallet();
  const [isLoading, setIsLoading] = useState(false);

  const { enqueueSnackbar } = useSnackbar();
  const dispatch = useDispatch();
  const [mint, setMint] = useState<null | PublicKey>(null);
  const [mintLabel, setMintLabel] = useState('');

  const createVestingClickHandler = async () => {
    setIsLoading(true);
    enqueueSnackbar('Creating vesting acount...', {
      variant: 'info',
    });
    try {
      let amount = mint!.equals(network.srm)
        ? fromDisplaySrm(displayAmount!)
        : fromDisplayMsrm(displayAmount!);
      let { vesting } = await lockupClient.createVesting({
        beneficiary: new PublicKey(beneficiary),
        endTs: new BN(timestamp),
        periodCount: new BN(periodCount),
        depositAmount: amount,
        depositor: fromAccount as PublicKey,
      });
      const vestingAccount = await lockupClient.accounts.vesting(vesting);
      dispatch({
        type: ActionType.LockupCreateVesting,
        item: {
          vesting: {
            publicKey: vesting,
            account: vestingAccount,
          },
        },
      });
      enqueueSnackbar(`Vesting account created ${vesting}`, {
        variant: 'success',
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
              <div>
                <FormControl
                  variant="outlined"
                  style={{ width: '200px', marginLeft: '10px' }}
                >
                  <InputLabel>Mint</InputLabel>
                  <Select
                    value={mintLabel}
                    onChange={e => {
                      const m = e.target.value;
                      setMintLabel(m as string);
                      if (m === 'srm') {
                        setMint(network.srm);
                      } else if (m === 'msrm') {
                        setMint(network.msrm);
                      }
                      // TODO: add a textfield for a custom mint.
                    }}
                    label="Mint"
                  >
                    <MenuItem value="srm">SRM</MenuItem>
                    <MenuItem value="msrm">MSRM</MenuItem>
                  </Select>
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

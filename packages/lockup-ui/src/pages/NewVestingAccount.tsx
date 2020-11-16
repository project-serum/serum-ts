import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSnackbar } from 'notistack';
import BN from 'bn.js';
import { networks } from '@project-serum/lockup';
import { PublicKey } from '@solana/web3.js';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';
import FormControl from '@material-ui/core/FormControl';
import InputLabel from '@material-ui/core/InputLabel';
import Select from '@material-ui/core/Select';
import FormHelperText from '@material-ui/core/FormHelperText';
import MenuItem from '@material-ui/core/MenuItem';
import Typography from '@material-ui/core/Typography';
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import CircularProgress from '@material-ui/core/CircularProgress';
import { State as StoreState } from '../store/reducer';
import { ActionType } from '../store/actions';
import { useWallet } from '../components/Wallet';

export default function NewVesting() {
  const defaultEndDate = '2027-01-01';
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

  const [fromAccount, setFromAccount] = useState('');
  const [timestamp, setTimestamp] = useState(defaultEndTs);
  const [periodCount, setPeriodCount] = useState(7);
  const [amountStr, setAmountStr] = useState('');
  // @ts-ignore
  const isValidAmountStr = !isNaN(amountStr) && amountStr !== '';
  const displayAmountError = !isValidAmountStr && amountStr !== '';
  const amount = parseInt(amountStr);

  // TODO: don't hardcode srm filter.
  const srmMint = networks.devnet.srm;
  const ownedTokenAccounts = useSelector((state: StoreState) =>
    state.ownedTokenAccounts.filter(
      ota =>
        ota.accountInfo.tokenAccount.mint.toString() === srmMint.toString(),
    ),
  );

  const isValidOwnedTokenAccounts = ownedTokenAccounts.length > 0;

  const submitBtnEnabled =
    isValidBeneficiary && isValidAmountStr && isValidOwnedTokenAccounts;

  const { client } = useWallet();
  const [isLoading, setIsLoading] = useState(false);

  const { enqueueSnackbar } = useSnackbar();
  const dispatch = useDispatch();

  return (
    <>
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
      <Card variant="outlined">
        <CardContent>
          <Typography variant="h4" component="h2">
            New Vesting Account
          </Typography>
          <div
            style={{
              marginTop: '24px',
            }}
          >
            <FormControl fullWidth>
              <InputLabel id="demo-simple-select-helper-label">From</InputLabel>
              <Select
                fullWidth
                value={fromAccount}
                onChange={e => setFromAccount(e.target.value as string)}
              >
                {ownedTokenAccounts.length === 0 ? (
                  <MenuItem value={''}>No token accounts found</MenuItem>
                ) : (
                  ownedTokenAccounts.map(ownedTokenAccount => {
                    return (
                      <MenuItem value={ownedTokenAccount.publicKey.toString()}>
                        <div
                          style={{
                            width: '100%',
                            display: 'flex',
                            justifyContent: 'space-between',
                          }}
                        >
                          <div>{`${ownedTokenAccount.publicKey}`}</div>
                          <div
                            style={{ float: 'right', color: '#ccc' }}
                          >{`${ownedTokenAccount.accountInfo.tokenAccount.amount}`}</div>
                        </div>
                      </MenuItem>
                    );
                  })
                )}
              </Select>
              <FormHelperText>Token account to send from</FormHelperText>
            </FormControl>
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
              error={displayAmountError}
              helperText={displayAmountError && 'Invalid amount'}
              fullWidth
              label="Amount"
              value={amountStr}
              onChange={e => setAmountStr(e.target.value)}
            />
            <FormHelperText>
              Amount to deposit into the vesting account
            </FormHelperText>
          </div>
          <div
            style={{
              marginTop: '24px',
            }}
          >
            <TextField
              fullWidth
              label="End date"
              type="date"
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
          <div
            style={{
              marginTop: '24px',
            }}
          >
            <FormControl fullWidth>
              <InputLabel id="demo-simple-select-helper-label">
                Periods
              </InputLabel>
              <Select
                fullWidth
                labelId="demo-simple-select-helper-label"
                id="demo-simple-select-helper"
                value={periodCount}
                onChange={e => setPeriodCount(e.target.value as number)}
              >
                <MenuItem value={1}>1</MenuItem>
                <MenuItem value={2}>2</MenuItem>
                <MenuItem value={3}>3</MenuItem>
                <MenuItem value={4}>4</MenuItem>
                <MenuItem value={5}>5</MenuItem>
                <MenuItem value={6}>6</MenuItem>
                <MenuItem value={7}>7</MenuItem>
                <MenuItem value={8}>8</MenuItem>
                <MenuItem value={9}>9</MenuItem>
                <MenuItem value={10}>10</MenuItem>
              </Select>
              <FormHelperText>Number of vesting periods</FormHelperText>
            </FormControl>
          </div>
          <div
            style={{
              marginTop: '24px',
              float: 'right',
              marginBottom: '24px',
            }}
          >
            <Button
              variant="contained"
              color="primary"
              disabled={!submitBtnEnabled || isLoading}
              onClick={async () => {
                setIsLoading(true);
                enqueueSnackbar('Creating vesting acount...', {
                  variant: 'info',
                });
                let { vesting } = await client.createVesting({
                  beneficiary: new PublicKey(beneficiary),
                  endTs: new BN(timestamp),
                  periodCount: new BN(periodCount),
                  depositAmount: new BN(amount),
                  needsAssignment: null,
                  depositor: new PublicKey(fromAccount),
                });
                const vestingAccount = await client.accounts.vesting(vesting);
                dispatch({
                  type: ActionType.VestingAccountCreate,
                  item: {
                    vesting: {
                      publicKey: vesting,
                      vesting: vestingAccount,
                    },
                  },
                });
                setIsLoading(false);
                enqueueSnackbar(`Vesting account created ${vesting}`, {
                  variant: 'success',
                });
              }}
            >
              Create
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

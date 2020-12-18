import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import BN from 'bn.js';
import { useSnackbar } from 'notistack';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import Button from '@material-ui/core/Button';
import Tabs from '@material-ui/core/Tabs';
import MenuItem from '@material-ui/core/MenuItem';
import Tab from '@material-ui/core/Tab';
import Typography from '@material-ui/core/Typography';
import TextField from '@material-ui/core/TextField';
import FormHelperText from '@material-ui/core/FormHelperText';
import FormControl from '@material-ui/core/FormControl';
import InputLabel from '@material-ui/core/InputLabel';
import Select from '@material-ui/core/Select';
import { PublicKey } from '@solana/web3.js';
import { Network } from '@project-serum/common';
import { useWallet } from '../../components/common/WalletProvider';
import { State as StoreState } from '../../store/reducer';
import OwnedTokenAccountsSelect from '../common/OwnedTokenAccountsSelect';
import * as notification from '../common/Notification';
import { fromDisplaySrm, fromDisplayMsrm } from '../../utils/tokens';

export default function DropRewardButton() {
  const [showDialog, setShowDialog] = useState(false);
  return (
    <>
      <div onClick={() => setShowDialog(true)}>
        <Button variant="contained" color="secondary">
          Drop Rewards
        </Button>
      </div>
      <DropRewardDialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
      />
    </>
  );
}

enum PoolTabViewModel {
  Srm,
  Msrm,
}

enum RewardTypeViewModel {
  Unlocked,
  Locked,
}

type DropRewardsDialogProps = {
  open: boolean;
  onClose: () => void;
};

function DropRewardDialog(props: DropRewardsDialogProps) {
  const { open, onClose } = props;

  const [poolTab, setPoolTab] = useState(PoolTabViewModel.Srm);
  const [rewardTypeTab, setRewardTypeTab] = useState(
    RewardTypeViewModel.Unlocked,
  );

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="h4" component="h2">
            {'Drop Rewards'}
          </Typography>
        </div>
      </DialogTitle>
      <DialogContent>
        <Tabs value={rewardTypeTab} onChange={(_e, t) => setRewardTypeTab(t)}>
          <Tab value={RewardTypeViewModel.Unlocked} label="Unlocked" />
          <Tab value={RewardTypeViewModel.Locked} label="Locked" />
        </Tabs>
        <Tabs
          style={{ marginTop: '10px' }}
          value={poolTab}
          onChange={(_e, t) => setPoolTab(t)}
        >
          <Tab value={PoolTabViewModel.Srm} label="Pool" />
          <Tab value={PoolTabViewModel.Msrm} label="Mega Pool" />
        </Tabs>
        {rewardTypeTab === RewardTypeViewModel.Unlocked && (
          <DropUnlockedForm onClose={onClose} poolTab={poolTab} />
        )}
        {rewardTypeTab === RewardTypeViewModel.Locked && (
          <DropLockedForm onClose={onClose} poolTab={poolTab} />
        )}
      </DialogContent>
    </Dialog>
  );
}

type DropUnlockedFormProps = {
  onClose: () => void;
  poolTab: PoolTabViewModel;
};

function DropUnlockedForm(props: DropUnlockedFormProps) {
  const { onClose, poolTab } = props;
  const snack = useSnackbar();
  const { registryClient } = useWallet();
  const { network, poolMint, megaPoolMint } = useSelector(
    (state: StoreState) => {
      return {
        network: state.common.network,
        poolMint: state.registry.registrar!.account.poolMint,
        megaPoolMint: state.registry.registrar!.account.poolMintMega,
      };
    },
  );

  const [lockedRewardDisplayAmount, setLockedRewardDisplayAmount] = useState<
    null | number
  >(null);
  const [expiryTs, setExpiryTs] = useState<null | number>(null);
  const [depositor, setDepositor] = useState<null | PublicKey>(null);
  const [mintLabel, setMintLabel] = useState('srm');
  const [mint, setMint] = useState<null | PublicKey>(network.srm);

  const isSendEnabled =
    mint !== null &&
    depositor !== null &&
    lockedRewardDisplayAmount !== null &&
    expiryTs !== null;

  const sendUnlockedReward = async () => {
    await notification.withTx(
      snack,
      'Dropping unllocked reward...',
      'Unlocked reward dropped',
      async () => {
        const lockedRewardAmount = mint!.equals(network.srm)
          ? fromDisplaySrm(lockedRewardDisplayAmount!)
          : fromDisplayMsrm(lockedRewardDisplayAmount!);
        let { tx } = await registryClient.dropUnlockedReward({
          total: lockedRewardAmount,
          expiryTs: new BN(expiryTs as number),
          depositor: depositor as PublicKey,
          depositorMint: mint as PublicKey,
          poolTokenMint:
            poolTab === PoolTabViewModel.Srm ? poolMint : megaPoolMint,
        });
        return tx;
      },
    );
    onClose();
  };
  const onClick = () => {
    sendUnlockedReward().catch(err => {
      snack.enqueueSnackbar(
        `Error dropping unlocked reward: ${err.toString()}`,
        {
          variant: 'error',
        },
      );
    });
  };
  return (
    <DropVendorForm
      network={network}
      mint={mint}
      setMint={setMint}
      mintLabel={mintLabel}
      setMintLabel={setMintLabel}
      setDepositor={setDepositor}
      setLockedRewardDisplayAmount={setLockedRewardDisplayAmount}
      expiryTs={expiryTs}
      setExpiryTs={setExpiryTs}
      onCancel={onClose}
      onClick={onClick}
      isSendEnabled={isSendEnabled}
    />
  );
}

type DropLockedFormProps = DropUnlockedFormProps;

function DropLockedForm(props: DropLockedFormProps) {
  const { onClose, poolTab } = props;
  const snack = useSnackbar();
  const { registryClient } = useWallet();
  const { network, poolMint, megaPoolMint } = useSelector(
    (state: StoreState) => {
      return {
        network: state.common.network,
        poolMint: state.registry.registrar!.account.poolMint,
        megaPoolMint: state.registry.registrar!.account.poolMintMega,
      };
    },
  );

  const [lockedRewardDisplayAmount, setLockedRewardDisplayAmount] = useState<
    null | number
  >(null);
  const [endTs, setEndTs] = useState<null | number>(null);
  const [expiryTs, setExpiryTs] = useState<null | number>(null);
  const [depositor, setDepositor] = useState<null | PublicKey>(null);
  const [mintLabel, setMintLabel] = useState('srm');
  const [mint, setMint] = useState<null | PublicKey>(network.srm);
  const [periodCount, setPeriodCount] = useState(7);

  const isSendEnabled =
    mint !== null &&
    depositor !== null &&
    lockedRewardDisplayAmount !== null &&
    expiryTs !== null;

  const sendLockedRewards = async () => {
    await notification.withTx(
      snack,
      'Dropping locked reward...',
      'Locked reward dropped',
      async () => {
        const lockedRewardAmount = mint!.equals(network.srm)
          ? fromDisplaySrm(lockedRewardDisplayAmount!)
          : fromDisplayMsrm(lockedRewardDisplayAmount!);
        let { tx } = await registryClient.dropLockedReward({
          total: lockedRewardAmount,
          endTs: new BN(endTs as number),
          expiryTs: new BN(expiryTs as number),
          depositor: depositor as PublicKey,
          depositorMint: mint as PublicKey,
          poolTokenMint:
            poolTab === PoolTabViewModel.Srm ? poolMint : megaPoolMint,
          periodCount: new BN(periodCount),
        });
        return tx;
      },
    );
    onClose();
  };

  const onClick = () => {
    sendLockedRewards().catch(err => {
      snack.enqueueSnackbar(`Error dropping locked reward: ${err.toString()}`, {
        variant: 'error',
      });
    });
  };

  return (
    <DropVendorForm
      network={network}
      mint={mint}
      setMint={setMint}
      mintLabel={mintLabel}
      setMintLabel={setMintLabel}
      setDepositor={setDepositor}
      setLockedRewardDisplayAmount={setLockedRewardDisplayAmount}
      setEndTs={setEndTs}
      periodCount={periodCount}
      setPeriodCount={setPeriodCount}
      expiryTs={expiryTs}
      setExpiryTs={setExpiryTs}
      onCancel={onClose}
      onClick={onClick}
      isSendEnabled={isSendEnabled}
    />
  );
}

type DropVendorFormProps = {
  network: Network;
  mint: PublicKey | null;
  mintLabel: string;
  setMintLabel: (s: string) => void;
  setMint: (m: PublicKey) => void;
  setDepositor: (pk: PublicKey) => void;
  setLockedRewardDisplayAmount: (n: number) => void;
  setEndTs?: (n: number) => void;
  periodCount?: number;
  setPeriodCount?: (p: number) => void;
  expiryTs: number | null;
  setExpiryTs: (ts: number) => void;
  onCancel: () => void;
  onClick: () => void;
  isSendEnabled: boolean;
};

function DropVendorForm(props: DropVendorFormProps) {
  const {
    network,
    mint,
    setDepositor,
    mintLabel,
    setMintLabel,
    setMint,
    setLockedRewardDisplayAmount,
    setEndTs,
    periodCount,
    setPeriodCount,
    expiryTs,
    setExpiryTs,
    onCancel,
    onClick,
    isSendEnabled,
  } = props;

  return (
    <>
      <div>
        <div style={{ display: 'flex', marginTop: '10px' }}>
          <div style={{ flex: 1 }}>
            <OwnedTokenAccountsSelect
              style={{ height: '100%' }}
              mint={mint}
              onChange={(f: PublicKey) => setDepositor(f)}
            />
            <FormHelperText>Account to send from</FormHelperText>
          </div>
          <div>
            <FormControl
              variant="outlined"
              style={{ width: '200px', marginLeft: '10px', marginTop: '10px' }}
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
                }}
                label="Mint"
              >
                <MenuItem value="srm">SRM</MenuItem>
                <MenuItem value="msrm">MSRM</MenuItem>
              </Select>
            </FormControl>
          </div>
          <div>
            <TextField
              style={{ marginLeft: '10px', marginTop: '10px' }}
              id="outlined-number"
              label="Amount"
              type="number"
              InputLabelProps={{
                shrink: true,
              }}
              variant="outlined"
              onChange={e =>
                setLockedRewardDisplayAmount(
                  parseFloat(e.target.value) as number,
                )
              }
              InputProps={{ inputProps: { min: 0 } }}
            />
          </div>
        </div>
        {setEndTs !== undefined && (
          <div style={{ display: 'flex', marginTop: '37px' }}>
            <div style={{ flex: 1 }}>
              <TextField
                fullWidth
                label="End date"
                type="datetime-local"
                InputLabelProps={{
                  shrink: true,
                }}
                onChange={e => {
                  const d = new Date(e.target.value);
                  setEndTs(d.getTime() / 1000);
                }}
              />
              <FormHelperText>
                Date the vesting account is fully vested
              </FormHelperText>
            </div>
            <div>
              <TextField
                style={{ marginLeft: '10px', marginTop: '10px' }}
                id="outlined-number"
                label="Period Count"
                type="number"
                InputLabelProps={{
                  shrink: true,
                }}
                variant="outlined"
                value={periodCount}
                onChange={e =>
                  setPeriodCount!(parseInt(e.target.value) as number)
                }
                InputProps={{ inputProps: { min: 1 } }}
              />
            </div>
          </div>
        )}
        <div style={{ marginTop: '37px', display: 'flex' }}>
          <div
            style={{
              flex: 1,
              height: '100%',
              marginRight: '10px',
            }}
          >
            <TextField
              fullWidth
              label="Expiry date"
              type="datetime-local"
              InputLabelProps={{
                shrink: true,
              }}
              onChange={e => {
                const d = new Date(e.target.value);
                setExpiryTs(d.getTime() / 1000);
              }}
            />
          </div>
          <div style={{ marginTop: '26px' }}>
            <TextField
              style={{ height: '100%' }}
              disabled
              placeholder="Expiry Unix timestamp"
              fullWidth
              value={expiryTs}
            />
          </div>
        </div>
      </div>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button
          onClick={onClick}
          type="submit"
          color="primary"
          disabled={!isSendEnabled}
        >
          Send
        </Button>
      </DialogActions>
    </>
  );
}

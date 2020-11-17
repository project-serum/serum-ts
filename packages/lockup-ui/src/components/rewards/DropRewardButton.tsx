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
  Pool,
}

type DropRewardsDialogProps = {
  open: boolean;
  onClose: () => void;
};

function DropRewardDialog(props: DropRewardsDialogProps) {
  const { open, onClose } = props;

  const [poolTab, setPoolTab] = useState(PoolTabViewModel.Srm);
  const [rewardTypeTab, setRewardTypeTab] = useState(RewardTypeViewModel.Pool);

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
          <Tab value={RewardTypeViewModel.Pool} label="Pool" />
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
        {rewardTypeTab === RewardTypeViewModel.Pool && (
          <DropPoolForm onClose={onClose} poolTab={poolTab} />
        )}
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

type DropPoolFormProps = {
  onClose: () => void;
  poolTab: PoolTabViewModel;
};

function DropUnlockedForm(props: DropPoolFormProps) {
  const { onClose, poolTab } = props;
  const snack = useSnackbar();
  const { registryClient } = useWallet();
  const {
    network,
    pool,
    megaPool,
    poolTokenMint,
    megaPoolTokenMint,
  } = useSelector((state: StoreState) => {
    return {
      network: state.common.network,
      pool: state.registry.pool!,
      poolTokenMint: state.registry.poolTokenMint!,
      megaPool: state.registry.megaPool!,
      megaPoolTokenMint: state.registry.megaPoolTokenMint!,
    };
  });

  const [lockedRewardAmount, setLockedRewardAmount] = useState<null | number>(
    null,
  );
  const [expiryTs, setExpiryTs] = useState<null | number>(null);
  const [expiryReceiver, setExpiryReceiver] = useState(
    registryClient.provider.wallet.publicKey.toString(),
  );
  const [depositor, setDepositor] = useState<null | PublicKey>(null);
  const [mintLabel, setMintLabel] = useState('srm');
  const [mint, setMint] = useState<null | PublicKey>(network.srm);

  const isSendEnabled =
    mint !== null &&
    depositor !== null &&
    lockedRewardAmount !== null &&
    expiryTs !== null;

  const sendUnlockedReward = async () => {
    await notification.withTx(
      snack,
      'Dropping unllocked reward...',
      'Unlocked reward dropped',
      async () => {
        let { tx } = await registryClient.dropUnlockedReward({
          total: new BN(lockedRewardAmount as number),
          expiryTs: new BN(expiryTs as number),
          expiryReceiver: new PublicKey(expiryReceiver as string),
          depositor: depositor as PublicKey,
          depositorMint: mint as PublicKey,
          pool:
            poolTab === PoolTabViewModel.Srm
              ? pool.publicKey
              : megaPool.publicKey,
          poolTokenMint:
            poolTab === PoolTabViewModel.Srm
              ? poolTokenMint.publicKey
              : megaPoolTokenMint.publicKey,
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
      setLockedRewardAmount={setLockedRewardAmount}
      expiryReceiver={expiryReceiver}
      setExpiryReceiver={setExpiryReceiver}
      expiryTs={expiryTs}
      setExpiryTs={setExpiryTs}
      onCancel={onClose}
      onClick={onClick}
      isSendEnabled={isSendEnabled}
    />
  );
}

function DropLockedForm(props: DropPoolFormProps) {
  const { onClose, poolTab } = props;
  const snack = useSnackbar();
  const { registryClient } = useWallet();
  const {
    network,
    pool,
    megaPool,
    poolTokenMint,
    megaPoolTokenMint,
  } = useSelector((state: StoreState) => {
    return {
      network: state.common.network,
      pool: state.registry.pool!,
      poolTokenMint: state.registry.poolTokenMint!,
      megaPool: state.registry.megaPool!,
      megaPoolTokenMint: state.registry.megaPoolTokenMint!,
    };
  });

  const [lockedRewardAmount, setLockedRewardAmount] = useState<null | number>(
    null,
  );
  const [endTs, setEndTs] = useState<null | number>(null);
  const [expiryTs, setExpiryTs] = useState<null | number>(null);
  const [expiryReceiver, setExpiryReceiver] = useState(
    registryClient.provider.wallet.publicKey.toString(),
  );
  const [depositor, setDepositor] = useState<null | PublicKey>(null);
  const [mintLabel, setMintLabel] = useState('srm');
  const [mint, setMint] = useState<null | PublicKey>(network.srm);
  const [periodCount, setPeriodCount] = useState(7);

  const isSendEnabled =
    mint !== null &&
    depositor !== null &&
    lockedRewardAmount !== null &&
    expiryTs !== null;

  const sendLockedRewards = async () => {
    await notification.withTx(
      snack,
      'Dropping locked reward...',
      'Locked reward dropped',
      async () => {
        let { tx } = await registryClient.dropLockedReward({
          total: new BN(lockedRewardAmount as number),
          endTs: new BN(endTs as number),
          expiryTs: new BN(expiryTs as number),
          expiryReceiver: new PublicKey(expiryReceiver as string),
          depositor: depositor as PublicKey,
          depositorMint: mint as PublicKey,
          pool:
            poolTab === PoolTabViewModel.Srm
              ? pool.publicKey
              : megaPool.publicKey,
          poolTokenMint:
            poolTab === PoolTabViewModel.Srm
              ? poolTokenMint.publicKey
              : megaPoolTokenMint.publicKey,
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
      setLockedRewardAmount={setLockedRewardAmount}
      setEndTs={setEndTs}
      periodCount={periodCount}
      setPeriodCount={setPeriodCount}
      expiryReceiver={expiryReceiver}
      setExpiryReceiver={setExpiryReceiver}
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
  setLockedRewardAmount: (n: number) => void;
  setEndTs?: (n: number) => void;
  periodCount?: number;
  setPeriodCount?: (p: number) => void;
  expiryReceiver: string;
  setExpiryReceiver: (r: string) => void;
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
    setLockedRewardAmount,
    setEndTs,
    periodCount,
    setPeriodCount,
    expiryReceiver,
    setExpiryReceiver,
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
                setLockedRewardAmount(parseInt(e.target.value) as number)
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
        <TextField
          style={{ marginTop: '37px', width: '100%' }}
          label="Expiry Receiver"
          variant="outlined"
          value={expiryReceiver}
          onChange={e => setExpiryReceiver(e.target.value as string)}
        />
        <div style={{ display: 'flex' }}>
          <div
            style={{
              flex: 1,
              height: '100%',
              marginTop: '10px',
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

type DropLockedFormProps = {
  poolTab: PoolTabViewModel;
  onClose: () => void;
};

function DropPoolForm(props: DropLockedFormProps) {
  const { poolTab, onClose } = props;
  const snack = useSnackbar();
  const { network, pool, poolVault, megaPool, megaPoolVaults } = useSelector(
    (state: StoreState) => {
      return {
        network: state.common.network,
        pool: state.registry.pool!,
        poolVault: state.registry.poolVault!,
        megaPool: state.registry.megaPool!,
        megaPoolVaults: state.registry.megaPoolVaults!,
      };
    },
  );
  const { registryClient } = useWallet();
  const [srmFromAccount, setSrmFromAccount] = useState<null | PublicKey>(null);
  const [msrmFromAccount, setMsrmFromAccount] = useState<null | PublicKey>(
    null,
  );
  const [rewardAmount, setRewardAmount] = useState<null | number>(null);
  const [rewardMegaAmount, setRewardMegaAmount] = useState<null | number>(null);

  const sendPoolRewards = async () => {
    await notification.withTx(
      snack,
      'Dropping reward on pool...',
      'Pool reward dropped',
      async () => {
        let { tx } = await registryClient.dropPoolReward({
          pool:
            poolTab === PoolTabViewModel.Srm
              ? pool.publicKey
              : megaPool.publicKey,
          srmDepositor: srmFromAccount as PublicKey,
          msrmDepositor:
            poolTab === PoolTabViewModel.Msrm
              ? (msrmFromAccount as PublicKey)
              : undefined,
          srmAmount: new BN(rewardAmount!),
          msrmAmount:
            poolTab === PoolTabViewModel.Msrm
              ? new BN(rewardMegaAmount!)
              : undefined,
          poolSrmVault:
            poolTab === PoolTabViewModel.Msrm
              ? megaPoolVaults[0].publicKey
              : poolVault.publicKey,
          poolMsrmVault:
            poolTab === PoolTabViewModel.Msrm
              ? megaPoolVaults[1].publicKey
              : undefined,
        });
        return tx;
      },
    );
    onClose();
  };

  const isSendEnabled = (() => {
    // todo
    return true;
  })();

  return (
    <>
      <div>
        <div style={{ display: 'flex', marginBottom: '10px' }}>
          <div style={{ flex: 1 }}>
            <OwnedTokenAccountsSelect
              style={{ height: '100%' }}
              mint={network.srm}
              onChange={(f: PublicKey) => setSrmFromAccount(f)}
            />
            <FormHelperText>SRM account to send from</FormHelperText>
          </div>
          <TextField
            style={{ width: '200px', marginLeft: '24px' }}
            id="outlined-number"
            label="Amount"
            type="number"
            InputLabelProps={{
              shrink: true,
            }}
            variant="outlined"
            onChange={e => setRewardAmount(parseInt(e.target.value) as number)}
            InputProps={{ inputProps: { min: 0 } }}
          />
        </div>
        {poolTab === PoolTabViewModel.Msrm && (
          <div style={{ display: 'flex' }}>
            <div style={{ flex: 1 }}>
              <OwnedTokenAccountsSelect
                style={{ height: '100%' }}
                mint={network.msrm}
                onChange={(f: PublicKey) => setMsrmFromAccount(f)}
              />
              <FormHelperText>MSRM account to send from</FormHelperText>
            </div>
            <TextField
              style={{ width: '200px', marginLeft: '24px' }}
              id="outlined-number"
              label="Amount"
              type="number"
              InputLabelProps={{
                shrink: true,
              }}
              variant="outlined"
              onChange={e =>
                setRewardMegaAmount(parseInt(e.target.value) as number)
              }
              InputProps={{ inputProps: { min: 0 } }}
            />
          </div>
        )}
      </div>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={() =>
            sendPoolRewards().catch(err => {
              snack.enqueueSnackbar(
                `Error dropping unlocked reward: ${err.toString()}`,
                {
                  variant: 'error',
                },
              );
            })
          }
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

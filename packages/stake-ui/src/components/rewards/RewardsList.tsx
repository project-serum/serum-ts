import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { useSnackbar } from 'notistack';
import CircularProgress from '@material-ui/core/CircularProgress';
import LockIcon from '@material-ui/icons/Lock';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import Collapse from '@material-ui/core/Collapse';
import ExpandLess from '@material-ui/icons/ExpandLess';
import ExpandMore from '@material-ui/icons/ExpandMore';
import Button from '@material-ui/core/Button';
import { PublicKey, SYSVAR_CLOCK_PUBKEY } from '@solana/web3.js';
import { TokenInstructions } from '@project-serum/serum';
import OwnedTokenAccountsSelect from '../../components/common/OwnedTokenAccountsSelect';
import { useWallet } from '../../components/common/WalletProvider';
import { toDisplay } from '../../utils/tokens';
import { ProgramAccount } from '../../store/reducer';
import { Network } from '../../store/config';
import { State as StoreState } from '../../store/reducer';
import { ViewTransactionOnExplorerButton } from '../../components/common/Notification';

type RewardsListProps = {
  rewards: (RewardListItemViewModel | null)[];
};

export default function RewardsList(props: RewardsListProps) {
  const { rewards } = props;
  let loading = false;
  rewards.forEach(r => {
    if (r === null) {
      loading = true;
    }
  });
  return (
    <List>
      {loading ? (
        <CircularProgress
          style={{
            display: 'block',
            marginLeft: 'auto',
            marginRight: 'auto',
          }}
        />
      ) : rewards.length > 0 ? (
        rewards
          .filter(r => r!.vendor.account.expired === false)
          .map(r => {
            return <RewardListItem rli={r as RewardListItemViewModel} />;
          })
      ) : (
        <ListItem>
          <ListItemText primary={'No rewards found'} />
        </ListItem>
      )}
    </List>
  );
}

type RewardListItemProps = {
  rli: RewardListItemViewModel;
};

function RewardListItem(props: RewardListItemProps) {
  const { rli } = props;

  const [open, setOpen] = useState(false);

  const dateLabel = new Date(
    rli.vendor!.account.startTs.toNumber() * 1000,
  ).toLocaleString();
  let fromLabel = `Dropped by ${rli.vendor.account.from.toString()} | ${dateLabel}`;
  return (
    <>
      <ListItem button onClick={() => setOpen(open => !open)}>
        <LockIcon
          style={{
            visibility: rli.reward.locked ? 'visible' : 'hidden',
            marginRight: '16px',
          }}
        />
        <ListItemText
          primary={
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                color: rli.needsClaim ? '#54a15e' : '',
              }}
            >
              <div>{`${toDisplay(
                rli.vendor.account.total,
                rli.mint!.account.decimals,
              )} ${rli.mint!.publicKey}`}</div>
            </div>
          }
          secondary={fromLabel}
        />
        {open ? <ExpandLess /> : <ExpandMore />}
      </ListItem>
      <Collapse in={open} timeout="auto" unmountOnExit>
        {rli.vendor === undefined ? (
          <CircularProgress />
        ) : (
          <RewardListItemDetails vendor={rli.vendor!} />
        )}
      </Collapse>
    </>
  );
}

type RewardListItemDetailsProps = {
  vendor: ProgramAccount;
};

function RewardListItemDetails(props: RewardListItemDetailsProps) {
  let { vendor } = props;
  const { registryClient } = useWallet();
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();
  const { vendorMint, registrar } = useSelector((state: StoreState) => {
    return {
      registrar: state.registry.registrar,
      vendorMint: state.accounts[vendor.account.mint.toString()],
    };
  });
  const [
    expiryReceiverToken,
    setExpiryReceiverToken,
  ] = useState<null | PublicKey>(null);
  const expire = async () => {
    enqueueSnackbar('Expiring reward', {
      variant: 'info',
    });
    const vendorSigner = await PublicKey.createProgramAddress(
      [
        registrar.toBuffer(),
        vendor.publicKey.toBuffer(),
        Buffer.from([vendor.account.nonce]),
      ],
      registryClient.programId,
    );

    const tx = await registryClient.rpc.expireReward({
      accounts: {
        registrar,
        vendor: vendor.publicKey,
        vault: vendor.account.vault,
        vendorSigner,
        expiryReceiver: vendor.account.expiryReceiver,
        expiryReceiverToken,
        tokenProgram: TokenInstructions.TOKEN_PROGRAM_ID,
        clock: SYSVAR_CLOCK_PUBKEY,
      },
    });
    closeSnackbar();
    enqueueSnackbar(`Reward expired`, {
      variant: 'success',
      action: <ViewTransactionOnExplorerButton signature={tx as string} />,
    });
  };
  return (
    <div
      style={{
        marginLeft: '56px',
      }}
    >
      <div>Vendor</div>
      <ul>
        <li>Address {vendor.publicKey.toString()}</li>
        <li>Vault: {vendor.account.vault.toString()}</li>
        <li>Mint: {vendor.account.mint.toString()}</li>
        <li>
          Pool token supply snapshot:{' '}
          {vendor.account.poolTokenSupply.toString()}
        </li>
        <li>
          Expiry:{' '}
          {new Date(
            vendor.account.expiryTs.toNumber() * 1000,
          ).toLocaleDateString()}
          {` (${vendor.account.expiryTs.toNumber()})`}
        </li>
        <li>Expiry receiver: {vendor.account.expiryReceiver.toString()}</li>
        <li>Expired: {vendor.account.expired.toString()}</li>
        <li>
          Reward queue cursor: {vendor.account.rewardEventQCursor.toString()}
        </li>
      </ul>
      {(vendor.account.expiryTs.toNumber() <= Date.now()/1000) && (
        <div style={{ display: 'flex', flexDirection: 'row-reverse' }}>
          <Button
            color="primary"
            variant="outlined"
            onClick={expire}
            style={{ marginRight: '24px' }}
          >
            Expire
          </Button>
          <div style={{ flex: 1, marginRight: '24px' }}>
            <OwnedTokenAccountsSelect
              variant="outlined"
              decimals={vendorMint.decimals}
              mint={vendor.account.mint}
              onChange={(f: PublicKey) => {
                setExpiryReceiverToken(f);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export class RewardListItemViewModel {
  constructor(
    readonly reward: any,
    readonly cursor: number,
    readonly needsClaim: boolean,
    readonly mint: ProgramAccount,
    readonly vendor: ProgramAccount,
  ) {}

  static fromMessage(ctx: Context, event: any): RewardListItemViewModel | null {
    let needsClaim = false;

    const vendor = ctx.accounts[event.vendor.toString()];

    if (vendor === undefined) {
      return null;
    }

    const mint = {
      publicKey: vendor.mint,
      account: ctx.accounts[vendor.mint.toString()],
    };

    if (ctx.member !== undefined) {
      // Must own shares of the reward's target pool.
      const sptAccount =
        ctx.accounts[ctx.member.account.balances.spt.toString()];
      const lockedSptAccount =
        ctx.accounts[ctx.member.account.balancesLocked.spt.toString()];

      const ownsPoolShares = sptAccount.amount + lockedSptAccount.amount > 0;

      // Must not have claimed the reward yet.
      const notYetClaimed =
        vendor.rewardEventQCursor >= ctx.member.account.rewardsCursor;

      // Must have staked before the reward was dropped.
      const isEligible = ctx.member.account.lastStakeTs < vendor.startTs;

      // Must not have let the reward expire.
      const expired = vendor.expired;

      needsClaim = ownsPoolShares && notYetClaimed && isEligible && !expired;
    }

    const vendorProgramAccount = {
      publicKey: event.vendor,
      account: vendor,
    };

    return new RewardListItemViewModel(
      event,
      vendor.rewardEventQCursor,
      needsClaim,
      mint,
      vendorProgramAccount,
    );
  }
}

type Context = {
  accounts: any;
  rewardEventQueue: ProgramAccount;
  member?: ProgramAccount;
  network: Network;
};

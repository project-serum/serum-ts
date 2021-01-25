import React, { useState } from 'react';
import CircularProgress from '@material-ui/core/CircularProgress';
import LockIcon from '@material-ui/icons/Lock';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import Collapse from '@material-ui/core/Collapse';
import ExpandLess from '@material-ui/icons/ExpandLess';
import ExpandMore from '@material-ui/icons/ExpandMore';
import { toDisplay } from '../../utils/tokens';
import { ProgramAccount } from '../../store/reducer';
import { Network } from '../../store/config';

type RewardsListProps = {
  rewards: (RewardListItemViewModel | null)[];
};

export default function RewardsList(props: RewardsListProps) {
  const { rewards } = props;
  return (
    <List>
      {rewards.length > 0 ? (
        rewards.map(r =>
          r === null ? (
            <CircularProgress
              style={{
                display: 'block',
                marginLeft: 'auto',
                marginRight: 'auto',
              }}
            />
          ) : (
            <RewardListItem rli={r} />
          ),
        )
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
        </li>
        <li>Expiry receiver: {vendor.account.expiryReceiver.toString()}</li>
        <li>Expired: {vendor.account.expired.toString()}</li>
        <li>
          Reward queue cursor: {vendor.account.rewardEventQCursor.toString()}
        </li>
      </ul>
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

  static fromMessage(
    ctx: Context,
    event: any,
    idx: number,
  ): RewardListItemViewModel | null {
    let cursor = ctx.rewardEventQueue!.account.tail + idx;
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
      const notYetClaimed = cursor >= ctx.member.account.rewardsCursor;

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
      cursor,
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

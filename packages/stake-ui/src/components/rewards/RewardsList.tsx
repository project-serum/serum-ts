import React, { useState } from 'react';
import BN from 'bn.js';
import CircularProgress from '@material-ui/core/CircularProgress';
import LockIcon from '@material-ui/icons/Lock';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import Collapse from '@material-ui/core/Collapse';
import Typography from '@material-ui/core/Typography';
import ExpandLess from '@material-ui/icons/ExpandLess';
import ExpandMore from '@material-ui/icons/ExpandMore';
import { PublicKey } from '@solana/web3.js';
import { Network, ProgramAccount } from '@project-serum/common';
import * as registry from '@project-serum/registry';
import { displaySrm, displayMsrm } from '../../utils/tokens';

type RewardsListProps = {
  rewards: RewardListItemViewModel[];
  network: Network;
};

export default function RewardsList(props: RewardsListProps) {
  const { rewards, network } = props;
  return (
    <List>
      {rewards.length > 0 ? (
        rewards.map(r => <RewardListItem network={network} rli={r} />)
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
  network: Network;
};

function RewardListItem(props: RewardListItemProps) {
  const { rli, network } = props;

  const rewardEvent = rli.reward.lockedAlloc ?? rli.reward.unlockedAlloc!;

  const [open, setOpen] = useState(false);
  let amountLabel = (() => {
    if (rewardEvent.mint.equals(network.srm)) {
      return `${displaySrm(rewardEvent.total)} SRM`;
    } else if (rewardEvent.mint.equals(network.msrm)) {
      return `${displayMsrm(rewardEvent.total)} MSRM`;
    } else {
      amountLabel += `${rewardEvent.mint}`;
    }
  })();
  let lockedLabel = 'vendored';
  let fromLabel = `${rewardEvent.pool.toString()} | ${rewardEvent.from.toString()} | ${
    rli.cursor
  }`;

  return (
    <>
      <ListItem button onClick={() => setOpen(open => !open)}>
        <LockIcon
          style={{
            visibility:
              rli.reward.lockedAlloc === undefined ? 'hidden' : 'visible',
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
              <div>{`${amountLabel} ${lockedLabel}`}</div>
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
          <RewardListItemDetails vendor={rli.vendor} />
        )}
      </Collapse>
    </>
  );
}

type RewardListItemDetailsProps = {
  vendor: ProgramAccount<
    | registry.accounts.LockedRewardVendor
    | registry.accounts.UnlockedRewardVendor
  >;
};

function RewardListItemDetails(props: RewardListItemDetailsProps) {
  let { vendor } = props;

  return (
    <div
      style={{
        marginLeft: '56px',
      }}
    >
      <Typography variant="h6">Vendor</Typography>
      <Typography>Address: {vendor.publicKey.toString()}</Typography>
      <Typography>Vault: {vendor.account.vault.toString()}</Typography>
      <Typography>
        Pool token supply snapshot: {vendor.account.poolTokenSupply.toString()}
      </Typography>
      <Typography>
        Expiry:{' '}
        {new Date(
          vendor.account.expiryTs.toNumber() * 1000,
        ).toLocaleDateString()}
      </Typography>
      <Typography>
        Expiry receiver: {vendor.account.expiryReceiver.toString()}
      </Typography>
    </div>
  );
}

export class RewardListItemViewModel {
  constructor(
    readonly reward: registry.accounts.RewardEvent,
    readonly cursor: number,
    readonly needsClaim: boolean,
    readonly vendor?: ProgramAccount<
      | registry.accounts.LockedRewardVendor
      | registry.accounts.UnlockedRewardVendor
    >,
  ) {}

  static fromMessage(
    ctx: Context,
    event: registry.accounts.RewardEvent,
    idx: number,
  ): RewardListItemViewModel {
    let cursor = ctx.rewardEventQueue!.account.tailCursor() + idx;
    let needsClaim = false;
    let vendor = undefined;
    if (event.lockedAlloc !== undefined || event.unlockedAlloc !== undefined) {
      const eventInner = event.lockedAlloc
        ? event.lockedAlloc
        : event.unlockedAlloc!;
      vendor = ctx.vendors.get(eventInner.vendor.toString());
      if (vendor !== undefined && ctx.member !== undefined) {
        const ownsPool =
          ctx.member.account.balances.filter(
            b => b.spt.amount.cmp(new BN(0)) === 1,
          ).length > 0;
        const ownsPoolMega =
          ctx.member.account.balances.filter(
            b => b.sptMega.amount.cmp(new BN(0)) === 1,
          ).length > 0;
        // The member must own shares of the reward's target pool.
        const ownsPoolShares = eventInner.pool.equals(ctx.poolMint)
          ? ownsPool
          : ownsPoolMega;
        const notYetClaimed = cursor >= ctx.member.account.member.rewardsCursor;
        const isEligible =
          ctx.member.account.member.lastStakeTs < vendor.account.startTs;

        needsClaim = ownsPoolShares && notYetClaimed && isEligible;
      }
    }
    return new RewardListItemViewModel(event, cursor, needsClaim, vendor);
  }
}

type Context = {
  rewardEventQueue: ProgramAccount<registry.accounts.RewardEventQueue>;
  member: ProgramAccount<registry.accounts.MemberDeref>;
  network: Network;
  vendors: Map<
    string,
    ProgramAccount<
      | registry.accounts.LockedRewardVendor
      | registry.accounts.UnlockedRewardVendor
    >
  >;
  poolMint: PublicKey;
};

import React, { useState } from 'react';
import BN from 'bn.js';
import CircularProgress from '@material-ui/core/CircularProgress';
import LockIcon from '@material-ui/icons/Lock';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import Collapse from '@material-ui/core/Collapse';
import ExpandLess from '@material-ui/icons/ExpandLess';
import ExpandMore from '@material-ui/icons/ExpandMore';
import { PublicKey } from '@solana/web3.js';
import { Network, ProgramAccount } from '@project-serum/common';
import * as registry from '@project-serum/registry';
import { displaySrm, displayMsrm } from '../../utils/tokens';

type RewardsListProps = {
  rewards: RewardListItemViewModel[];
  network: Network;
  registrar: ProgramAccount<registry.accounts.Registrar>;
};

export default function RewardsList(props: RewardsListProps) {
  const { rewards, network, registrar } = props;
  return (
    <List>
      {rewards.length > 0 ? (
        rewards.map(r => (
          <RewardListItem registrar={registrar} network={network} rli={r} />
        ))
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
  registrar: ProgramAccount<registry.accounts.Registrar>;
};

function RewardListItem(props: RewardListItemProps) {
  const { rli, network, registrar } = props;

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
  const dateLabel =
    rli.vendor === undefined
      ? ''
      : new Date(
          rli.vendor!.account.startTs.toNumber() * 1000,
        ).toLocaleString();
  const poolLabel = rewardEvent.pool.equals(registrar.account.poolMintMega)
    ? 'MSRM pool'
    : 'SRM pool';
  let lockedLabel = `on ${poolLabel}`;
  let fromLabel = `Dropped by ${rewardEvent.from.toString()} | ${dateLabel}`;

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
          <RewardListItemDetails vendor={rli.vendor!} />
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
      <div>Vendor</div>
      <ul>
        <li>Address {vendor.publicKey.toString()}</li>
        <li>Vault: {vendor.account.vault.toString()}</li>
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
          Reward queue cursor:{' '}
          {vendor.account.rewardEventQueueCursor.toString()}
        </li>
      </ul>
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
        const expired = vendor.account.expired;

        needsClaim = ownsPoolShares && notYetClaimed && isEligible && !expired;
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

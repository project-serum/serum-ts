import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useSnackbar } from 'notistack';
import Typography from '@material-ui/core/Typography';
import Paper from '@material-ui/core/Paper';
import { useWallet } from '../../components/common/WalletProvider';
import { State as StoreState } from '../../store/reducer';
import { ActionType } from '../../store/actions';
import RewardsList, { RewardListItemViewModel } from './RewardsList';
import DropRewardButton from './DropRewardButton';
import ClaimRewardButton from './ClaimRewardButton';
import { rewardEvents } from '../../utils/registry';

export default function Rewards() {
  const { registryClient } = useWallet();
  const dispatch = useDispatch();
  const snack = useSnackbar();
  const ctx = useSelector((state: StoreState) => {
    const registrar = state.accounts[state.registry.registrar.toString()];
    const rewardEventQueue = {
      publicKey: registrar.rewardEventQ,
      account: state.accounts[registrar.rewardEventQ.toString()],
    };
    return {
      accounts: state.accounts,
      rewardEventQueue,
      member: state.registry.member
        ? {
            publicKey: state.registry.member,
            account: state.accounts[state.registry.member.toString()],
          }
        : undefined,
      network: state.common.network,
    };
  });
  const { rewardEventQueue, accounts } = ctx;

  const events = rewardEvents(rewardEventQueue.account);

  // Load any reward vendor accounts that hasn't been loaded already.
  useEffect(() => {
    events.forEach(m => {
      const vendor = accounts[m.vendor.toString()];
      if (!vendor) {
        registryClient.account
          .rewardVendor(m.vendor)
          .then((account: any) => {
            dispatch({
              type: ActionType.AccountAdd,
              item: {
                account: { publicKey: m.vendor, account },
              },
            });
          })
          .catch((err: any) => {
            console.error(err);
            snack.enqueueSnackbar(`Error fetching reward vendor`, {
              variant: 'error',
            });
          });
      }
    });
  });

  // All rewards to display.
  const rewards = events
    .map((m: any, idx: any) => RewardListItemViewModel.fromMessage(ctx, m, idx))
    .reverse();

  // Next reward to claim.
  let nextReward = null;
  if (rewards.filter(r => r === null).length === 0) {
    nextReward = rewards
      .filter(r => r!.needsClaim)
      .sort((a, b) =>
        a!.cursor < b!.cursor ? -1 : a!.cursor > b!.cursor ? 1 : 0,
      )
      .shift();
  }

  return (
    <div style={{ width: '100%', marginTop: '24px' }}>
      <div
        style={{
          marginBottom: '10px',
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <Typography style={{ fontWeight: 'bold', fontSize: '20px' }}>
          Reward History
        </Typography>
        <div style={{ display: 'flex' }}>
          {nextReward && <ClaimRewardButton rli={nextReward} />}
          <DropRewardButton />
        </div>
      </div>
      <div>
        <Typography>
          When rewards are dropped, one must prove one was staked during the
          time of drop. This means sending a transaction to the staking program
          to <b>process</b> the reward. For <b>unlocked</b> rewards, select the
          token address to transfer the reward to. For <b>locked</b> rewards, a
          locked vesting account will be created and realized to the staker upon
          unstaking. See the Lockup tab.
        </Typography>
      </div>
      <Paper>
        <RewardsList rewards={rewards} />
      </Paper>
    </div>
  );
}

import React, { useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useSnackbar } from 'notistack';
import Typography from '@material-ui/core/Typography';
import Paper from '@material-ui/core/Paper';
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import * as anchor from '@project-serum/anchor';
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
  const { rewardEventQueue } = ctx;

  const events = useMemo(() => rewardEvents(rewardEventQueue.account), [
    rewardEventQueue.account,
  ]);

  useEffect(() => {
    (async () => {
      // TODO: need to chop up the calls here, for reward vendors > 100 entires.
      const accounts = await anchor.utils.getMultipleAccounts(
        registryClient.provider.connection,
        events.map(m => m.vendor),
      );
      accounts.forEach(a => {
        if (a === null) {
          snack.enqueueSnackbar(`RPC node returned invalid vendor account`, {
            variant: 'error',
          });
          return;
        }
        const account = registryClient.coder.accounts.decode(
          'RewardVendor',
          a.account.data,
        );
        dispatch({
          type: ActionType.AccountAdd,
          item: {
            account: { publicKey: a.publicKey, account },
          },
        });
      });
    })();
  }, [
    events,
    dispatch,
    snack,
    registryClient.coder.accounts,
    registryClient.provider.connection,
  ]);

  // All rewards to display.
  const rewards = events
    .map((m: any) => RewardListItemViewModel.fromMessage(ctx, m))
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
      {nextReward && (
        <Card style={{ marginBottom: '24px' }}>
          <CardContent>
            <Typography variant="h6">
              You were staked during a previous reward. To prove eligibility,
              click the "Process" button until you've processed <b>all</b>{' '}
              eligible rewards. For unlocked rewards, don't forget to select the
              address you wish to send your stake reward to.
            </Typography>
          </CardContent>
        </Card>
      )}
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
          {localStorage.getItem('private') && <DropRewardButton />}
        </div>
      </div>
      <div style={{ marginBottom: '16px' }}>
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

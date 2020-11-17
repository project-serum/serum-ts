import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useSnackbar } from 'notistack';
import Typography from '@material-ui/core/Typography';
import Paper from '@material-ui/core/Paper';
import * as registry from '@project-serum/registry';
import { RewardEvent } from '@project-serum/registry/dist/accounts';
import { useWallet } from '../../components/common/WalletProvider';
import { State as StoreState } from '../../store/reducer';
import { ActionType } from '../../store/actions';
import RewardsList, { RewardListItemViewModel } from './RewardsList';
import DropRewardButton from './DropRewardButton';
import ClaimRewardButton from './ClaimRewardButton';

export default function Rewards() {
  const { registryClient } = useWallet();
  const dispatch = useDispatch();
  const snack = useSnackbar();
  const ctx = useSelector((state: StoreState) => {
    return {
      rewardEventQueue: state.registry.rewardEventQueue!,
      member: state.registry.member!,
      network: state.common.network,
      pool: state.registry.pool!,
      vendors: state.registry.vendors,
    };
  });
  const { rewardEventQueue, network, member, vendors } = ctx;

  // Load any reward vendor accounts that hasn't been loaded already.
  useEffect(() => {
    rewardEventQueue!.account.messages().forEach(m => {
      loadVendorIfNeeded(m, vendors, dispatch, registryClient).catch(err =>
        snack.enqueueSnackbar(
          `Error fetching locked reward vendor: ${err.toString()}`,
          {
            variant: 'error',
          },
        ),
      );
    });
  });

  // All rewards to display.
  const rewards = rewardEventQueue!.account
    .messages()
    .map((m, idx) => RewardListItemViewModel.fromMessage(ctx, m, idx))
    .reverse();

  // Next reward to claim.
  let nextReward = rewards
    .filter(r => r.needsClaim)
    .sort((a, b) => (a.cursor < b.cursor ? -1 : a.cursor > b.cursor ? 1 : 0))
    .shift();

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
          {nextReward !== undefined && (
            <ClaimRewardButton
              registryClient={registryClient}
              rli={nextReward}
              member={member}
              network={network}
            />
          )}
          <DropRewardButton />
        </div>
      </div>
      <Paper>
        <RewardsList rewards={rewards} network={network} />
      </Paper>
    </div>
  );
}

// Fetch the vendor account and load it into the redux store.
async function loadVendorIfNeeded(
  m: RewardEvent,
  vendors: Map<string, any>,
  dispatch: any,
  registryClient: registry.Client,
) {
  if (m.lockedAlloc !== undefined) {
    if (vendors.get(m.lockedAlloc.vendor.toString()) === undefined) {
      const vendor = await registryClient.accounts.lockedRewardVendor(
        m.lockedAlloc.vendor,
      );
      dispatch({
        type: ActionType.RegistryCreateRewardVendor,
        item: {
          vendor,
        },
      });
    }
  } else if (m.unlockedAlloc !== undefined) {
    if (vendors.get(m.unlockedAlloc.vendor.toString()) === undefined) {
      const vendor = await registryClient.accounts.unlockedRewardVendor(
        m.unlockedAlloc.vendor,
      );
      dispatch({
        type: ActionType.RegistryCreateRewardVendor,
        item: {
          vendor,
        },
      });
    }
  }
}

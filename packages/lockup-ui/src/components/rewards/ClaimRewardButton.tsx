import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useSnackbar } from 'notistack';
import Button from '@material-ui/core/Button';
import { PublicKey } from '@solana/web3.js';
import * as registry from '@project-serum/registry';
import { Network, ProgramAccount } from '@project-serum/common';
import { useWallet } from '../../components/common/WalletProvider';
import * as notification from '../common/Notification';
import OwnedTokenAccountsSelect from '../common/OwnedTokenAccountsSelect';
import { RewardListItemViewModel } from './RewardsList';
import { ActionType } from '../../store/actions';

type ClaimRewardButtonProps = {
  rli: RewardListItemViewModel;
  member: ProgramAccount<registry.accounts.MemberDeref>;
  network: Network;
};

export default function ClaimRewardButton(props: ClaimRewardButtonProps) {
  const { registryClient, lockupClient, wallet } = useWallet();
  const { rli, member, network } = props;
  const dispatch = useDispatch();
  const snack = useSnackbar();
  const [token, setToken] = useState<null | PublicKey>(null);

  // On click.
  const clickHandler = async (): Promise<void> => {
    notification.withTx(
      snack,
      `Claiming vendor reward ${rli!.vendor!.publicKey.toString()}`,
      'Reward claimed',
      async () => {
        if (rli!.reward.lockedAlloc) {
          let vendor = await registryClient.accounts.lockedRewardVendor(
            rli!.reward.lockedAlloc.vendor,
          );
          let vendorSigner = await registryClient.accounts.rewardVendorAuthority(
            vendor.publicKey,
            vendor.account.nonce,
          );
          const { tx } = await registryClient.claimLockedReward({
            cursor: rli!.cursor,
            member: {
              publicKey: member.publicKey,
              account: member.account.member,
            },
            vendor,
            vendorSigner,
            safe: network.safe,
            lockupProgramId: network.lockupProgramId,
            mint: rli!.reward.lockedAlloc!.mint,
          });
          // Refetch the vesting accounts to update the UI with the new reward.
          const vestingAccounts = await lockupClient.accounts.allVestings(
            wallet.publicKey,
          );
          dispatch({
            type: ActionType.LockupSetVestings,
            item: {
              vestingAccounts,
            },
          });
          return tx;
        } else {
          let vendor = await registryClient.accounts.unlockedRewardVendor(
            rli!.reward.unlockedAlloc!.vendor,
          );
          let vendorSigner = await registryClient.accounts.rewardVendorAuthority(
            vendor.publicKey,
            vendor.account.nonce,
          );
          const { tx } = await registryClient.claimUnlockedReward({
            cursor: rli!.cursor,
            member: member.publicKey,
            vendor,
            vendorSigner,
            token: token!,
          });
          return tx;
        }
      },
    );
  };

  return (
    <>
      {rli.reward.unlockedAlloc && (
        <div>
          <OwnedTokenAccountsSelect
            style={{ width: '400px', height: '100%' }}
            mint={network.srm}
            onChange={(f: PublicKey) => setToken(f)}
          />
        </div>
      )}
      <div
        style={{ marginLeft: '10px', marginRight: '10px' }}
        onClick={() =>
          clickHandler().catch(err => {
            snack.enqueueSnackbar(
              `Error ending pending redemption: ${err.toString()}`,
              {
                variant: 'error',
              },
            );
          })
        }
      >
        <Button
          disabled={rli.reward.unlockedAlloc && token === null}
          variant="contained"
          color="primary"
        >
          Claim Reward
        </Button>
      </div>
    </>
  );
}

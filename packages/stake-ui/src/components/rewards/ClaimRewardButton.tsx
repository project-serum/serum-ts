import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSnackbar } from 'notistack';
import Button from '@material-ui/core/Button';
import {
  Account,
  PublicKey,
  SYSVAR_RENT_PUBKEY,
  SYSVAR_CLOCK_PUBKEY,
} from '@solana/web3.js';
import { TokenInstructions } from '@project-serum/serum';
import { createTokenAccountInstrs } from '@project-serum/common';
import { useWallet } from '../../components/common/WalletProvider';
import * as notification from '../common/Notification';
import OwnedTokenAccountsSelect from '../common/OwnedTokenAccountsSelect';
import { RewardListItemViewModel } from './RewardsList';
import { ActionType } from '../../store/actions';
import { State as StoreState } from '../../store/reducer';
import { vendorSigner } from '../../utils/registry';
import { vestingSigner } from '../../utils/lockup';

type ClaimRewardButtonProps = {
  rli: RewardListItemViewModel;
};

export default function ClaimRewardButton(props: ClaimRewardButtonProps) {
  const { registryClient, lockupClient } = useWallet();
  const { member, registrar } = useSelector((state: StoreState) => {
    const registrar = {
      publicKey: state.registry.registrar,
      account: state.accounts[state.registry.registrar.toString()],
    };
    const member = state.registry.member
      ? {
          publicKey: state.registry.member,
          account: state.accounts[state.registry.member.toString()],
        }
      : undefined;
    return {
      registrar,
      member,
    };
  });
  const { rli } = props;
  const dispatch = useDispatch();
  const snack = useSnackbar();
  const [token, setToken] = useState<null | PublicKey>(null);

  // On click.
  const clickHandler = async (): Promise<void> => {
    notification.withTx(
      snack,
      `Processing vendor reward ${rli!.vendor!.publicKey.toString()}`,
      'Reward processed',
      async () => {
        const vendor = await registryClient.account.rewardVendor(
          rli.vendor!.publicKey,
        );
        const _vendorSigner = await vendorSigner(
          registryClient.programId,
          registrar.publicKey,
          rli.vendor!.publicKey,
        );
        if (rli!.reward.locked) {
          const vendoredVesting = new Account();
          const vendoredVestingVault = new Account();
          const vendoredVestingSigner = await vestingSigner(
            lockupClient.programId,
            vendoredVesting.publicKey,
          );
          const remainingAccounts = lockupClient.instruction.createVesting
            .accounts({
              vesting: vendoredVesting.publicKey,
              vault: vendoredVestingVault.publicKey,
              depositor: vendor.vault,
              depositorAuthority: _vendorSigner.publicKey,
              tokenProgram: TokenInstructions.TOKEN_PROGRAM_ID,
              rent: SYSVAR_RENT_PUBKEY,
              clock: SYSVAR_CLOCK_PUBKEY,
            })
            // Change the signer status on the vendor signer since it's signed by the program, not the
            // client.
            .map((meta: any) =>
              meta.pubkey.equals(_vendorSigner.publicKey)
                ? { ...meta, isSigner: false }
                : meta,
            );
          const tx = await registryClient.rpc.claimRewardLocked(
            vendoredVestingSigner.nonce,
            {
              accounts: {
                // @ts-ignore
                registry: await registryClient.state.address(),
                lockupProgram: lockupClient.programId,
                cmn: {
                  registrar: registrar.publicKey,
                  member: member!.publicKey,
                  beneficiary: registryClient.provider.wallet.publicKey,
                  balances: member!.account.balances,
                  balancesLocked: member!.account.balancesLocked,
                  vendor: rli.vendor!.publicKey,
                  vault: rli.vendor!.account.vault,
                  vendorSigner: _vendorSigner.publicKey,
                  tokenProgram: TokenInstructions.TOKEN_PROGRAM_ID,
                  clock: SYSVAR_CLOCK_PUBKEY,
                },
              },
              remainingAccounts,
              signers: [vendoredVesting, vendoredVestingVault],
              instructions: [
                await lockupClient.account.vesting.createInstruction(
                  vendoredVesting,
                ),
                ...(await createTokenAccountInstrs(
                  registryClient.provider,
                  vendoredVestingVault.publicKey,
                  rli.vendor!.account.mint,
                  vendoredVestingSigner.publicKey,
                )),
              ],
            },
          );
          // Refetch the vesting accounts to update the UI with the new reward.
          const vestingAccounts = await lockupClient.account.vesting.all(
            registryClient.provider.wallet.publicKey.toBuffer(),
          );
          vestingAccounts.forEach(account => {
            dispatch({
              type: ActionType.AccountAdd,
              item: {
                account,
              },
            });
          });
          dispatch({
            type: ActionType.LockupSetVestings,
            item: {
              vestingAccounts: vestingAccounts.map(v => v.publicKey),
            },
          });
          return tx;
        } else {
          return await registryClient.rpc.claimReward({
            accounts: {
              to: token,
              cmn: {
                registrar: registrar.publicKey,
                member: member!.publicKey,
                beneficiary: registryClient.provider.wallet.publicKey,
                balances: member!.account.balances,
                balancesLocked: member!.account.balancesLocked,

                vendor: rli.vendor!.publicKey,
                vault: vendor.vault,
                vendorSigner: _vendorSigner.publicKey,

                tokenProgram: TokenInstructions.TOKEN_PROGRAM_ID,
                clock: SYSVAR_CLOCK_PUBKEY,
              },
            },
          });
        }
      },
    );
  };

  return (
    <>
      {!rli.reward.locked && (
        <div>
          <OwnedTokenAccountsSelect
            style={{ width: '400px', height: '100%' }}
            mint={rli.vendor.account.mint}
            onChange={(f: PublicKey) => setToken(f)}
          />
        </div>
      )}
      <div style={{ marginLeft: '10px', marginRight: '10px' }}>
        <Button
          disabled={rli.reward.unlockedAlloc && token === null}
          variant="contained"
          color="primary"
          onClick={() =>
            clickHandler().catch(err => {
              console.error(err);
              snack.enqueueSnackbar(
                `Error ending pending redemption: ${err.toString()}`,
                {
                  variant: 'error',
                },
              );
            })
          }
        >
          Process Reward
        </Button>
      </div>
    </>
  );
}

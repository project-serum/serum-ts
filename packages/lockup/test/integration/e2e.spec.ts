import BN from 'bn.js';
import { PublicKey, Account } from '@solana/web3.js';
import {
  Provider,
  getTokenAccount,
  sleep,
  createMintAndVault,
  createTokenAccount,
  networks,
} from '@project-serum/common';
import { Client } from '../../src';
import { WhitelistEntry } from '../../src/accounts/whitelist';

// When running this test, make sure to deploy the program and plugin the address.
const network = networks.localhost;
const programId = network.lockupProgramId;
const url = network.url;

const u64Zero = new BN(Buffer.alloc(8));

describe('End-to-end tests', () => {
  it('Runs against a localnetwork', async () => {
    // Genesis state.
    const provider = Provider.local(url, {
      preflightCommitment: 'recent',
      commitment: 'recent',
    });
    const [srmMint, god] = await createMintAndVault(
      provider,
      new BN(1000000000),
    );
    // Initialize the safe.
    const [client, { safe }] = await Client.initialize(provider, {
      programId,
    });
    // Whitelist add.
    let entry = await generateWhitelistEntry();
    await client.whitelistAdd({
      entry,
    });
    let entry2 = await generateWhitelistEntry();
    await client.whitelistAdd({
      entry: entry2,
    });
    let whitelist = await client.accounts.whitelist();
    expect(whitelist.entries[0]).toEqual(entry);
    expect(whitelist.entries[1]).toEqual(entry2);

    // Whitelist delete.
    await client.whitelistDelete({
      entry,
    });
    whitelist = await client.accounts.whitelist();
    expect(whitelist.entries[0]).toEqual({
      programId: new PublicKey(Buffer.alloc(32)),
      instance: new PublicKey(Buffer.alloc(32)),
      nonce: 0,
    });
    expect(whitelist.entries[1]).toEqual(entry2);

    // Create a Vesting account.
    const blockTime = await provider.connection.getBlockTime(
      await provider.connection.getSlot('max'),
    );
    const endTs = new BN((blockTime as number) + 100);
    const periodCount = new BN(10);
    const depositAmount = new BN([0, 0, 0, 0, 0, 0, 0, 100]);
    const { vesting } = await client.createVesting({
      beneficiary: provider.wallet.publicKey,
      endTs,
      periodCount,
      depositAmount,
      depositor: god,
    });
    let vestingAcc = await client.accounts.vesting(vesting);
    expect(vestingAcc.initialized).toEqual(true);
    expect(vestingAcc.beneficiary).toEqual(provider.wallet.publicKey);
    expect(vestingAcc.outstanding.toNumber()).toEqual(depositAmount.toNumber());
    expect(vestingAcc.startBalance.toNumber()).toEqual(
      depositAmount.toNumber(),
    );
    expect(vestingAcc.endTs.toNumber()).toEqual(endTs.toNumber());
    expect(vestingAcc.periodCount.toNumber()).toEqual(periodCount.toNumber());
    expect(vestingAcc.whitelistOwned).toEqual(u64Zero);

    // Wait for a vesting period to pass.
    await sleep(5 * 1000);

    // Withdraw some locked SRM.
    const tokenAccount = await createTokenAccount(
      provider,
      srmMint,
      provider.wallet.publicKey,
    );
    const withdrawAmount = new BN([0, 0, 0, 0, 0, 0, 0, 10]);
    await client.withdraw({
      amount: withdrawAmount,
      vesting,
      tokenAccount,
    });
    let token = await getTokenAccount(provider, tokenAccount);
    expect(token.amount).toEqual(withdrawAmount);
  });
});

async function generateWhitelistEntry(): Promise<WhitelistEntry> {
  const programId = new Account().publicKey;
  const instance = new Account().publicKey;
  const [pda, nonce] = await PublicKey.findProgramAddress(
    [instance.toBuffer()],
    programId,
  );
  return {
    programId,
    instance,
    nonce,
  };
}

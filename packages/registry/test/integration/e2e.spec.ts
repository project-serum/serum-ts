import BN from 'bn.js';
import { PublicKey } from '@solana/web3.js';
import {
  getTokenAccount,
  sleep,
  createMintAndVault,
  Provider,
  networks,
} from '@project-serum/common';
import { Client } from '../../src';

// When running this test, make sure to deploy the programs and plug them
// into the localhost network config.
const network = networks.devnet;
const registryProgramId = network.registryProgramId;
const metaEntityProgramId = network.metaEntityProgramId;
const url = network.url;

const u64Zero = new BN(Buffer.alloc(8));

describe('End-to-end tests', () => {
  it('Runs against a localnetwork', async () => {
    // Setup genesis state.
    const provider = Provider.local(url, {
      preflightCommitment: 'recent',
      commitment: 'recent',
    });
    const [srmMint, god] = await createMintAndVault(
      provider,
      new BN(1000000000),
    );
    const [msrmMint, megaGod] = await createMintAndVault(
      provider,
      new BN(1000000000),
    );

    // Initialize the registrar.
    let [client, { registrar: registrarAddress }] = await Client.initialize(
      provider,
      {
        metaEntityProgramId,
        programId: registryProgramId,
        mint: srmMint,
        megaMint: msrmMint,
        withdrawalTimelock: new BN(60),
        deactivationTimelock: new BN(5),
        rewardActivationThreshold: new BN(1),
        maxStakePerEntity: new BN(100000000),
        stakeRate: new BN(1),
        stakeRateMega: new BN(1),
      },
    );
    let registrar = await client.accounts.registrar(registrarAddress);
    expect(registrar.withdrawalTimelock.toNumber()).toEqual(60);
    expect(registrar.deactivationTimelock.toNumber()).toEqual(5);
    expect(registrar.rewardActivationThreshold.toNumber()).toEqual(1);
    expect(registrar.authority).toEqual(provider.wallet.publicKey);
    expect(registrar.maxStakePerEntity.toNumber()).toEqual(100000000);

    // Update registrar.
    await client.updateRegistrar({
      newAuthority: null,
      withdrawalTimelock: new BN(2),
      deactivationTimelock: null,
      rewardActivationThreshold: null,
      maxStakePerEntity: null,
    });

    registrar = await client.accounts.registrar(registrarAddress);
    expect(registrar.withdrawalTimelock.toNumber()).toEqual(2);

    // Create Entity.
    let { entity } = await client.createEntity({
      name: '',
      about: '',
      imageUrl: '',
    });

    let e = await client.accounts.entity(entity);
    expect(e.initialized).toBe(true);
    expect(e.registrar).toEqual(registrarAddress);
    expect(e.leader).toEqual(provider.wallet.publicKey);
    expect(e.balances).toEqual({
      sptAmount: u64Zero,
      sptMegaAmount: u64Zero,
      currentDeposit: u64Zero,
      currentMegaDeposit: u64Zero,
    });
    expect(e.state).toEqual({
      inactive: {},
    });

    // Create Member.
    let {
      member,
      balances: [mainBalances, lockedBalances],
    } = await client.createMember({
      entity,
      delegate: new PublicKey(Buffer.alloc(32)),
    });
    let m = await client.accounts.member(member);
    expect(m.initialized).toBe(true);
    expect(m.registrar).toEqual(registrarAddress);
    expect(m.entity).toEqual(entity);
    expect(m.beneficiary).toEqual(provider.wallet.publicKey);

    // Deposit SRM.
    let vaultBefore = await client.accounts.depositVault(
      member,
      provider.wallet.publicKey,
    );
    let amount = new BN(1);
    await client.deposit({
      member,
      depositor: god,
      amount,
    });

    let vaultAfter = await client.accounts.depositVault(
      member,
      provider.wallet.publicKey,
    );
    let result = vaultAfter.amount.sub(vaultBefore.amount);
    expect(amount).toEqual(result);

    // Deposit MSRM.
    vaultBefore = await client.accounts.depositMegaVault(
      member,
      provider.wallet.publicKey,
    );
    amount = new BN(2);

    await client.deposit({
      member,
      depositor: megaGod,
      amount,
    });

    vaultAfter = await client.accounts.depositMegaVault(
      member,
      provider.wallet.publicKey,
    );
    result = vaultAfter.amount.sub(vaultBefore.amount);
    expect(amount).toEqual(result);

    // Stake SRM.
    let poolVaultBefore = await client.accounts.poolVault(
      member,
      provider.wallet.publicKey,
    );
    vaultBefore = await client.accounts.depositVault(
      member,
      provider.wallet.publicKey,
    );
    amount = new BN(1);

    await client.stake({
      member,
      amount,
      spt: mainBalances.spt,
      isMega: false,
      balanceId: provider.wallet.publicKey,
    });

    let poolVaultAfter = await client.accounts.poolVault(
      member,
      provider.wallet.publicKey,
    );
    vaultAfter = await client.accounts.depositVault(
      member,
      provider.wallet.publicKey,
    );
    let poolVaultResult = poolVaultAfter.amount.sub(poolVaultBefore.amount);
    let vaultResult = vaultBefore.amount.sub(vaultAfter.amount);
    let stakeTokenAfter = await getTokenAccount(provider, mainBalances.spt);
    expect(poolVaultResult).toEqual(amount); // Balance up.
    expect(vaultResult).toEqual(amount); // Balance down.
    expect(stakeTokenAfter.amount.toNumber()).toEqual(amount.toNumber());

    m = await client.accounts.member(member);

    // StartStakeWithdrawal.
    let pwVaultBefore = await client.accounts.pendingWithdrawalVault(
      member,
      provider.wallet.publicKey,
    );
    poolVaultBefore = await client.accounts.poolVault(
      member,
      provider.wallet.publicKey,
    );
    vaultBefore = await client.accounts.depositVault(
      member,
      provider.wallet.publicKey,
    );

    let stakeTokenBefore = await getTokenAccount(provider, mainBalances.spt);

    let { pendingWithdrawal, tx } = await client.startStakeWithdrawal({
      member,
      amount,
      spt: mainBalances.spt,
      isMega: false,
      balanceId: provider.wallet.publicKey,
    });

    let pwVaultAfter = await client.accounts.pendingWithdrawalVault(
      member,
      provider.wallet.publicKey,
    );
    poolVaultAfter = await client.accounts.poolVault(
      member,
      provider.wallet.publicKey,
    );
    vaultAfter = await client.accounts.depositVault(
      member,
      provider.wallet.publicKey,
    );
    stakeTokenAfter = await getTokenAccount(provider, mainBalances.spt);
    expect(stakeTokenBefore.amount.sub(stakeTokenAfter.amount)).toEqual(amount);
    expect(
      poolVaultBefore.amount.sub(poolVaultAfter.amount).toNumber(),
    ).toEqual(amount.toNumber()); // Decrease.
    expect(vaultAfter.amount.sub(vaultBefore.amount).toNumber()).toEqual(0); // Untouched.
    expect(pwVaultAfter.amount.sub(pwVaultBefore.amount).toNumber()).toEqual(
      amount.toNumber(),
    );

    const pw = await client.accounts.pendingWithdrawal(pendingWithdrawal);
    expect(pw.initialized).toBe(true);
    expect(pw.burned).toBe(false);
    expect(pw.member).toEqual(member);
    expect(pw.amount.toNumber()).toEqual(amount.toNumber());

    // Wait for withdrawal timelock to pass.
    await sleep(registrar.withdrawalTimelock.toNumber() * 3 * 1000);

    // EndStakeWithdrawal.
    const mVaultBefore = await client.accounts.depositVault(
      member,
      provider.wallet.publicKey,
    );

    await client.endStakeWithdrawal({
      member,
      pendingWithdrawal,
    });

    const mVaultAfter = await client.accounts.depositVault(
      member,
      provider.wallet.publicKey,
    );
    expect(mVaultAfter.amount.sub(mVaultBefore.amount).toNumber()).toEqual(
      amount.toNumber(),
    );
  });
});

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
const network = networks.localhost;
const registryProgramId = network.registryProgramId;
const stakeProgramId = network.stakeProgramId;
const metaEntityProgramId = network.metaEntityProgramId;
const url = network.url;

const i64Zero = new BN(Buffer.alloc(8)).toTwos(64);
const u64Zero = new BN(Buffer.alloc(8));
const publicKeyZero = new PublicKey(Buffer.alloc(32));

describe('End-to-end tests', () => {
  it('Runs against a localnetwork', async () => {
    Client.setRetbuf(network.retbuf, network.retbufProgramId);
    // Setup genesis state.
    const provider = Provider.local(url, {
      preflightCommitment: 'recent',
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
        stakeProgramId,
        mint: srmMint,
        megaMint: msrmMint,
        withdrawalTimelock: new BN(60),
        deactivationTimelock: new BN(5),
        rewardActivationThreshold: new BN(1),
        maxStakePerEntity: new BN(100000000),
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
    expect(e.generation).toEqual(u64Zero);
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
    let { member, spt, sptMega } = await client.createMember({
      entity,
      delegate: new PublicKey(Buffer.alloc(32)),
    });
    let m = await client.accounts.member(member);
    expect(m.initialized).toBe(true);
    expect(m.registrar).toEqual(registrarAddress);
    expect(m.entity).toEqual(entity);
    expect(m.beneficiary).toEqual(provider.wallet.publicKey);
    expect(m.balances).toEqual({
      sptAmount: u64Zero,
      sptMegaAmount: u64Zero,
      currentDeposit: u64Zero,
      currentMegaDeposit: u64Zero,
      main: {
        owner: provider.wallet.publicKey,
        deposit: u64Zero,
        megaDeposit: u64Zero,
      },
      delegate: {
        owner: publicKeyZero,
        deposit: u64Zero,
        megaDeposit: u64Zero,
      },
    });
    expect(m.lastActivePrices).toEqual({
      basket: {
        quantities: [i64Zero],
      },
      megaBasket: {
        quantities: [i64Zero, i64Zero],
      },
    });

    // Deposit SRM.
    let vaultBefore = await client.accounts.depositVault(registrarAddress);
    let amount = new BN(1);
    await client.deposit({
      member,
      depositor: god,
      amount,
    });

    let vaultAfter = await client.accounts.depositVault(registrarAddress);
    let result = vaultAfter.amount.sub(vaultBefore.amount);
    expect(amount).toEqual(result);

    // Deposit MSRM.
    vaultBefore = await client.accounts.depositMegaVault(registrarAddress);
    amount = new BN(2);

    await client.deposit({
      member,
      depositor: megaGod,
      amount,
    });

    vaultAfter = await client.accounts.depositMegaVault(registrarAddress);
    result = vaultAfter.amount.sub(vaultBefore.amount);
    expect(amount).toEqual(result);

    // Stake SRM.
    let poolVaultBefore = await client.accounts.poolVault(registrarAddress);
    vaultBefore = await client.accounts.depositVault(registrarAddress);
    amount = new BN(1);

    await client.stake({
      member,
      amount,
      spt,
    });

    let poolVaultAfter = await client.accounts.poolVault(registrarAddress);
    vaultAfter = await client.accounts.depositVault(registrarAddress);
    let poolVaultResult = poolVaultAfter.amount.sub(poolVaultBefore.amount);
    let vaultResult = vaultBefore.amount.sub(vaultAfter.amount);
    let stakeTokenAfter = await getTokenAccount(provider, spt);
    expect(poolVaultResult).toEqual(amount); // Balance up.
    expect(vaultResult).toEqual(amount); // Balance down.
    expect(stakeTokenAfter.amount.toNumber()).toEqual(amount.toNumber());
    m = await client.accounts.member(member);
    expect(m.lastActivePrices).toEqual({
      basket: {
        quantities: [amount],
      },
      megaBasket: {
        quantities: [i64Zero, i64Zero],
      },
    });

    // StartStakeWithdrawal.
    poolVaultBefore = await client.accounts.poolVault(registrarAddress);
    vaultBefore = await client.accounts.depositVault(registrarAddress);
    let stakeTokenBefore = await getTokenAccount(provider, spt);

    let { pendingWithdrawal, tx } = await client.startStakeWithdrawal({
      member,
      amount,
      spt,
    });

    poolVaultAfter = await client.accounts.poolVault(registrarAddress);
    vaultAfter = await client.accounts.depositVault(registrarAddress);
    stakeTokenAfter = await getTokenAccount(provider, spt);
    expect(stakeTokenBefore.amount.sub(stakeTokenAfter.amount)).toEqual(amount);
    expect(
      poolVaultBefore.amount.sub(poolVaultAfter.amount).toNumber(),
    ).toEqual(amount.toNumber()); // Decrease.
    expect(vaultAfter.amount.sub(vaultBefore.amount).toNumber()).toEqual(
      amount.toNumber(),
    ); // Increase.

    const pw = await client.accounts.pendingWithdrawal(pendingWithdrawal);
    expect(pw.initialized).toBe(true);
    expect(pw.burned).toBe(false);
    expect(pw.member).toEqual(member);
    expect(pw.sptAmount.toNumber()).toEqual(amount.toNumber());
    // TODO: don't stringify.
    expect(JSON.stringify(pw.payment)).toEqual(
      JSON.stringify({
        assetAmount: amount,
        megaAssetAmount: u64Zero,
      }),
    );

    // Wait for withdrawal timelock to pass.
    await sleep(registrar.withdrawalTimelock.toNumber() * 3 * 1000);

    // EndStakeWithdrawal.
    const memberBefore = await client.accounts.member(member);

    await client.endStakeWithdrawal({
      member,
      pendingWithdrawal,
    });

    const memberAfter = await client.accounts.member(member);
    expect(
      memberAfter.balances.currentDeposit.sub(
        memberBefore.balances.currentDeposit,
      ),
    ).toEqual(amount);
  });
});

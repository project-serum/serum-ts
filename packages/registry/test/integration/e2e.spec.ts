import { Client, localProvider } from '../../src';
import BN from 'bn.js';
import { PublicKey } from '@solana/web3.js';
import {
  getTokenAccount,
  sleep,
  createMintAndVault,
} from '@project-serum/common';

// When running this test, make sure to deploy the following programs
// and plugin the on-chain addresses, here.
const registryProgramId = new PublicKey(
  'HdpSHXjuC6cf2oE67645X6dt5r6eCFVmhKhWjaWi95BR',
);
const stakeProgramId = new PublicKey(
  '2Cu7X1Pgmm8yZJ7ByZgV4AGPbWkwx11GZdKngaoGHQdx',
);

const i64Zero = new BN(Buffer.alloc(8)).toTwos(64);
const u64Zero = new BN(Buffer.alloc(8));
const publicKeyZero = new PublicKey(Buffer.alloc(32));

describe('End-to-end tests', () => {
  it('Runs against a localnetwork', async () => {
    // Setup genesis state.
    const provider = await localProvider(registryProgramId, stakeProgramId);
    const [srmMint, god] = await createMintAndVault(
      provider.connection,
      provider.payer,
      new BN(1000000000),
    );
    const [msrmMint, megaGod] = await createMintAndVault(
      provider.connection,
      provider.payer,
      new BN(1000000000),
    );

    // Initialize the registrar.
    let [client, { registrar: registrarAddress }] = await Client.initialize(
      provider,
      {
        mint: srmMint,
        megaMint: msrmMint,
        withdrawalTimelock: new BN(2),
        deactivationTimelock: new BN(5),
        rewardActivationThreshold: new BN(1),
      },
    );
    let registrar = await client.accounts.registrar(registrarAddress);

    // Create Entity.
    let { entity } = await client.createEntity({});

    let e = await client.accounts.entity(entity);
    expect(e.initialized).toBe(true);
    expect(e.registrar).toEqual(registrarAddress);
    expect(e.leader).toEqual(client.payer.publicKey);
    expect(e.generation).toEqual(u64Zero);
    expect(e.balances).toEqual({
      sptAmount: u64Zero,
      sptMegaAmount: u64Zero,
      stakeIntent: u64Zero,
      megaStakeIntent: u64Zero,
    });
    expect(e.state).toEqual({
      inactive: {},
    });

    // Create Member.
    let { member } = await client.createMember({ entity });

    let m = await client.accounts.member(member);
    expect(m.initialized).toBe(true);
    expect(m.registrar).toEqual(registrarAddress);
    expect(m.entity).toEqual(entity);
    expect(m.beneficiary).toEqual(client.payer.publicKey);
    expect(m.watchtower).toEqual({
      authority: publicKeyZero,
      dst: publicKeyZero,
    });
    expect(m.books).toEqual({
      sptAmount: u64Zero,
      sptMegaAmount: u64Zero,
      stakeIntent: u64Zero,
      megaStakeIntent: u64Zero,
      main: {
        owner: client.payer.publicKey,
        balances: {
          deposit: u64Zero,
          megaDeposit: u64Zero,
        },
      },
      delegate: {
        owner: publicKeyZero,
        balances: {
          deposit: u64Zero,
          megaDeposit: u64Zero,
        },
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
    let vaultBefore = await client.accounts.vault(registrarAddress);
    let amount = new BN(1);

    await client.deposit({
      member,
      depositor: god,
      amount,
    });

    let vaultAfter = await client.accounts.vault(registrarAddress);
    let result = vaultAfter.amount.sub(vaultBefore.amount);
    expect(amount).toEqual(result);

    // Deposit MSRM.
    vaultBefore = await client.accounts.megaVault(registrarAddress);
    amount = new BN(2);

    await client.deposit({
      member,
      depositor: megaGod,
      amount,
    });

    vaultAfter = await client.accounts.megaVault(registrarAddress);
    result = vaultAfter.amount.sub(vaultBefore.amount);
    expect(amount).toEqual(result);

    // Stake SRM.
    let poolVaultBefore = await client.accounts.poolVault(registrarAddress);
    vaultBefore = await client.accounts.vault(registrarAddress);
    let stakeToken = await client.allocSpt(false);
    amount = new BN(1);

    await client.stake({
      member,
      amount,
      stakeToken,
    });

    let poolVaultAfter = await client.accounts.poolVault(registrarAddress);
    vaultAfter = await client.accounts.vault(registrarAddress);
    let poolVaultResult = poolVaultAfter.amount.sub(poolVaultBefore.amount);
    let vaultResult = vaultBefore.amount.sub(vaultAfter.amount);
    let stakeTokenAfter = await getTokenAccount(client.connection, stakeToken);
    expect(poolVaultResult).toEqual(amount); // Balance up.
    expect(vaultResult).toEqual(amount); // Balance down.
    expect(stakeTokenAfter.amount.toNumber()).toEqual(amount.toNumber());

    // StartStakeWithdrawal.
    poolVaultBefore = await client.accounts.poolVault(registrarAddress);
    vaultBefore = await client.accounts.vault(registrarAddress);
    let stakeTokenBefore = await getTokenAccount(client.connection, stakeToken);

    let { pendingWithdrawal, tx } = await client.startStakeWithdrawal({
      member,
      amount,
      stakeToken,
    });

    poolVaultAfter = await client.accounts.poolVault(registrarAddress);
    vaultAfter = await client.accounts.vault(registrarAddress);
    stakeTokenAfter = await getTokenAccount(client.connection, stakeToken);
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
    await sleep(registrar.deactivationTimelock.toNumber() * 3 * 1000);

    // EndStakeWithdrawal.
    const memberBefore = await client.accounts.member(member);

    await client.endStakeWithdrawal({
      member,
      pendingWithdrawal,
    });

    const memberAfter = await client.accounts.member(member);
    expect(
      memberAfter.books.stakeIntent.sub(memberBefore.books.stakeIntent),
    ).toEqual(amount);
  });
});

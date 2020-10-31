import {
  Account,
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
} from '@solana/web3.js';
import { TokenInstructions } from '@project-serum/serum';
import { promisify } from 'util';
import { homedir } from 'os';
import { readFile } from 'fs';
import BN from 'bn.js';
import { PoolTransactions } from '../transactions';
import { getPoolBasket, loadPoolInfo, PoolInfo, UserInfo } from '../index';

const POOL_PROGRAM_ID = new PublicKey(
  'C6DXD7VDvktuRj1YMCGfKtWFJocaFnmKHvkv2JyxMvD6',
);

async function doStuff() {
  const connection = new Connection('http://localhost:8899', 'recent');
  const payer = new Account(
    Buffer.from(
      JSON.parse(
        await promisify(readFile)(homedir() + '/.config/solana/id.json', {
          encoding: 'utf-8',
        }),
      ),
    ),
  );

  const [mint1, vault1] = await createMint(connection, payer);
  const [mint2, vault2] = await createMint(connection, payer);

  const [
    poolAddress,
    transactions,
  ] = await PoolTransactions.initializeSimplePool({
    connection,
    assetMints: [mint1, mint2],
    creator: payer.publicKey,
    creatorAssets: [vault1, vault2],
    initialAssetQuantities: [new BN(100), new BN(300)],
    poolStateSpace: 1000,
    programId: POOL_PROGRAM_ID,
    poolName: 'Test Pool',
  });
  console.log('Pool address:', poolAddress.toBase58());
  for (const { transaction, signers } of transactions) {
    await sendAndConfirmTransaction(connection, transaction, [
      payer,
      ...signers,
    ]);
  }

  const poolInfo = await loadPoolInfo(connection, poolAddress);
  console.log(poolInfo);
  const userInfo: UserInfo = {
    owner: payer.publicKey,
    poolTokenAccount: transactions[0].signers[1].publicKey,
    assetAccounts: [vault1, vault2],
  };

  console.log(
    await getPoolBasket(
      connection,
      poolInfo,
      { create: new BN(1) },
      payer.publicKey,
    ),
  );
  console.log(
    await getPoolBasket(
      connection,
      poolInfo,
      { redeem: new BN(1) },
      payer.publicKey,
    ),
  );
  console.log(
    await getPoolBasket(
      connection,
      poolInfo,
      { create: new BN(1000000) },
      payer.publicKey,
    ),
  );
  console.log(
    await getPoolBasket(
      connection,
      poolInfo,
      { create: new BN(2000000) },
      payer.publicKey,
    ),
  );
  console.log(
    await getPoolBasket(
      connection,
      poolInfo,
      { redeem: new BN(2000000) },
      payer.publicKey,
    ),
  );

  {
    const { transaction, signers } = PoolTransactions.execute(
      poolInfo,
      { create: new BN(1000000) },
      userInfo,
      {
        quantities: [new BN(100), new BN(300)],
      },
    );
    await sendAndConfirmTransaction(connection, transaction, [
      payer,
      ...signers,
    ]);
  }

  console.log(
    await getPoolBasket(
      connection,
      poolInfo,
      { create: new BN(1000000) },
      payer.publicKey,
    ),
  );

  {
    const { transaction, signers } = PoolTransactions.execute(
      poolInfo,
      { redeem: new BN(2000000) },
      userInfo,
      {
        quantities: [new BN(200), new BN(600)],
      },
    );
    await sendAndConfirmTransaction(connection, transaction, [
      payer,
      ...signers,
    ]);
  }

  console.log(
    await getPoolBasket(
      connection,
      poolInfo,
      { create: new BN(1000000) },
      payer.publicKey,
    ),
  );
}

async function createMint(connection: Connection, payer: Account) {
  const mint = new Account();
  const vault = new Account();
  const txn = new Transaction();
  txn.add(
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: mint.publicKey,
      space: 82,
      lamports: await connection.getMinimumBalanceForRentExemption(82),
      programId: TokenInstructions.TOKEN_PROGRAM_ID,
    }),
    TokenInstructions.initializeMint({
      mint: mint.publicKey,
      decimals: 0,
      mintAuthority: payer.publicKey,
    }),
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: vault.publicKey,
      space: 165,
      lamports: await connection.getMinimumBalanceForRentExemption(165),
      programId: TokenInstructions.TOKEN_PROGRAM_ID,
    }),
    TokenInstructions.initializeAccount({
      account: vault.publicKey,
      mint: mint.publicKey,
      owner: payer.publicKey,
    }),
    TokenInstructions.mintTo({
      mint: mint.publicKey,
      destination: vault.publicKey,
      amount: new BN(10000),
      mintAuthority: payer.publicKey,
    }),
  );
  await sendAndConfirmTransaction(connection, txn, [payer, mint, vault]);
  return [mint.publicKey, vault.publicKey];
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function createUserAccounts(
  connection: Connection,
  payer: Account,
  pool: PoolInfo,
): Promise<UserInfo> {
  const poolTokenAccount = new Account();
  const assetAccounts: Account[] = [];
  const lamports = await connection.getMinimumBalanceForRentExemption(165);
  const txn = new Transaction();
  txn.add(
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: poolTokenAccount.publicKey,
      space: 165,
      lamports,
      programId: TokenInstructions.TOKEN_PROGRAM_ID,
    }),
    TokenInstructions.initializeAccount({
      account: poolTokenAccount.publicKey,
      mint: pool.state.poolTokenMint,
      owner: payer.publicKey,
    }),
  );
  pool.state.assets.forEach(({ mint }) => {
    const account = new Account();
    assetAccounts.push(account);
    txn.add(
      SystemProgram.createAccount({
        fromPubkey: payer.publicKey,
        newAccountPubkey: account.publicKey,
        space: 165,
        lamports,
        programId: TokenInstructions.TOKEN_PROGRAM_ID,
      }),
      TokenInstructions.initializeAccount({
        account: account.publicKey,
        mint,
        owner: payer.publicKey,
      }),
    );
  });
  txn.feePayer = payer.publicKey;
  await sendAndConfirmTransaction(connection, txn, [
    payer,
    poolTokenAccount,
    ...assetAccounts,
  ]);
  return {
    owner: payer.publicKey,
    poolTokenAccount: poolTokenAccount.publicKey,
    assetAccounts: assetAccounts.map(account => account.publicKey),
  };
}

async function sendAndConfirmTransaction(
  connection: Connection,
  transaction: Transaction,
  signers: Account[],
) {
  const txid = await connection.sendTransaction(transaction, signers, {
    preflightCommitment: 'recent',
  });
  await connection.confirmTransaction(txid, 'recent');
  return txid;
}

doStuff().catch(e => console.error(e));

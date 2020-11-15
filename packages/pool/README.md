[![npm (scoped)](https://img.shields.io/npm/v/@project-serum/pool)](https://www.npmjs.com/package/@project-serum/pool)
[![Build Status](https://travis-ci.com/project-serum/serum-ts.svg?branch=master)](https://travis-ci.com/project-serum/serum-ts)
[![Documentation](https://img.shields.io/badge/typedoc-documentation-blue)](https://project-serum.github.io/serum-ts/pool/modules/_index_.html)
[![Discord Chat](https://img.shields.io/discord/739225212658122886?color=blueviolet)](https://discord.com/channels/739225212658122886)
[![License](https://img.shields.io/github/license/project-serum/serum-dex?color=blue)](https://opensource.org/licenses/Apache-2.0)

# Serum Pools JS Library

JavaScript client library for interacting with Project Serum Pools.

## Installation

Using npm:

```
npm install @solana/web3.js @project-serum/pool
```

Using yarn:

```
yarn add @solana/web3.js @project-serum/pool
```

## Usage

### Load pool info

Fetch and decode pool state:

```js
import { Connection, PublicKey } from '@solana/web3.js';
import { loadPoolInfo, PoolTransactions } from '@project-serum/pool';

let connection = new Connection('...');
let poolAddress = new PublicKey('...'); // Address of the pool.

let poolInfo = await loadPoolInfo(connection, poolAddress);
console.log(poolInfo.state);
```

See [`loadPoolInfo()`](https://project-serum.github.io/serum-ts/pool/modules/_index_.html#loadpoolinfo) and [PoolState](https://project-serum.github.io/serum-ts/pool/interfaces/_index_.poolstate.html) for details.

If you already have the pool state data and just need to decode it, you can
call [`isPoolState()`](https://project-serum.github.io/serum-ts/pool/modules/_index_.html#ispoolstate)
and [`decodePoolState()`](https://project-serum.github.io/serum-ts/pool/modules/_index_.html#decodepoolstate)
directly.

```js
import { decodePoolState } from '@project-serum/pool';

// Pool state account data, e.g. from Connection.getAccountInfo or Connection.onAccountChange
let data = new Buffer('...');

let poolState = decodePoolState(data);
console.log(poolState);
```

See [`PoolState`](https://project-serum.github.io/serum-ts/pool/interfaces/_index_.poolstate.html)
for details on what the pool state contains.

### Get pool basket

Use [`getPoolBasket()`](https://project-serum.github.io/serum-ts/pool/modules/_index_.html#getpoolbasket)
to fetch the current pool basket (the quantity of each token needed to create N pool tokens
or the quantity of each token received for redeeming N pool tokens).

```js
import { Connection, PublicKey } from '@solana/web3.js';
import { loadPoolInfo, getPoolBasket } from '@project-serum/pool';
import BN from 'bn.js';

let connection = new Connection('...');
let poolAddress = new PublicKey('...'); // Address of the pool.

let poolInfo = await loadPoolInfo(connection, poolAddress);
let basket = await getPoolBasket(
  connection,
  poolInfo,
  { create: new BN(100) },
  // Arbitrary SOL address, can be anything as long as it has nonzero SOL
  // and is not a program-owned address.
  new PublicKey('...'),
);

console.log(basket);
```

### Create pool tokens

Send a transaction to create pool tokens:

```js
import { Account, Connection, PublicKey } from '@solana/web3.js';
import { loadPoolInfo, PoolTransactions } from '@project-serum/pool';
import BN from 'bn.js';

let connection = new Connection('...');
let poolAddress = new PublicKey('...'); // Address of the pool.
let payer = new Account('...'); // Account to pay for solana fees.

let poolInfo = await loadPoolInfo(connection, poolAddress);
let { transaction, signers } = PoolTransactions.execute(
  poolInfo,
  {
    // Number of tokens to create.
    create: new BN(100),
  },
  {
    // Spl-token account to send the created tokens.
    poolTokenAccount: new PublicKey('...'),
    // Spl-token accounts to pull funds from.
    assetAccounts: [new PublicKey('...'), new Public('...')],
    // Owner of poolTokenAccount and assetAccounts.
    owner: payer.publicKey,
  },
  // Expected creation cost.
  [new BN(10), new BN(10)],
);
await connection.sendTransaction(transaction, [payer, ...signers]);
```

See [`PoolTransactions.execute`](https://project-serum.github.io/serum-ts/pool/classes/_index_.pooltransactions.html#execute) for details.

### Redeem pool tokens

Send a transaction to redeem pool tokens:

```js
import { Account, Connection, PublicKey } from '@solana/web3.js';
import { loadPoolInfo, PoolTransactions } from '@project-serum/pool';
import BN from 'bn.js';

let connection = new Connection('...');
let poolAddress = new PublicKey('...'); // Address of the pool.
let payer = new Account('...'); // Account to pay for solana fees.

let poolInfo = await loadPoolInfo(connection, poolAddress);
let { transaction, signers } = PoolTransactions.execute(
  poolInfo,
  {
    // Number of tokens to redeem.
    redeem: new BN(100),
  },
  {
    // Spl-token account to pull the pool tokens to redeem from.
    poolTokenAccount: new PublicKey('...'),
    // Spl-token accounts to send the redemption proceeds.
    assetAccounts: [new PublicKey('...'), new Public('...')],
    // Owner of poolTokenAccount and assetAccounts.
    owner: payer.publicKey,
  },
  // Expected redemption proceeds.
  [new BN(10), new BN(10)],
);
await connection.sendTransaction(transaction, [payer, ...signers]);
```

See [`PoolTransactions.execute`](https://project-serum.github.io/serum-ts/pool/classes/_index_.pooltransactions.html#execute) for details.

## API Reference

[API Reference](https://project-serum.github.io/serum-ts/pool/modules/_index_.html)

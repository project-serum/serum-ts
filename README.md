[![npm (scoped)](https://img.shields.io/npm/v/@project-serum/serum)](https://www.npmjs.com/package/@project-serum/serum)
[![Build Status](https://travis-ci.com/project-serum/serum-js.svg?branch=master)](https://travis-ci.com/project-serum/serum-js)

# Serum JS Client Library

WIP

`yarn add @project-serum/serum`

```js
import { Account, Connection, PublicKey } from '@solana/web3.js';
import { Market } from '@project-serum/serum';

let connection = new Connection('https://testnet.solana.com');
let marketAddress = new PublicKey('...');
let market = await Market.load(connection, marketAddress);
let bids = await market.loadBids(connection);
let asks = await market.loadAsks(connection);
for (let [price, size] of bids.getL2(20)) {
  console.log(price, size);
}
for (let order of asks) {
  console.log(
    order.orderId,
    order.owner.toBase58(),
    order.price,
    order.size,
    order.side,
  );
}

let owner = new Account('...');
let payer = new PublicKey('...');
await market.placeOrder(connection, {
  owner,
  payer,
  side: 'buy', // 'buy' or 'sell'
  price: 123.45,
  size: 17.0,
  orderType: 'limit', // 'limit', 'ioc', 'postOnly'
});

for (let order of await market.loadBids(connection)) {
  if (order.owner.equals(owner.publicKey)) {
    await market.cancelOrder(connection, owner, order);
  }
}

for (let fill of await market.loadFills(connection)) {
  console.log(
    fill.orderId,
    fill.owner.toBase58(),
    fill.price,
    fill.size,
    fill.side,
  );
}
```

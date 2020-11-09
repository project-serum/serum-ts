import { struct, Layout } from 'buffer-layout';
import { Basket } from '@project-serum/pool';
import { bool, i64, publicKey, rustEnum, u64 } from '@project-serum/borsh';
import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';

export interface Generation {
  initialized: boolean;
  entity: PublicKey;
  generation: BN;
  lastActivePrices: PoolPrices;
}

export interface PoolPrices {
  basket: Basket;
  megaBasket: Basket;
}

export const POOL_PRICES_LAYOUT: Layout<PoolPrices> = struct([
  Basket.replicate('basket'),
  Basket.replicate('megaBasket'),
]);

const GENERATION_LAYOUT: Layout<Generation> = struct([
  bool('initialized'),
  publicKey('entity'),
  u64('generation'),
  POOL_PRICES_LAYOUT.replicate('lastActivePrices'),
]);

export function decode(data: Buffer): Generation {
  return GENERATION_LAYOUT.decode(data);
}

export function encode(g: Generation): Buffer {
  const buffer = Buffer.alloc(1000); // TODO: use a tighter buffer.
  const len = GENERATION_LAYOUT.encode(g, buffer);
  return buffer.slice(0, len);
}

export const SIZE: number = encode({
  initialized: false,
  entity: new PublicKey(Buffer.alloc(32)),
  generation: new BN(0),
  lastActivePrices: defaultPoolPrices(),
}).length;

export function defaultPoolPrices(): PoolPrices {
  return {
    basket: {
      quantities: [new BN(0)],
    },
    megaBasket: {
      quantities: [new BN(0), new BN(0)],
    },
  };
}
